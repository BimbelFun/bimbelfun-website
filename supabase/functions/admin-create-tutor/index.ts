// Supabase Edge Function: create a Tentor account from the authenticated Admin portal.
// Required function secrets: SUPABASE_URL (provided by Supabase), BIMBELFUN_PUBLISHABLE_KEY, BIMBELFUN_SECRET_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return respond({ error: "Method tidak diizinkan." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("BIMBELFUN_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("BIMBELFUN_SECRET_KEY");
  if (!url || !anonKey || !serviceKey) return respond({ error: "Konfigurasi fungsi belum lengkap." }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Silakan login sebagai Admin." }, 401);

  const adminClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await adminClient.auth.getUser();
  if (authError || !authData.user) return respond({ error: "Sesi login tidak valid." }, 401);

  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: adminProfile, error: profileCheckError } = await service
    .from("profiles").select("role").eq("user_id", authData.user.id).maybeSingle();
  if (profileCheckError || String(adminProfile?.role || "").toLowerCase() !== "admin") {
    return respond({ error: "Hanya Admin yang boleh membuat akun Tentor." }, 403);
  }

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return respond({ error: "Data formulir tidak valid." }, 400); }
  const fullName = String(input.full_name || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  const phone = String(input.phone || "").trim();
  const expertise = String(input.expertise || "").trim();

  if (!fullName || !email || !password) return respond({ error: "Nama, email, dan password wajib diisi." }, 400);
  if (password.length < 8) return respond({ error: "Password awal minimal 8 karakter." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond({ error: "Format email tidak valid." }, 400);

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName, role: "tentor" },
  });
  if (createError || !created.user) return respond({ error: createError?.message || "Gagal membuat akun Auth." }, 400);

  const uid = created.user.id;
  const { error: insertProfileError } = await service.from("profiles").insert({
    user_id: uid, full_name: fullName, role: "tentor", phone: phone || null,
  });
  if (insertProfileError) {
    await service.auth.admin.deleteUser(uid);
    return respond({ error: "Akun Auth dibuat tetapi profil gagal disimpan: " + insertProfileError.message }, 400);
  }

  const tutorCode = "TTR-" + Date.now().toString().slice(-8);
  const { error: insertTutorError } = await service.from("tutors").insert({
    profile_user_id: uid, tutor_code: tutorCode, full_name: fullName,
    email, phone: phone || null, expertise: expertise || null, status: "active",
  });
  if (insertTutorError) {
    await service.from("profiles").delete().eq("user_id", uid);
    await service.auth.admin.deleteUser(uid);
    return respond({ error: "Profil berhasil dibuat tetapi data Tentor gagal disimpan: " + insertTutorError.message }, 400);
  }

  return respond({ success: true, message: "Akun Tentor berhasil dibuat.", tutor_code: tutorCode });
});
