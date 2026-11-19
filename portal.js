// Browser-safe Supabase publishable key only. Never place service_role keys here.
const SUPABASE_URL="https://eoghhxnxugvsxxjotenu.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_XNEladKm2lliq4h40XMcTQ_qsarZcTe";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY),$=id=>document.getElementById(id);
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const timeText=v=>v?new Date(v).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):"-";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function showMessage(t,error=false){$("message").textContent=t;$("message").classList.remove("portal-hidden","portal-error");if(error)$("message").classList.add("portal-error")}
function loginMessage(t){$("loginMessage").textContent=t}
let tutorRecord=null,currentUser=null,currentView="dashboard",editId=null,selectedScheduleId=null,tutorSchedules=[],realtimeChannel=null;
const requestedLoginRole=new URLSearchParams(window.location.search).get("role");
let selectedLoginRole=["admin","tentor"].includes(requestedLoginRole)?requestedLoginRole:null;
const configs={
 tutors:{title:"Data Tentor",table:"tutors",fields:[["tutor_code","Kode tentor"],["full_name","Nama lengkap","required"],["phone","Nomor HP"],["email","Email"],["expertise","Keahlian"],["status","Status"]]},
 students:{title:"Database Murid",table:"students",fields:[["full_name","Nama lengkap","required"],["gender","Jenis kelamin"],["education_level","Jenjang pendidikan","education"],["school_name","Sekolah"],["guardian_name","Nama orang tua/wali"],["guardian_phone","Telepon wali"],["address","Alamat"],["status","Status"]]},
 programs:{title:"Program Belajar",table:"programs",fields:[["program_name","Nama program","required"],["education_level","Jenjang","education"],["description","Deskripsi"],["price","Biaya","number"],["status","Status"]]},
 classes:{title:"Kelas & Jadwal",table:"classes",fields:[["student_id","Murid","select:students:id:full_name"],["subject","Mata Pelajaran","class-subject"],["class_grade","Kelas","class-grade"],["class_day","Hari","class-day"],["status","Status"]]},
 tutor_students:{title:"Penugasan Tutor per Murid",table:"tutor_students",fields:[["student_id","Murid","select:students:id:full_name"],["tutor_id","Tentor","select:tutors:id:full_name"]]},
 class_students:{title:"Pendaftaran Murid ke Kelas",table:"class_students",fields:[["class_id","Kelas","select:classes:id:class_name"],["student_id","Murid","select:students:id:full_name"],["joined_at","Tanggal bergabung","date"],["status","Status"]]},
 schedules:{title:"Jadwal Kelas",table:"schedules",fields:[["class_id","Kelas","select:classes:id:class_name"],["subject","Mata pelajaran","subject"],["day_of_week","Hari (1 Senin – 7 Minggu)","number"],["start_time","Jam mulai","time"],["end_time","Jam selesai","time"],["duration_minutes","Durasi per pertemuan","duration"],["location","Lokasi"]] },
 student_packages:{title:"Paket Pertemuan Murid",table:"student_packages",fields:[["student_id","Murid","select:students:id:full_name"],["class_level","Kelas","class-grade"],["subject","Mata pelajaran","subject"],["package_meetings","Jumlah pertemuan","package-count"],["price","Harga paket (Rp)","number"],["purchased_at","Tanggal Pembayaran","date"],["expires_at","Tanggal berakhir","date"],["status","Status paket","package-status"],["notes","Catatan"]]},
 invoices:{title:"Tagihan Orang Tua",table:"invoices",fields:[["student_id","Murid","select:students:id:full_name"],["package_id","Paket","select:student_packages:id:subject"],["invoice_number","Nomor tagihan","required"],["amount","Jumlah tagihan (Rp)","number"],["due_date","Jatuh tempo","date"],["status","Status","invoice-status"],["notes","Catatan"]]},
 payments:{title:"Pembayaran",table:"payments",fields:[["student_id","Murid / Tagihan","select:students:id:full_name"],["amount","Jumlah pembayaran (Rp)","number"],["payment_date","Tanggal pembayaran","date"],["payment_method","Metode pembayaran"],["reference","Referensi"],["notes","Catatan"]]},
 expenses:{title:"Pengeluaran",table:"expenses",fields:[["category","Kategori","required"],["description","Keterangan","required"],["amount","Jumlah (Rp)","number"],["expense_date","Tanggal","date"],["paid_to","Dibayarkan kepada"],["notes","Catatan"]]}
};
async function loadSession(expectedRole=null){
 const {data:{session}}=await db.auth.getSession();if(!session)return;
 const {data:p,error}=await db.from("profiles").select("full_name,role").eq("user_id",session.user.id).single();
 if(error||!p){await db.auth.signOut();$("loginPanel").classList.remove("portal-hidden");loginMessage("Profil belum terdaftar di tabel profiles. Minta admin memeriksanya.");return}
 const actualRole=String(p.role||"").toLowerCase();
 if(expectedRole&&actualRole!==expectedRole){
  await db.auth.signOut();
  $("appPanel").classList.add("portal-hidden");
  $("loginPanel").classList.remove("portal-hidden");
  loginMessage(expectedRole==="admin"?"Akun ini bukan akun Admin. Silakan pilih Login Tentor jika sesuai.":"Akun ini bukan akun Tentor. Silakan pilih Login Admin jika sesuai.");
  return;
 }
 currentUser=session.user;
 $("loginPanel").classList.add("portal-hidden");
 $("appPanel").classList.remove("portal-hidden");
 $("welcome").textContent="Halo, "+(p.full_name||session.user.email);
 $("roleLabel").textContent="Akses: "+actualRole;
 if(actualRole==="admin"){$("adminPanel").classList.remove("portal-hidden");$("tutorPanel").classList.add("portal-hidden");await renderAdmin();startRealtime("admin")}
 else if(actualRole==="tentor"){$("tutorPanel").classList.remove("portal-hidden");$("adminPanel").classList.add("portal-hidden");$("todayDate").textContent="Tanggal: "+new Date().toLocaleDateString("id-ID");await loadTutor(session.user.id);initTutorResources();startRealtime("tutor")}
 else {await db.auth.signOut();$("appPanel").classList.add("portal-hidden");$("loginPanel").classList.remove("portal-hidden");loginMessage("Peran akun belum diatur sebagai Admin atau Tentor. Hubungi Admin Bimbel Fun.")}
}
async function loadTutor(uid){
 const {data:t,error}=await db.from("tutors").select("id,full_name").eq("profile_user_id",uid).single();
 if(error||!t){showMessage("Akun belum terhubung dengan data tutors melalui profile_user_id.",true);return}
 tutorRecord=t;
 const {data:assignments,error:assignmentError}=await db.from("class_tutors").select("classes(id,class_name,schedules(id,day_of_week,start_time,end_time,location,duration_minutes,subject))").eq("tutor_id",t.id);
 if(assignmentError){showMessage("Gagal memuat jadwal: "+assignmentError.message,true);return}
 const dayNames=["","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
 tutorSchedules=(assignments||[]).flatMap(a=>(a.classes?.schedules||[]).map(s=>({...s,class_name:a.classes.class_name,class_id:a.classes.id})));
 const selector=$("tutorSchedule");
 selector.innerHTML='<option value="">Pilih jadwal/pertemuan</option>'+tutorSchedules.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.class_name)+' — '+esc(dayNames[s.day_of_week]||"")+' '+esc(String(s.start_time||"").slice(0,5))+' ('+esc(s.duration_minutes)+' menit)</option>').join("");
 selectedScheduleId=null;selector.onchange=async()=>{selectedScheduleId=selector.value||null;await loadTutorAttendanceOptions();await refreshTutorAttendance()};
 await loadTutorAttendanceOptions();
 $("checkInBtn").disabled=true;$("checkOutBtn").disabled=true;
 await refreshTutorAttendance();
 await loadTutorHistory();
}
async function loadTutorAttendanceOptions(){
 const s=tutorSchedules.find(x=>x.id===selectedScheduleId);
 const studentSelect=$("tutorStudent"),packageSelect=$("tutorPackage"),subjectSelect=$("tutorSubject"),addressInput=$("teachingAddress");
 if(!s){studentSelect.innerHTML="<option value=\"\">Pilih jadwal dahulu</option>";packageSelect.innerHTML="<option value=\"\">Pilih murid dahulu</option>";return}
 subjectSelect.value=s.subject||"";addressInput.value=s.location||"";
 const {data:links,error}=await db.from("class_students").select("students(id,full_name)").eq("class_id",s.class_id);const {data:directLinks}=await db.from("tutor_students").select("students(id,full_name)").eq("tutor_id",tutorRecord.id);
 if(error){showMessage("Gagal memuat murid kelas: "+error.message,true);return}
 const studentMap=new Map([...(links||[]),...(directLinks||[])].map(x=>[x.students?.id,x.students]).filter(x=>x[0]));const students=[...studentMap.values()].sort((a,b)=>a.full_name.localeCompare(b.full_name,"id"));
 studentSelect.innerHTML="<option value=\"\">Pilih murid</option>"+students.map(x=>"<option value=\""+esc(x.id)+"\">"+esc(x.full_name)+"</option>").join("");
 studentSelect.onchange=async()=>{
  const {data:pkgs}=await db.from("student_packages").select("id,subject,package_meetings,used_meetings,status").eq("student_id",studentSelect.value).eq("status","active");
  packageSelect.innerHTML="<option value=\"\">Pilih paket</option>"+(pkgs||[]).filter(p=>p.used_meetings<p.package_meetings).map(p=>"<option value=\""+esc(p.id)+"\">"+esc(p.subject)+" — sisa "+(p.package_meetings-p.used_meetings)+" dari "+p.package_meetings+"</option>").join("");
 };
 packageSelect.innerHTML="<option value=\"\">Pilih murid dahulu</option>";
}
async function loadTutorHistory(){
 const {data:history,error}=await db.from("attendance_records").select("attendance_date,check_in,check_out,status,subject,students(full_name),schedule_id,schedules(duration_minutes,classes(class_name))").eq("tutor_id",tutorRecord.id).order("attendance_date",{ascending:false}).limit(60);
 const body=$("tutorAttendanceHistory");if(!body)return;
 body.innerHTML=error?'<tr><td colspan="8">'+esc(error.message)+'</td></tr>':history?.length?history.map(x=>'<tr><td>'+esc(x.attendance_date)+'</td><td>'+esc(x.schedules?.classes?.class_name||"-")+'</td><td>'+esc(x.students?.full_name||"-")+'</td><td>'+esc(x.subject||"-")+'</td><td>'+timeText(x.check_in)+'</td><td>'+timeText(x.check_out)+'</td><td>'+esc(x.schedules?.duration_minutes||"-")+' menit</td><td>'+esc(x.status)+'</td></tr>').join(""):'<tr><td colspan="8">Belum ada riwayat presensi.</td></tr>';
}
async function refreshTutorAttendance(){
 const state=$("attendanceState");
 if(!selectedScheduleId){state.textContent=tutorSchedules.length?"Pilih jadwal untuk melakukan presensi.":"Belum ada jadwal kelas yang ditugaskan kepada Anda."; $("checkInBtn").disabled=true;$("checkOutBtn").disabled=true;return}
 const {data:r,error}=await db.from("attendance_records").select("*").eq("tutor_id",tutorRecord.id).eq("schedule_id",selectedScheduleId).eq("attendance_date",today()).maybeSingle();
 if(error){showMessage(error.message,true);return}
 const s=tutorSchedules.find(x=>x.id===selectedScheduleId);
 state.textContent="Durasi jadwal: "+s.duration_minutes+" menit. "+(r?"Masuk: "+timeText(r.check_in)+" | Pulang: "+timeText(r.check_out):"Belum presensi pertemuan ini.");
 $("checkInBtn").disabled=!!r?.check_in;$("checkOutBtn").disabled=!r?.check_in||!!r?.check_out;
}
function startRealtime(role){
 if(realtimeChannel)db.removeChannel(realtimeChannel);
 const tables=["tutors","students","programs","classes","class_tutors","tutor_students","class_students","schedules","attendance_records","student_packages","invoices","payments","expenses"];
 realtimeChannel=db.channel("bimbelfun-live-updates");
 for(const table of tables)realtimeChannel=realtimeChannel.on("postgres_changes",{event:"*",schema:"public",table},async()=>{
  if(role==="admin"){await renderAdmin();return}
  if(table==="class_tutors"||table==="tutor_students"||table==="schedules"||table==="tutors"){await loadTutor(currentUser.id);return}
  if(table==="attendance_records"){await refreshTutorAttendance();await loadTutorHistory()}
 });
 realtimeChannel.subscribe();
}
async function countRows(table){const {count,error}=await db.from(table).select("*",{count:"exact",head:true});return error?"-":count}
async function renderAdmin(){
 const root=$("adminContent");
 if(currentView==="dashboard"){
  root.innerHTML='<h2>Ringkasan Data</h2><div class="admin-stats" id="stats">Memuat...</div><p class="portal-muted">Pilih menu di atas untuk mengelola data. Pastikan data awal sudah dimasukkan.</p>';
  const names=[["Tentor","tutors"],["Murid","students"],["Program","programs"],["Kelas","classes"],["Jadwal","schedules"],["Tutor per Murid","tutor_students"],["Presensi","attendance_records"],["Paket Pertemuan","student_packages"],["Tagihan","invoices"],["Pembayaran","payments"],["Pengeluaran","expenses"]];
  const counts=await Promise.all(names.map(x=>countRows(x[1])));
  $("stats").innerHTML=names.map((x,i)=>'<div class="stat-card"><span>'+x[0]+'</span><strong>'+counts[i]+'</strong></div>').join("");
  const [inv,pay,exp]=await Promise.all([db.from("invoices").select("amount"),db.from("payments").select("amount"),db.from("expenses").select("amount")]);
  if(!inv.error&&!pay.error&&!exp.error){
   const totalBilled=(inv.data||[]).reduce((a,x)=>a+Number(x.amount||0),0);
   const income=(pay.data||[]).reduce((a,x)=>a+Number(x.amount||0),0);
   const costs=(exp.data||[]).reduce((a,x)=>a+Number(x.amount||0),0);
   $("stats").insertAdjacentHTML("afterend",'<div class="admin-stats"><div class="stat-card"><span>Total Tagihan</span><strong>Rp '+totalBilled.toLocaleString("id-ID")+'</strong></div><div class="stat-card"><span>Pembayaran Masuk</span><strong>Rp '+income.toLocaleString("id-ID")+'</strong></div><div class="stat-card"><span>Pengeluaran</span><strong>Rp '+costs.toLocaleString("id-ID")+'</strong></div><div class="stat-card"><span>Saldo Kas</span><strong>Rp '+(income-costs).toLocaleString("id-ID")+'</strong></div></div>');
  }
  return;
 }
 if(currentView==="attendance"){await loadAttendanceAdmin();return}
 if(currentView==="reports"){
  root.innerHTML='<h2>Laporan Bimbel Fun</h2><p class="portal-muted">Ringkasan data operasional dan keuangan.</p><div class="admin-stats" id="reportStats">Memuat laporan...</div><div class="portal-panel report-note"><h3>Rincian laporan</h3><p>Gunakan menu Absensi untuk melihat riwayat kehadiran tutor, dan menu Pembayaran untuk memeriksa tagihan serta pembayaran.</p></div>';
  const names=[["Jumlah Siswa","students"],["Jumlah Tutor","tutors"],["Jumlah Kelas","classes"],["Total Presensi","attendance_records"]];
  const counts=await Promise.all(names.map(x=>countRows(x[1])));
  const [inv,pay,exp]=await Promise.all([db.from("invoices").select("amount"),db.from("payments").select("amount"),db.from("expenses").select("amount")]);
  const billed=(inv.data||[]).reduce((a,x)=>a+Number(x.amount||0),0),income=(pay.data||[]).reduce((a,x)=>a+Number(x.amount||0),0),cost=(exp.data||[]).reduce((a,x)=>a+Number(x.amount||0),0);
  $("reportStats").innerHTML=names.map((x,i)=>'<div class="stat-card"><span>'+x[0]+'</span><strong>'+counts[i]+'</strong></div>').join("")+'<div class="stat-card"><span>Total Tagihan</span><strong>Rp '+billed.toLocaleString("id-ID")+'</strong></div><div class="stat-card"><span>Pembayaran Masuk</span><strong>Rp '+income.toLocaleString("id-ID")+'</strong></div><div class="stat-card"><span>Pengeluaran</span><strong>Rp '+cost.toLocaleString("id-ID")+'</strong></div><div class="stat-card"><span>Saldo Kas</span><strong>Rp '+(income-cost).toLocaleString("id-ID")+'</strong></div>';
  return;
 }
 if(currentView==="invoices"){await loadInvoicesAdmin();return}
 const cfg=configs[currentView];if(!cfg)return;
 root.innerHTML='<div class="portal-head"><div><h2>'+cfg.title+'</h2><p class="portal-muted">Tambah, ubah, dan hapus data.</p></div><div class="portal-actions">'+(currentView==="tutors"?'<button id="createTutorAccount" class="portal-btn">+ Buat Akun Login Tentor</button>':'')+'<button id="addRecord" class="portal-btn">+ Tambah Data</button></div></div><div id="createTutorAccountWrap"></div><div id="recordFormWrap"></div><div style="overflow:auto"><table class="portal-table"><thead id="recordHead"></thead><tbody id="recordRows"><tr><td>Memuat...</td></tr></tbody></table></div>';
 $("addRecord").onclick=()=>openRecordForm(cfg);
 if(currentView==="tutors")$("createTutorAccount").onclick=()=>openTutorAccountForm();
 await loadRecords(cfg);
}
async function openTutorAccountForm(){
 const wrap=$("createTutorAccountWrap");
 wrap.innerHTML='<form id="createTutorAccountForm" class="admin-form"><h3>Buat Akun Login Tentor</h3><p class="portal-muted">Buat username dan password khusus. Email hanya untuk data kontak.</p><label>Nama lengkap<input name="full_name" required autocomplete="name"></label><label>Username<input name="username" type="text" required autocomplete="off" placeholder="contoh: olla.bimbelfun" pattern="[A-Za-z0-9._-]{3,30}" title="3–30 karakter: huruf, angka, titik, garis bawah, atau tanda hubung"></label><label>Email kontak<input name="email" type="email" required autocomplete="email"></label><label>Password awal (minimal 8 karakter)<input name="password" type="password" minlength="8" required autocomplete="new-password"></label><label>Nomor HP<input name="phone" type="tel"></label><label>Keahlian<input name="expertise" type="text"></label><div class="portal-actions"><button class="portal-btn" type="submit">Buat Akun Tentor</button><button class="small-btn" type="button" id="cancelTutorAccount">Batal</button></div><p id="createTutorAccountMessage" class="portal-muted" role="status"></p></form>';
 $("cancelTutorAccount").onclick=()=>{wrap.innerHTML=""};
 $("createTutorAccountForm").onsubmit=async e=>{
  e.preventDefault();
  const form=new FormData(e.currentTarget);
  const payload=Object.fromEntries(form.entries());
  const submit=e.currentTarget.querySelector('button[type="submit"]');
  const message=$("createTutorAccountMessage");
  submit.disabled=true;message.textContent="Membuat akun Tentor...";
  const {data,error}=await db.functions.invoke("admin-create-tutor",{body:payload});
  submit.disabled=false;
  if(error){
   let detail=error.message||"Terjadi kesalahan.";
   try{
    const response=error.context;
    if(response&&typeof response.json==="function"){
     const body=await response.clone().json();
     if(body?.error)detail=body.error+(body?.diagnostic?" — Detail: "+body.diagnostic:"");
     else if(body?.message)detail=body.message;
    }
   }catch{}
   message.textContent="Gagal membuat akun: "+detail;
   return;
  }
  if(data?.error){message.textContent="Gagal membuat akun: "+data.error;return}
  message.textContent="Berhasil! Kode Tentor: "+(data.tutor_code||"-")+". Login Tentor: "+payload.username+" dan password awal.";
  e.currentTarget.reset();
  await loadRecords(configs.tutors);
 };
}
async function loadRecords(cfg){
 if(cfg.table==="payments"){
  const {data,error}=await db.from("payments").select("id,amount,payment_date,payment_method,reference,invoices(invoice_number,students(full_name))").order("created_at",{ascending:false}).limit(250);
  const head=$("recordHead"),body=$("recordRows");if(error){body.innerHTML='<tr><td>'+esc(error.message)+'</td></tr>';return}
  head.innerHTML="<tr><th>Murid</th><th>No. Invoice</th><th>Jumlah</th><th>Tanggal</th><th>Metode</th><th>Referensi</th></tr>";
  body.innerHTML=(data||[]).length?data.map(x=>"<tr><td>"+esc(x.invoices?.students?.full_name||"-")+"</td><td>"+esc(x.invoices?.invoice_number||"-")+"</td><td>Rp "+Number(x.amount||0).toLocaleString("id-ID")+"</td><td>"+esc(x.payment_date||"-")+"</td><td>"+esc(x.payment_method||"-")+"</td><td>"+esc(x.reference||"-")+"</td></tr>").join(""):'<tr><td colspan="6">Belum ada pembayaran.</td></tr>';return;
 }
 if(cfg.table==="classes"){
  const {data,error}=await db.from("classes").select("id,class_name,student_id,subject,class_grade,class_day,education_level,learning_mode,status,students(full_name),schedules(day_of_week,start_time,end_time,location,subject),class_tutors(tutors(full_name))").order("class_name");
  const head=$("recordHead"),body=$("recordRows");if(error){body.innerHTML='<tr><td>'+esc(error.message)+'</td></tr>';return}
  head.innerHTML="<tr><th>Murid</th><th>Tentor</th><th>Hari</th><th>Mata Pelajaran</th><th>Kelas</th><th>Jam</th><th>Lokasi</th><th>Aksi</th></tr>";
  const days=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  body.innerHTML=(data||[]).length?data.map(r=>{const sch=r.schedules||[];const tutors=(r.class_tutors||[]).map(t=>t.tutors?.full_name).filter(Boolean).join(", ")||"-";return "<tr><td>"+esc(r.students?.full_name||r.class_name)+"</td><td>"+esc(tutors)+"</td><td>"+esc(r.class_day||sch.map(x=>days[Number(x.day_of_week)%7]||"-").join(", ")||"-")+"</td><td>"+esc(r.subject||sch.map(x=>x.subject).filter(Boolean).join(", ")||"-")+"</td><td>"+esc(r.class_grade||r.education_level||"-")+"</td><td>"+esc(sch.map(x=>String(x.start_time||"").slice(0,5)+"–"+String(x.end_time||"").slice(0,5)).join(", ")||"-")+"</td><td>"+esc(sch.map(x=>x.location).filter(Boolean).join(", ")||"-")+"</td><td><button class=\"small-btn\" data-edit=\""+r.id+"\">Ubah</button></td></tr>"}).join(""):'<tr><td colspan="7">Belum ada data jadwal.</td></tr>';
  body.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openRecordForm(cfg,data.find(r=>r.id===b.dataset.edit)));return;
 }
 if(cfg.table==="tutor_students"){const {data,error}=await db.from("tutor_students").select("id,student_id,tutor_id,students(full_name),tutors(full_name)").order("created_at",{ascending:false}).limit(250);const head=$("recordHead"),body=$("recordRows");if(error){body.innerHTML='<tr><td>'+esc(error.message)+'</td></tr>';return}head.innerHTML="<tr><th>Nama Murid</th><th>Nama Tentor</th><th>Aksi</th></tr>";body.innerHTML=(data||[]).map(x=>'<tr><td>'+esc(x.students?.full_name||"-")+'</td><td>'+esc(x.tutors?.full_name||"-")+'</td><td><button class="small-btn" data-delete="'+x.id+'">Hapus</button></td></tr>').join("")||'<tr><td colspan="3">Belum ada penugasan.</td></tr>';body.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(confirm("Hapus penugasan ini?")){const {error}=await db.from("tutor_students").delete().eq("id",b.dataset.delete);if(error)alert(error.message);else await loadRecords(cfg)}});return}
  const cols=cfg.fields.map(f=>f[0]).join(",")+(cfg.table==="student_packages"?",used_meetings,education_level":"");
 let query=db.from(cfg.table).select("id,"+cols);if(["tutors","students"].includes(cfg.table))query=query.order("full_name",{ascending:true});else if(!["class_tutors","class_students"].includes(cfg.table))query=query.order("created_at",{ascending:false});const {data,error}=await query.limit(250);
 const head=$("recordHead"),body=$("recordRows");
 if(error){body.innerHTML='<tr><td>'+esc(error.message)+'</td></tr>';return}
 head.innerHTML="<tr>"+cfg.fields.map(f=>"<th>"+esc(f[1])+"</th>").join("")+(cfg.table==="student_packages"?"<th>Terpakai / Sisa</th>":"")+"<th>Aksi</th></tr>";
 body.innerHTML=data.length?data.map(row=>"<tr>"+cfg.fields.map(f=>"<td>"+esc(f[0]==="class_level"?(row.class_level||row.education_level||"-"):row[f[0]])+"</td>").join("")+(cfg.table==="student_packages"?"<td>"+Number(row.used_meetings||0)+" / "+(Number(row.package_meetings)-Number(row.used_meetings||0))+"</td>":"")+'<td><button class="small-btn" data-edit="'+row.id+'">Ubah</button> <button class="small-btn danger" data-delete="'+row.id+'">Hapus</button></td></tr>').join(""):'<tr><td colspan="'+(cfg.fields.length+1)+'">Belum ada data.</td></tr>';
 body.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openRecordForm(cfg,data.find(r=>r.id===b.dataset.edit)));
 body.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Yakin ingin menghapus data ini?"))return;const {error}=await db.from(cfg.table).delete().eq("id",b.dataset.delete);if(error)alert(error.message);else await loadRecords(cfg)});
}
async function fieldControl(f,value){
 const [name,label,type]=f;let inputType=type==="date"?"date":type==="number"?"number":type==="time"?"time":"text";
 if(type==="class-subject")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih mata pelajaran</option>'+["All Mapel","Calistung","English Course","Mengaji"].map(v=>'<option value="'+esc(v)+'" '+(value===v?"selected":"")+' >'+esc(v)+'</option>').join("")+'</select></label>';
  if(type==="class-grade")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih kelas</option>'+["PAUD","TK A","TK B",...Array.from({length:6},(_,i)=>"SD Kelas "+(i+1)),...Array.from({length:3},(_,i)=>"SMP Kelas "+(i+7)),...Array.from({length:3},(_,i)=>"SMA Kelas "+(i+10)),"Kelompok"].map(v=>'<option value="'+esc(v)+'" '+(value===v?"selected":"")+' >'+esc(v)+'</option>').join("")+'</select></label>';
  if(type==="class-day")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih hari</option>'+["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"].map(v=>'<option value="'+v+'" '+(value===v?"selected":"")+' >'+v+'</option>').join("")+'</select></label>';
  if(type==="education")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih jenjang</option>'+["PAUD","TK A","TK B",...Array.from({length:6},(_,i)=>"SD KELAS "+(i+1)),...Array.from({length:3},(_,i)=>"SMP KELAS "+(i+7)),...Array.from({length:3},(_,i)=>"SMA KELAS "+(i+10))].map(v=>'<option value="'+esc(v)+'" '+(value===v?"selected":"")+' >'+esc(v)+'</option>').join("")+'</select></label>';
 if(type==="subject")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih mata pelajaran</option>'+["Calistung","All Mapel","English Course","Mengaji","Kreativitas"].map(v=>'<option value="'+esc(v)+'" '+(value===v?"selected":"")+' >'+esc(v)+'</option>').join("")+'</select></label>';
 if(type==="package-count")return '<label>'+esc(label)+'<select name="'+name+'" required>'+[4,8,12,16].map(v=>'<option value="'+v+'" '+(Number(value||4)===v?"selected":"")+' >'+v+' pertemuan</option>').join("")+'</select></label>';
 if(type==="package-status"||type==="invoice-status")return '<label>'+esc(label)+'<select name="'+name+'">'+(type==="package-status"?["active","pending","off"]:["unpaid","partial","paid"]).map(v=>'<option value="'+v+'" '+(value===v?"selected":"")+' >'+(v==="active"?"Active":v==="pending"?"Pending":v==="off"?"Off":v)+'</option>').join("")+'</select></label>';
 if(type==="duration")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="60" '+(String(value??60)==="60"?"selected":"")+' >60 menit</option><option value="90" '+(String(value)==="90"?"selected":"")+' >90 menit</option><option value="120" '+(String(value)==="120"?"selected":"")+' >120 menit</option></select></label>';
 if(type?.startsWith("select:")){const [,table,key,textCol]=type.split(":");const {data}=await db.from(table).select(key+","+textCol).order(textCol);return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih '+esc(label)+'</option>'+(data||[]).map(o=>'<option value="'+esc(o[key])+'" '+(o[key]===value?"selected":"")+'>'+esc(o[textCol])+'</option>').join("")+'</select></label>'}
 return '<label>'+esc(label)+'<input name="'+name+'" type="'+inputType+'" '+(f[2]==="required"?"required":"")+' value="'+esc(value??"")+'"></label>';
}
async function openRecordForm(cfg,row=null){
 editId=row?.id||null;const controls=await Promise.all(cfg.fields.map(f=>fieldControl(f,row?.[f[0]])));
 $("recordFormWrap").innerHTML='<form id="recordForm" class="admin-form"><h3>'+(row?"Ubah Data":"Tambah Data")+'</h3>'+controls.join("")+'<div class="portal-actions"><button class="portal-btn" type="submit">Simpan</button><button class="small-btn" type="button" id="cancelForm">Batal</button></div></form>';
 $("cancelForm").onclick=()=>{$("recordFormWrap").innerHTML=""};
 $("recordForm").onsubmit=async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target).entries());for(const k in values)if(values[k]==="")values[k]=null;for(const k in values)if(["price","amount","day_of_week","package_meetings"].includes(k)&&values[k]!==null)values[k]=Number(values[k]);if(cfg.table==="classes"){const selected=await db.from("students").select("full_name").eq("id",values.student_id).single();values.class_name=selected.data?.full_name||"Kelas murid";values.program_id=null;values.education_level=values.class_grade;values.learning_mode=values.class_day;}if(cfg.table==="student_packages"){values.education_level=values.class_level;values.class_id=null;}if(cfg.table==="student_packages"&&values.created_by===undefined)values.created_by=currentUser.id;if(cfg.table==="invoices"&&values.created_by===undefined)values.created_by=currentUser.id;if(cfg.table==="payments"&&values.recorded_by===undefined)values.recorded_by=currentUser.id;if(cfg.table==="expenses"&&values.created_by===undefined)values.created_by=currentUser.id;if(cfg.table==="payments"&&!editId){const studentId=values.student_id;delete values.student_id;const stamp=new Date();const invoiceNo="BF-"+stamp.getFullYear()+String(stamp.getMonth()+1).padStart(2,"0")+String(stamp.getDate()).padStart(2,"0")+"-"+String(stamp.getHours()).padStart(2,"0")+String(stamp.getMinutes()).padStart(2,"0")+String(stamp.getSeconds()).padStart(2,"0")+"-"+Math.random().toString(36).slice(2,6).toUpperCase();const invoicePayload={student_id:studentId,invoice_number:invoiceNo,amount:values.amount,due_date:values.payment_date,status:"paid",notes:values.notes||"Invoice otomatis dari pembayaran",created_by:currentUser.id};const created=await db.from("invoices").insert(invoicePayload).select("id").single();if(created.error){alert("Gagal membuat invoice: "+created.error.message);return}values.invoice_id=created.data.id;values.recorded_by=currentUser.id;const paid=await db.from("payments").insert(values);if(paid.error){await db.from("invoices").delete().eq("id",created.data.id);alert("Invoice dibuat tetapi pembayaran gagal disimpan: "+paid.error.message);return}alert("Pembayaran tersimpan. Invoice "+invoiceNo+" berhasil dibuat.");editId=null;$("recordFormWrap").innerHTML="";await loadInvoicesAdmin();return}const query=editId?db.from(cfg.table).update(values).eq("id",editId):db.from(cfg.table).insert(values);const {error}=await query;if(error){alert("Gagal menyimpan: "+error.message);return}editId=null;$("recordFormWrap").innerHTML="";if(cfg.table==="invoices"){await loadInvoicesAdmin()}else{await loadRecords(cfg)}};
}
async function loadInvoicesAdmin(){
 $("adminContent").innerHTML='<h2>Tagihan Orang Tua</h2><button id="addInvoice" class="portal-btn">+ Buat Tagihan</button><div id="recordFormWrap"></div><div style="overflow:auto;margin-top:16px"><table class="portal-table"><thead><tr><th>No. Tagihan</th><th>Murid</th><th>Jumlah</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="invoiceRows"><tr><td colspan="6">Memuat...</td></tr></tbody></table></div>';
 $("addInvoice").onclick=()=>openRecordForm(configs.invoices);
 const {data,error}=await db.from("invoices").select("id,invoice_number,amount,due_date,status,students(full_name,guardian_phone)").order("created_at",{ascending:false}).limit(250);
 $("invoiceRows").innerHTML=error?'<tr><td colspan="6">'+esc(error.message)+'</td></tr>':(data||[]).map(x=>'<tr><td>'+esc(x.invoice_number)+'</td><td>'+esc(x.students?.full_name||"-")+'</td><td>Rp '+Number(x.amount).toLocaleString("id-ID")+'</td><td>'+esc(x.due_date||"-")+'</td><td>'+esc(x.status)+'</td><td><button class="small-btn" data-print="'+x.id+'">Cetak / PDF</button> <button class="small-btn" data-png="'+x.id+'">Simpan PNG</button> <button class="small-btn" data-wa="'+x.id+'">WhatsApp</button></td></tr>').join("")||'<tr><td colspan="6">Belum ada tagihan.</td></tr>';
 $("invoiceRows").querySelectorAll("[data-print]").forEach(b=>b.onclick=()=>printInvoice(data.find(x=>x.id===b.dataset.print)));$("invoiceRows").querySelectorAll("[data-png]").forEach(b=>b.onclick=()=>saveInvoicePNG(data.find(x=>x.id===b.dataset.png)));
 $("invoiceRows").querySelectorAll("[data-wa]").forEach(b=>b.onclick=()=>shareInvoice(data.find(x=>x.id===b.dataset.wa)));
}
function invoiceMessage(x){
 return "Tagihan BIMBEL FUN\nNomor: "+x.invoice_number+"\nNama murid: "+(x.students?.full_name||"-")+"\nJumlah: Rp "+Number(x.amount).toLocaleString("id-ID")+"\nJatuh tempo: "+(x.due_date||"-")+"\nStatus: "+x.status+"\nTerima kasih.";
}
function printInvoice(x){
 const w=window.open("","_blank");if(!w){alert("Izinkan pop-up untuk mencetak tagihan.");return}
 w.document.write('<html><head><title>Tagihan '+esc(x.invoice_number)+'</title><style>body{font:16px Arial;padding:32px}h1{color:#168f8a}hr{margin:24px 0}</style></head><body><h1>BIMBEL FUN</h1><h2>Tagihan Pembayaran</h2><hr><p>Nomor: '+esc(x.invoice_number)+'</p><p>Murid: '+esc(x.students?.full_name||"-")+'</p><p>Jumlah: Rp '+Number(x.amount).toLocaleString("id-ID")+'</p><p>Jatuh tempo: '+esc(x.due_date||"-")+'</p><p>Status: '+esc(x.status)+'</p><p>Terima kasih.</p></body></html>');w.document.close();w.print();
}
function saveInvoicePNG(x){
 const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=1500;const ctx=canvas.getContext("2d");
 ctx.fillStyle="#fff";ctx.fillRect(0,0,1200,1500);ctx.fillStyle="#168f8a";ctx.fillRect(0,0,1200,220);
 ctx.fillStyle="#fff";ctx.font="bold 64px Arial";ctx.fillText("BIMBEL FUN",80,105);ctx.font="30px Arial";ctx.fillText("Make Learning Fun",82,158);
 ctx.fillStyle="#163b3a";ctx.font="bold 48px Arial";ctx.fillText("INVOICE PEMBAYARAN",80,330);
 const rows=[["Nomor Invoice",x.invoice_number],["Nama Murid",x.students?.full_name||"-"],["Jumlah Pembayaran","Rp "+Number(x.amount).toLocaleString("id-ID")],["Tanggal",x.due_date||"-"],["Status",String(x.status||"-").toUpperCase()]];
 let y=470;for(const [label,value] of rows){ctx.fillStyle="#6b7280";ctx.font="26px Arial";ctx.fillText(label,90,y);ctx.fillStyle="#183b39";ctx.font="bold 34px Arial";ctx.fillText(String(value),90,y+55);ctx.strokeStyle="#dce9e7";ctx.beginPath();ctx.moveTo(90,y+82);ctx.lineTo(1110,y+82);ctx.stroke();y+=170}
 ctx.fillStyle="#168f8a";ctx.font="bold 30px Arial";ctx.fillText("Terima kasih telah mempercayai BIMBEL FUN.",90,1320);
 const a=document.createElement("a");a.download="Invoice-"+String(x.invoice_number||"BimbelFun")+".png";a.href=canvas.toDataURL("image/png");a.click();
}
function shareInvoice(x){
 const phone=(x.students?.guardian_phone||"").replace(/\D/g,"");
 const url="https://wa.me/"+phone+"?text="+encodeURIComponent(invoiceMessage(x));
 if(!phone){alert("Nomor WhatsApp orang tua belum diisi pada data murid.");return}
 window.open(url,"_blank");
}
async function loadAttendanceAdmin(){
 $("adminContent").innerHTML='<h2>Rekap Presensi Tentor</h2><button id="refreshAttendance" class="portal-btn">Muat Ulang</button><div style="overflow:auto;margin-top:16px"><table class="portal-table"><thead><tr><th>Tanggal</th><th>Nama Tentor</th><th>Kelas</th><th>Murid</th><th>Mapel</th><th>Masuk</th><th>Pulang</th><th>Durasi</th><th>Status</th></tr></thead><tbody id="attendanceRows"><tr><td colspan="9">Memuat data...</td></tr></tbody></table></div>';
 $("refreshAttendance").onclick=loadAttendanceAdmin;
 const {data,error}=await db.from("attendance_records").select("attendance_date,check_in,check_out,status,subject,students(full_name),tutors(full_name),schedules(duration_minutes,classes(class_name))").order("attendance_date",{ascending:false}).limit(250);
 $("attendanceRows").innerHTML=error?'<tr><td colspan="9">'+esc(error.message)+'</td></tr>':data.length?data.map(r=>'<tr><td>'+esc(r.attendance_date)+'</td><td>'+esc(r.tutors?.full_name||"-")+'</td><td>'+esc(r.schedules?.classes?.class_name||"-")+'</td><td>'+esc(r.students?.full_name||"-")+'</td><td>'+esc(r.subject||"-")+'</td><td>'+timeText(r.check_in)+'</td><td>'+timeText(r.check_out)+'</td><td>'+esc(r.schedules?.duration_minutes||"-")+' menit</td><td>'+esc(r.status)+'</td></tr>').join(""):'<tr><td colspan="9">Belum ada data presensi.</td></tr>';
}
if(selectedLoginRole){
 $("loginTitle").textContent=selectedLoginRole==="admin"?"Login Admin":"Login Tentor";
 $("loginDescription").textContent=selectedLoginRole==="admin"?"Masuk menggunakan username/email dan password Admin seperti biasa.":"Masuk menggunakan username dan password Tentor yang telah diberikan Admin.";
 $("email").type=selectedLoginRole==="admin"?"email":"text";
 $("email").placeholder=selectedLoginRole==="admin"?"Username / email Admin":"Username Tentor";
}else{
 $("loginTitle").textContent="Link login tidak valid";
 $("loginDescription").textContent="Silakan kembali ke website dan pilih Login Admin atau Login Tentor.";
 $("loginForm").classList.add("portal-hidden");
 loginMessage("Jenis login tidak ditemukan. Gunakan tautan login dari halaman utama.");
}
$("adminTabs").addEventListener("click",e=>{
 const b=e.target.closest("button[data-view]");
 if(!b||!currentUser)return;
 currentView=b.dataset.view;
 $("adminTabs").querySelectorAll("button[data-view]").forEach(x=>x.classList.toggle("active",x===b));
 renderAdmin();
});
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!selectedLoginRole){loginMessage("Pilih jenis login terlebih dahulu.");return}
 loginMessage("Memproses login...");
 const loginId=$("email").value.trim();
 const password=$("password").value;
 const authEmail=selectedLoginRole==="tentor"&&!loginId.includes("@")?loginId.toLowerCase()+"@tutor.bimbelfun.invalid":loginId;
 let {error}=await db.auth.signInWithPassword({email:authEmail,password});
 // Compatibility for Tentor accounts created before username login was introduced.
 if(error&&selectedLoginRole==="tentor"&&loginId.includes("@")){
  const legacy=await db.auth.signInWithPassword({email:loginId,password});
  error=legacy.error;
 }
 if(error){loginMessage("Login gagal. Periksa username dan password Anda.");return}
 loginMessage("");
 await loadSession(selectedLoginRole);
});
$("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();location.reload()});
$("checkInBtn").addEventListener("click",async()=>{if(!tutorRecord||!selectedScheduleId)return;if(!$("tutorStudent").value){showMessage("Pilih murid yang diajar terlebih dahulu.",true);return}if(!$("tutorPackage").value){showMessage("Pilih paket pertemuan murid terlebih dahulu.",true);return}if(!$("teachingAddress").value.trim()){showMessage("Isi alamat tempat mengajar terlebih dahulu.",true);return}const {error}=await db.from("attendance_records").insert({tutor_id:tutorRecord.id,schedule_id:selectedScheduleId,attendance_date:today(),check_in:new Date().toISOString(),status:"hadir",student_id:$("tutorStudent").value||null,package_id:$("tutorPackage").value||null,subject:$("tutorSubject").value||null,teaching_address:$("teachingAddress").value.trim()||null});if(error){showMessage(error.message,true);return}showMessage("Presensi masuk tersimpan.");await refreshTutorAttendance()});
$("checkOutBtn").addEventListener("click",async()=>{if(!tutorRecord||!selectedScheduleId)return;const {error}=await db.from("attendance_records").update({check_out:new Date().toISOString()}).eq("tutor_id",tutorRecord.id).eq("schedule_id",selectedScheduleId).eq("attendance_date",today());if(error){showMessage(error.message,true);return}showMessage("Presensi pulang tersimpan.");await refreshTutorAttendance()});
db.auth.onAuthStateChange((_event,session)=>{if(!session){currentUser=null;if(realtimeChannel){db.removeChannel(realtimeChannel);realtimeChannel=null;}$("appPanel").classList.add("portal-hidden");if(selectedLoginRole)$("loginPanel").classList.remove("portal-hidden")}});
(async()=>{$("appPanel").classList.add("portal-hidden");if(selectedLoginRole){$("loginPanel").classList.remove("portal-hidden");await loadSession(selectedLoginRole);}else{$("loginPanel").classList.add("portal-hidden");loginMessage("Jenis login tidak ditemukan. Gunakan tautan login dari halaman utama.");}})();
