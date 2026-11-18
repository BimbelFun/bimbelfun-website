
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method tidak diizinkan." }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("BIMBELFUN_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("BIMBELFUN_SECRET_KEY");

  if (!url || !anonKey || !serviceKey) {
    console.error("DIAGNOSTIK: Konfigurasi fungsi belum lengkap.");
    return respond({ error: "Konfigurasi fungsi belum lengkap." }, 500);
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    console.error("DIAGNOSTIK: Token login tidak ditemukan.");
    return respond({ error: "Silakan login sebagai Admin." }, 401);
  }

  const adminClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } =
    await adminClient.auth.getUser();

  if (authError || !authData.user) {
    console.error("DIAGNOSTIK AUTH:", authError?.message);
    return respond({ error: "Sesi login tidak valid." }, 401);
  }

  const userId = authData.user.id;

  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: adminProfile, error: profileCheckError } =
    await service
      .from("profiles")
      .select("user_id, role")
      .eq("user_id", userId)
      .maybeSingle();

  if (profileCheckError) {
    console.error("DIAGNOSTIK PROFILE ERROR:", {
      code: profileCheckError.code,
      message: profileCheckError.message,
      details: profileCheckError.details,
      hint: profileCheckError.hint,
    });

    return respond({
      error: "Gagal membaca profil Admin.",
      diagnostic: profileCheckError.message,
    }, 403);
  }

  if (!adminProfile) {
    console.error("DIAGNOSTIK: Profil tidak ditemukan.", {
      userId,
    });

    return respond({
      error: "Profil Admin tidak ditemukan.",
      diagnostic: "Tidak ada baris profiles dengan user_id akun yang sedang login.",
    }, 403);
  }

  const role = String(adminProfile.role || "").trim().toLowerCase();

  if (role !== "admin") {
    console.error("DIAGNOSTIK: Role tidak cocok.", {
      userId,
      role,
    });

    return respond({
      error: "Hak akses Admin tidak cocok.",
      diagnostic: "Role yang terbaca: " + (role || "kosong"),
    }, 403);
  }

  console.log("DIAGNOSTIK: Pemeriksaan Admin berhasil.");

  let input: Record<string, unknown>;

  try {
    input = await req.json();
  } catch {
    return respond({ error: "Data formulir tidak valid." }, 400);
  }

  const fullName = String(input.full_name || "").trim();
  const username = String(input.username || "").trim().toLowerCase();
  const email = String(input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  const phone = String(input.phone || "").trim();
  const expertise = String(input.expertise || "").trim();

  if (!fullName || !username || !email || !password) {
    return respond({
      error: "Nama, username, email kontak, dan password wajib diisi.",
    }, 400);
  }

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return respond({ error: "Format username tidak valid." }, 400);
  }

  const authEmail = username + "@tutor.bimbelfun.invalid";
  const { data: usernameExists } = await service.from("profiles").select("user_id").ilike("username", username).maybeSingle();
  if (usernameExists) return respond({ error: "Username sudah digunakan." }, 409);

  if (password.length < 8) {
    return respond({
      error: "Password awal minimal 8 karakter.",
    }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond({ error: "Format email tidak valid." }, 400);
  }

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "tentor",
      },
    });

  if (createError || !created.user) {
    console.error("DIAGNOSTIK CREATE USER:", createError?.message);

    return respond({
      error: createError?.message || "Gagal membuat akun Auth.",
    }, 400);
  }

  const uid = created.user.id;

  const { error: insertProfileError } =
    await service.from("profiles").insert({
      user_id: uid,
      full_name: fullName,
      username,
      role: "tentor",
      phone: phone || null,
    });

  if (insertProfileError) {
    await service.auth.admin.deleteUser(uid);

    console.error("DIAGNOSTIK INSERT PROFILE:", insertProfileError.message);

    return respond({
      error: "Profil gagal disimpan: " + insertProfileError.message,
    }, 400);
  }

  const tutorCode = "TTR-" + Date.now().toString().slice(-8);

  const { error: insertTutorError } =
    await service.from("tutors").insert({
      profile_user_id: uid,
      tutor_code: tutorCode,
    username,
      full_name: fullName,
      email,
      phone: phone || null,
      expertise: expertise || null,
      status: "active",
    });

  if (insertTutorError) {
    await service.from("profiles").delete().eq("user_id", uid);
    await service.auth.admin.deleteUser(uid);

    console.error("DIAGNOSTIK INSERT TUTOR:", insertTutorError.message);

    return respond({
      error: "Data Tentor gagal disimpan: " + insertTutorError.message,
    }, 400);
  }

  console.log("DIAGNOSTIK: Akun Tentor berhasil dibuat.", tutorCode);

  return respond({
    success: true,
    message: "Akun Tentor berhasil dibuat.",
    tutor_code: tutorCode,
  });
});
