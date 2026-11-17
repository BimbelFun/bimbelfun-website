// Browser-safe Supabase publishable key only. Never place service_role keys here.
const SUPABASE_URL="https://eoghhxnxugvsxxjotenu.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_XNEladKm2lliq4h40XMcTQ_qsarZcTe";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY),$=id=>document.getElementById(id);
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const timeText=v=>v?new Date(v).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):"-";
function showMessage(t,error=false){$("message").textContent=t;$("message").classList.remove("portal-hidden","portal-error");if(error)$("message").classList.add("portal-error")}
function loginMessage(t){$("loginMessage").textContent=t}
let tutorRecord=null;
async function loadSession(){
 const {data:{session}}=await db.auth.getSession();if(!session)return;
 const {data:p,error}=await db.from("profiles").select("full_name,role").eq("user_id",session.user.id).single();
 if(error||!p){await db.auth.signOut();loginMessage("Profil belum terdaftar di tabel profiles. Minta admin memeriksanya.");return}
 $("loginPanel").classList.add("portal-hidden");$("appPanel").classList.remove("portal-hidden");$("welcome").textContent="Halo, "+(p.full_name||session.user.email);$("roleLabel").textContent="Akses: "+p.role;
 if(p.role==="admin"){$("adminPanel").classList.remove("portal-hidden");await loadAdmin()}
 else if(p.role==="tentor"){$("tutorPanel").classList.remove("portal-hidden");$("todayDate").textContent="Tanggal: "+new Date().toLocaleDateString("id-ID");await loadTutor(session.user.id)}
 else showMessage("Peran akun belum diatur sebagai admin atau tentor.",true)
}
async function loadTutor(uid){
 const {data:t,error}=await db.from("tutors").select("id,full_name").eq("profile_user_id",uid).single();
 if(error||!t){showMessage("Akun belum terhubung dengan data tutors melalui profile_user_id.",true);return}
 tutorRecord=t;const {data:r,error:e}=await db.from("attendance_records").select("*").eq("tutor_id",t.id).eq("attendance_date",today()).maybeSingle();
 if(e){showMessage(e.message,true);return}
 $("attendanceState").textContent=r?"Masuk: "+timeText(r.check_in)+" | Pulang: "+timeText(r.check_out)+" | Status: "+r.status:"Belum presensi hari ini.";
 $("checkInBtn").disabled=!!r?.check_in;$("checkOutBtn").disabled=!r?.check_in||!!r?.check_out;
}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();loginMessage("Memproses...");const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){loginMessage(error.message);return}loginMessage("");await loadSession()});
$("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();location.reload()});
$("checkInBtn").addEventListener("click",async()=>{if(!tutorRecord)return;const {error}=await db.from("attendance_records").insert({tutor_id:tutorRecord.id,attendance_date:today(),check_in:new Date().toISOString(),status:"hadir"});if(error){showMessage(error.message,true);return}showMessage("Presensi masuk tersimpan.");await loadTutor((await db.auth.getUser()).data.user.id)});
$("checkOutBtn").addEventListener("click",async()=>{if(!tutorRecord)return;const {error}=await db.from("attendance_records").update({check_out:new Date().toISOString()}).eq("tutor_id",tutorRecord.id).eq("attendance_date",today());if(error){showMessage(error.message,true);return}showMessage("Presensi pulang tersimpan.");await loadTutor((await db.auth.getUser()).data.user.id)});
async function loadAdmin(){const {data,error}=await db.from("attendance_records").select("attendance_date,check_in,check_out,status,tutors(full_name)").order("attendance_date",{ascending:false}).limit(100);if(error){$("attendanceRows").innerHTML="<tr><td colspan='5'>"+error.message+"</td></tr>";return}$("attendanceRows").innerHTML=data.length?data.map(r=>"<tr><td>"+r.attendance_date+"</td><td>"+(r.tutors?.full_name||"-")+"</td><td>"+timeText(r.check_in)+"</td><td>"+timeText(r.check_out)+"</td><td>"+r.status+"</td></tr>").join(""):"<tr><td colspan='5'>Belum ada data presensi.</td></tr>"}
$("refreshBtn").addEventListener("click",loadAdmin);
db.auth.onAuthStateChange((_event,session)=>{if(!session){$("appPanel").classList.add("portal-hidden");$("loginPanel").classList.remove("portal-hidden")}});
loadSession();