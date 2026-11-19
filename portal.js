// Browser-safe Supabase publishable key only. Never place service_role keys here.
const SUPABASE_URL="https://eoghhxnxugvsxxjotenu.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_XNEladKm2lliq4h40XMcTQ_qsarZcTe";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY),$=id=>document.getElementById(id);
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const timeText=v=>v?new Date(v).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):"-";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function showMessage(t,error=false){$("message").textContent=t;$("message").classList.remove("portal-hidden","portal-error");if(error)$("message").classList.add("portal-error")}
function loginMessage(t){$("loginMessage").textContent=t}
let tutorRecord=null,currentUser=null,rowForPaymentEdit=null,currentView="dashboard",editId=null,selectedScheduleId=null,tutorSchedules=[],realtimeChannel=null;
const requestedLoginRole=new URLSearchParams(window.location.search).get("role");
let selectedLoginRole=["admin","tentor"].includes(requestedLoginRole)?requestedLoginRole:null;
const configs={
 tutors:{title:"Data Tentor",table:"tutors",fields:[["tutor_code","Kode tentor"],["full_name","Nama lengkap","required"],["phone","Nomor HP"],["email","Email"],["expertise","Keahlian"],["status","Status"]]},
 students:{title:"Database Murid",table:"students",fields:[["full_name","Nama lengkap","required"],["gender","Jenis kelamin"],["education_level","Jenjang pendidikan","education"],["school_name","Sekolah"],["guardian_name","Nama orang tua/wali"],["guardian_phone","Telepon wali"],["address","Alamat"],["status","Status"]]},
 programs:{title:"Program Belajar",table:"programs",fields:[["program_name","Nama program","required"],["education_level","Jenjang","education"],["description","Deskripsi"],["price","Biaya","number"],["status","Status"]]},
 classes:{title:"Kelas & Jadwal",table:"classes",fields:[["student_id","Murid","select:students:id:full_name"],["subject","Mata Pelajaran","class-subject"],["class_grade","Kelas","class-grade"],["group_size","Jumlah murid kelompok","group-size"],["class_day","Hari","class-day"],["status","Status"]]},
 tutor_students:{title:"Penugasan Tutor per Murid",table:"tutor_students",fields:[["student_id","Murid","select:students:id:full_name"],["tutor_id","Tentor","select:tutors:id:full_name"]]},
 class_students:{title:"Pendaftaran Murid ke Kelas",table:"class_students",fields:[["class_id","Kelas","select:classes:id:class_name"],["student_id","Murid","select:students:id:full_name"],["joined_at","Tanggal bergabung","date"],["status","Status"]]},
 schedules:{title:"Jadwal Kelas",table:"schedules",fields:[["class_id","Kelas","select:classes:id:class_name"],["subject","Mata pelajaran","subject"],["day_of_week","Hari (1 Senin – 7 Minggu)","number"],["start_time","Jam mulai","time"],["end_time","Jam selesai","time"],["duration_minutes","Durasi per pertemuan","duration"],["location","Lokasi"]] },
 student_packages:{title:"Paket Pertemuan Murid",table:"student_packages",fields:[["student_id","Murid","select:students:id:full_name"],["tutor_id","Tentor","select:tutors:id:full_name"],["subject","Mata pelajaran","subject"],["package_meetings","Jumlah pertemuan","package-count"],["price","Harga paket (Rp)","number"],["purchased_at","Tanggal Pembayaran","date"],["expires_at","Tanggal berakhir","date"],["status","Status paket","package-status"],["notes","Catatan"]]},
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
 const {data:assignments,error:assignmentError}=await db.from("class_tutors").select("classes(id,class_name,student_id,class_grade,class_day,group_size,students(full_name,school_name),schedules(id,day_of_week,start_time,end_time,location,duration_minutes,subject))").eq("tutor_id",t.id);
 if(assignmentError){showMessage("Gagal memuat jadwal: "+assignmentError.message,true);return}
 const dayNames=["","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
 const directResult=await db.from("tutor_students").select("students(id,full_name,education_level,school_name)").eq("tutor_id",t.id);
 const summary=$("tutorAssignmentsSummary");
 if(summary){const classCards=(assignments||[]).map(a=>{const c=a.classes;if(!c)return "";const days=String(c.class_day||"").split(",").map(x=>x.trim()).filter(Boolean).join(", ")||"Jadwal belum diisi";return '<article class="stat-card"><strong>'+esc(c.class_name)+'</strong><span>Kelas: '+esc(c.class_grade||"-")+'</span><span>Hari: '+esc(days)+'</span><span>Kelompok: '+esc(c.group_size?c.group_size+" murid":"-")+'</span><span>Murid: '+esc(c.students?.full_name||"Kelompok belajar (anggota belum ditentukan)")+'</span><span>Sekolah: '+esc(c.students?.school_name||"-")+'</span></article>'}).join("");const directCards=(directResult.data||[]).map(x=>'<article class="stat-card"><strong>'+esc(x.students?.full_name||"-")+'</strong><span>Penugasan langsung</span><span>Kelas: '+esc(x.students?.education_level||"-")+'</span><span>Sekolah: '+esc(x.students?.school_name||"-")+'</span></article>').join("");summary.innerHTML=classCards+directCards||( '<p class="portal-muted">Belum ada murid atau jadwal yang ditugaskan.</p>');}
 tutorSchedules=(assignments||[]).flatMap(a=>(a.classes?.schedules||[]).map(s=>({...s,class_name:a.classes.class_name,class_id:a.classes.id})));
 const studentSelect=$("tutorStudent"),scheduleSelect=$("tutorSchedule");
 const assignedStudents=new Map();
 (directResult.data||[]).forEach(x=>{if(x.students?.id)assignedStudents.set(x.students.id,x.students)});
 const classIds=(assignments||[]).map(a=>a.classes?.id).filter(Boolean);
 let classStudentLinks=[];
 if(classIds.length){const links=await db.from("class_students").select("class_id,student_id,status,students(id,full_name,education_level,school_name)").in("class_id",classIds);if(!links.error)classStudentLinks=links.data||[];}
 tutorSchedules=(assignments||[]).flatMap(a=>{
  const cl=a.classes;if(!cl)return [];
  const linked=classStudentLinks.filter(x=>x.class_id===cl.id&&!["inactive","nonaktif","removed"].includes(String(x.status||"active").toLowerCase())).map(x=>x.students).filter(Boolean);
  const members=linked.length?linked:(cl.student_id&&cl.students?.full_name?[{id:cl.student_id,...cl.students}]:[]);
  members.forEach(st=>{if(st?.id)assignedStudents.set(st.id,st)});
  return (cl.schedules||[]).filter(s=>s.is_active!==false).flatMap(s=>members.map(st=>({...s,class_name:cl.class_name,class_id:cl.id,student_id:st.id,student_name:st.full_name,school_name:st.school_name,education_level:st.education_level})));
 });
 studentSelect.innerHTML='<option value="">Pilih murid terlebih dahulu</option>'+[...assignedStudents.values()].sort((a,b)=>a.full_name.localeCompare(b.full_name,"id")).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.full_name)+'</option>').join("");
 scheduleSelect.innerHTML='<option value="">Pilih murid dahulu</option>';scheduleSelect.disabled=true;
 selectedScheduleId=null;
 studentSelect.onchange=async()=>{
  selectedScheduleId=null;
  const sid=studentSelect.value;
  const matches=tutorSchedules.filter(s=>s.student_id===sid);
  scheduleSelect.disabled=!sid;
  scheduleSelect.innerHTML='<option value="">'+(sid?(matches.length?'Pilih jadwal/pertemuan':'Belum ada jadwal untuk murid ini'):'Pilih murid dahulu')+'</option>'+
   matches.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.class_name)+' — '+esc(dayNames[s.day_of_week]||"")+' ('+esc(s.duration_minutes||60)+' menit)</option>').join("");
  $("tutorSubject").value="";$("teachingAddress").value="";
  $("tutorPackage").innerHTML='<option value="">Pilih jadwal dahulu</option>';
  $("checkInBtn").disabled=true;$("checkOutBtn").disabled=true;
  await refreshTutorAttendance();
 };
 scheduleSelect.onchange=async()=>{selectedScheduleId=scheduleSelect.value||null;await loadTutorAttendanceOptions();await refreshTutorAttendance()};
 await loadTutorAttendanceOptions();
 $("checkInBtn").disabled=true;$("checkOutBtn").disabled=true;
 await refreshTutorAttendance();
 await loadTutorHistory();
}
async function loadTutorAttendanceOptions(){
 const s=tutorSchedules.find(x=>x.id===selectedScheduleId);
 const studentSelect=$("tutorStudent"),packageSelect=$("tutorPackage"),subjectSelect=$("tutorSubject"),addressInput=$("teachingAddress");
 if(!s){packageSelect.innerHTML='<option value="">Pilih jadwal dahulu</option>';return}
 studentSelect.value=s.student_id;
 subjectSelect.value=s.subject||"";
 addressInput.value=s.location||"";
 let packageQuery=db.from("student_packages").select("id,subject,package_meetings,used_meetings,status,class_id").eq("student_id",s.student_id).eq("tutor_id",tutorRecord.id).eq("status","active");if(s.class_id)packageQuery=packageQuery.or("class_id.is.null,class_id.eq."+s.class_id);const {data:pkgs,error}=await packageQuery;
 if(error){showMessage("Gagal memuat paket murid: "+error.message,true);return}
 packageSelect.innerHTML='<option value="">Pilih paket</option>'+(pkgs||[]).filter(p=>Number(p.used_meetings||0)<Number(p.package_meetings||0)).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.subject)+' — sisa '+(p.package_meetings-p.used_meetings)+' dari '+p.package_meetings+'</option>').join("");
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
  if(["class_tutors","tutor_students","class_students","schedules","tutors","students","student_packages","classes"].includes(table)){await loadTutor(currentUser.id);return}
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
  const {data,error}=await db.from("payments").select("id,invoice_id,amount,payment_date,payment_method,reference,notes,invoices(id,student_id,invoice_number,amount,due_date,status,students(full_name,guardian_phone))").order("created_at",{ascending:false}).limit(250);
  const head=$("recordHead"),body=$("recordRows");if(error){body.innerHTML='<tr><td>'+esc(error.message)+'</td></tr>';return}
  head.innerHTML="<tr><th>Murid</th><th>No. Invoice</th><th>Jumlah</th><th>Tanggal</th><th>Metode</th><th>Referensi</th><th>WhatsApp Orang Tua</th><th>Aksi</th></tr>";
  body.innerHTML=(data||[]).length?data.map(x=>"<tr><td>"+esc(x.invoices?.students?.full_name||"-")+"</td><td>"+esc(x.invoices?.invoice_number||"-")+"</td><td>Rp "+Number(x.amount||0).toLocaleString("id-ID")+"</td><td>"+esc(x.payment_date||"-")+"</td><td>"+esc(x.payment_method||"-")+"</td><td>"+esc(x.reference||"-")+"</td><td><button class=\"small-btn\" data-wa-payment=\""+x.id+"\">WhatsApp</button></td><td><button class=\"small-btn\" data-edit-payment=\""+x.id+"\">Edit</button> <button class=\"small-btn danger\" data-delete-payment=\""+x.id+"\">Hapus</button></td></tr>").join(""):'<tr><td colspan="8">Belum ada pembayaran.</td></tr>';
  body.querySelectorAll("[data-wa-payment]").forEach(b=>b.onclick=()=>{const p=data.find(x=>x.id===b.dataset.waPayment);if(p?.invoices)shareInvoice(p.invoices)});
  body.querySelectorAll("[data-edit-payment]").forEach(b=>{const p=data.find(x=>x.id===b.dataset.editPayment);b.onclick=()=>openRecordForm(cfg,{...p,student_id:p.invoices?.student_id||""})});
  body.querySelectorAll("[data-delete-payment]").forEach(b=>b.onclick=async()=>{const p=data.find(x=>x.id===b.dataset.deletePayment);if(!p)return;if(!confirm("Hapus catatan pembayaran ini? Invoice tetap disimpan dan statusnya akan dikembalikan menjadi belum dibayar jika tidak ada pembayaran lain."))return;const removed=await db.from("payments").delete().eq("id",p.id);if(removed.error){alert("Gagal menghapus pembayaran: "+removed.error.message);return}if(p.invoice_id){const remaining=await db.from("payments").select("id",{count:"exact",head:true}).eq("invoice_id",p.invoice_id);if(!remaining.error&&remaining.count===0){const reset=await db.from("invoices").update({status:"unpaid"}).eq("id",p.invoice_id);if(reset.error){alert("Pembayaran terhapus, tetapi status invoice gagal diperbarui: "+reset.error.message)}}}await loadRecords(cfg)});
  return;
 }
 if(cfg.table==="student_packages"){const {data,error}=await db.from("student_packages").select("id,student_id,tutor_id,subject,package_meetings,used_meetings,price,purchased_at,expires_at,status,notes,students(full_name,education_level,school_name),tutors(full_name)").order("created_at",{ascending:false}).limit(250);const head=$("recordHead"),body=$("recordRows");if(error){body.innerHTML='<tr><td>'+esc(error.message)+'</td></tr>';return}head.innerHTML="<tr><th>Murid</th><th>Kelas</th><th>Sekolah</th><th>Tentor</th><th>Mapel</th><th>Pertemuan</th><th>Harga</th><th>Status</th><th>Aksi</th></tr>";body.innerHTML=(data||[]).map(x=>'<tr><td>'+esc(x.students?.full_name||"-")+'</td><td>'+esc(x.students?.education_level||"-")+'</td><td>'+esc(x.students?.school_name||"-")+'</td><td>'+esc(x.tutors?.full_name||"-")+'</td><td>'+esc(x.subject)+'</td><td>'+Number(x.used_meetings||0)+' / '+Number(x.package_meetings||0)+'</td><td>Rp '+Number(x.price||0).toLocaleString("id-ID")+'</td><td>'+esc(x.status)+'</td><td><button class="small-btn" data-edit="'+x.id+'">Ubah</button> <button class="small-btn danger" data-delete="'+x.id+'">Hapus</button></td></tr>').join("")||'<tr><td colspan="9">Belum ada paket.</td></tr>';body.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openRecordForm(cfg,data.find(x=>x.id===b.dataset.edit)));body.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(confirm("Hapus paket ini?")){const {error}=await db.from("student_packages").delete().eq("id",b.dataset.delete);if(error)alert(error.message);else await loadRecords(cfg)}});return}
 if(cfg.table==="classes"){
  const {data,error}=await db.from("classes").select("id,class_name,student_id,subject,class_grade,class_day,group_size,education_level,learning_mode,status,students(full_name),schedules(id,day_of_week,start_time,end_time,location,subject,duration_minutes,is_active),class_tutors(tutor_id,tutors(full_name))").order("class_name");
  const head=$("recordHead"),body=$("recordRows");if(error){body.innerHTML='<tr><td>'+esc(error.message)+'</td></tr>';return}
  head.innerHTML="<tr><th>Murid</th><th>Tentor</th><th>Hari</th><th>Mata Pelajaran</th><th>Kelas</th><th>Jadwal / Durasi</th><th>Lokasi</th><th>Aksi</th></tr>";
  const days=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  body.innerHTML=(data||[]).length?data.map(r=>{const sch=r.schedules||[];const tutors=(r.class_tutors||[]).map(t=>t.tutors?.full_name).filter(Boolean).join(", ")||"-";return "<tr><td>"+esc(r.students?.full_name||r.class_name)+"</td><td>"+esc(tutors)+"</td><td>"+esc(r.class_day||sch.map(x=>days[Number(x.day_of_week)%7]||"-").join(", ")||"-")+"</td><td>"+esc(r.subject||sch.map(x=>x.subject).filter(Boolean).join(", ")||"-")+"</td><td>"+esc(r.class_grade||r.education_level||"-")+"</td><td>"+esc(sch.filter(x=>x.is_active!==false).map(x=>days[Number(x.day_of_week)%7]+" · "+(x.duration_minutes||60)+" menit").join(", ")||"-")+"</td><td>"+esc(sch.map(x=>x.location).filter(Boolean).join(", ")||"-")+"</td><td><button class=\"small-btn\" data-edit=\""+r.id+"\">Ubah</button></td></tr>"}).join(""):'<tr><td colspan="7">Belum ada data jadwal.</td></tr>';
  body.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openRecordForm(cfg,data.find(r=>r.id===b.dataset.edit)));return;
 }
 if(cfg.table==="tutor_students"){const {data,error}=await db.from("tutor_students").select("id,student_id,tutor_id,students(full_name),tutors(full_name)").order("created_at",{ascending:false}).limit(250);const head=$("recordHead"),body=$("recordRows");if(error){body.innerHTML='<tr><td>'+esc(error.message)+'</td></tr>';return}head.innerHTML="<tr><th>Nama Murid</th><th>Nama Tentor</th><th>Aksi</th></tr>";body.innerHTML=(data||[]).slice().sort((a,b)=>String(a.tutors?.full_name||"").localeCompare(String(b.tutors?.full_name||""),"id")||String(a.students?.full_name||"").localeCompare(String(b.students?.full_name||""),"id")).map(x=>'<tr><td>'+esc(x.students?.full_name||"-")+'</td><td>'+esc(x.tutors?.full_name||"-")+'</td><td><button class="small-btn" data-edit="'+x.id+'">Edit</button> <button class="small-btn danger" data-delete="'+x.id+'">Hapus</button></td></tr>').join("")||'<tr><td colspan="3">Belum ada penugasan.</td></tr>';body.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openRecordForm(cfg,data.find(x=>x.id===b.dataset.edit)));body.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(confirm("Hapus penugasan ini?")){const {error}=await db.from("tutor_students").delete().eq("id",b.dataset.delete);if(error)alert(error.message);else await loadRecords(cfg)}});return}
  const cols=cfg.fields.map(f=>f[0]).join(",")+(cfg.table==="student_packages"?",used_meetings,education_level":"");
 let query=db.from(cfg.table).select("id,"+cols);if(["tutors","students"].includes(cfg.table))query=query.order("full_name",{ascending:true});else if(!["class_tutors","class_students"].includes(cfg.table))query=query.order("created_at",{ascending:false});const {data,error}=await query.limit(250);
 const head=$("recordHead"),body=$("recordRows");
 if(error){body.innerHTML='<tr><td>'+esc(error.message)+'</td></tr>';return}
 head.innerHTML="<tr>"+cfg.fields.map(f=>"<th>"+esc(f[1])+"</th>").join("")+(cfg.table==="student_packages"?"<th>Terpakai / Sisa</th>":"")+"<th>Aksi</th></tr>";
 body.innerHTML=data.length?data.map(row=>"<tr>"+cfg.fields.map(f=>"<td>"+esc(f[0]==="class_level"?(row.class_level||row.education_level||"-"):row[f[0]])+"</td>").join("")+(cfg.table==="student_packages"?"<td>"+Number(row.used_meetings||0)+" / "+(Number(row.package_meetings)-Number(row.used_meetings||0))+"</td>":"")+'<td><button class="small-btn" data-edit="'+row.id+'">Ubah</button> <button class="small-btn danger" data-delete="'+row.id+'">Hapus</button></td></tr>').join(""):'<tr><td colspan="'+(cfg.fields.length+1)+'">Belum ada data.</td></tr>';
 body.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openRecordForm(cfg,data.find(r=>r.id===b.dataset.edit)));
 body.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Yakin ingin menghapus data ini?"))return;const {error}=await db.from(cfg.table).delete().eq("id",b.dataset.delete);if(error)alert(error.message);else await loadRecords(cfg)});
}
async function fieldControl(f,value,table){
 const [name,label,type]=f;let inputType=type==="date"?"date":type==="number"?"number":type==="time"?"time":"text";
 if(type==="class-subject")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih mata pelajaran</option>'+["All Mapel","Calistung","English Course","Mengaji"].map(v=>'<option value="'+esc(v)+'" '+(value===v?"selected":"")+' >'+esc(v)+'</option>').join("")+'</select></label>';
  if(type==="class-grade")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih kelas</option>'+["PAUD","TK A","TK B",...Array.from({length:6},(_,i)=>"SD Kelas "+(i+1)),...Array.from({length:3},(_,i)=>"SMP Kelas "+(i+7)),...Array.from({length:3},(_,i)=>"SMA Kelas "+(i+10)),"Kelompok Belajar"].map(v=>'<option value="'+esc(v)+'" '+(value===v?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select></label>';
 if(type==="group-size")return '<label>'+esc(label)+'<select name="'+name+'"><option value="">Pilih jumlah murid (opsional)</option>'+[1,2,3,4,5].map(v=>'<option value="'+v+'" '+(Number(value)===v?"selected":"")+'>'+v+' murid</option>').join("")+'</select></label>';
  if(type==="class-day"){const days=["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"],chosen=String(value||"").split(",").map(x=>x.trim());return '<label>'+esc(label)+'<select name="'+name+'" multiple size="5" required>'+days.map(v=>'<option value="'+v+'" '+(chosen.includes(v)?"selected":"")+'>'+v+'</option>').join("")+'</select><small class="portal-muted">Pilih satu atau beberapa hari.</small></label>'}
  if(type==="education")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih jenjang</option>'+["PAUD","TK A","TK B",...Array.from({length:6},(_,i)=>"SD KELAS "+(i+1)),...Array.from({length:3},(_,i)=>"SMP KELAS "+(i+7)),...Array.from({length:3},(_,i)=>"SMA KELAS "+(i+10))].map(v=>'<option value="'+esc(v)+'" '+(value===v?"selected":"")+' >'+esc(v)+'</option>').join("")+'</select></label>';
 if(type==="subject")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih mata pelajaran</option>'+["Calistung","All Mapel","English Course","Mengaji","Kreativitas"].map(v=>'<option value="'+esc(v)+'" '+(value===v?"selected":"")+' >'+esc(v)+'</option>').join("")+'</select></label>';
 if(type==="package-count")return '<label>'+esc(label)+'<select name="'+name+'" required>'+[4,8,12,16].map(v=>'<option value="'+v+'" '+(Number(value||4)===v?"selected":"")+' >'+v+' pertemuan</option>').join("")+'</select></label>';
 if(type==="package-status"||type==="invoice-status")return '<label>'+esc(label)+'<select name="'+name+'">'+(type==="package-status"?["active","pending","off"]:["unpaid","partial","paid"]).map(v=>'<option value="'+v+'" '+(value===v?"selected":"")+' >'+(v==="active"?"Active":v==="pending"?"Pending":v==="off"?"Off":v)+'</option>').join("")+'</select></label>';
 if(type==="duration")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="60" '+(String(value??60)==="60"?"selected":"")+' >60 menit</option><option value="90" '+(String(value)==="90"?"selected":"")+' >90 menit</option><option value="120" '+(String(value)==="120"?"selected":"")+' >120 menit</option></select></label>';
 if(type?.startsWith("select:")){const [,optionTable,key,textCol]=type.split(":");const {data}=await db.from(optionTable).select(key+","+textCol).order(textCol);return '<label>'+esc(label)+'<select name="'+name+'" '+(table==="classes"&&name==="student_id"?"":"required")+'><option value="">Pilih '+esc(label)+'</option>'+(data||[]).map(o=>'<option value="'+esc(o[key])+'" '+(o[key]===value?"selected":"")+'>'+esc(o[textCol])+'</option>').join("")+'</select></label>'}
 return '<label>'+esc(label)+'<input name="'+name+'" type="'+inputType+'" '+(f[2]==="required"?"required":"")+' value="'+esc(value??"")+'"></label>';
}
async function openClassScheduleForm(cfg,row=null){
 editId=row?.id||null;
 const dayNames={1:"Senin",2:"Selasa",3:"Rabu",4:"Kamis",5:"Jumat",6:"Sabtu",7:"Minggu"};
 const [tutorRows,assignmentRows]=await Promise.all([
  db.from("tutors").select("id,full_name").order("full_name"),
  db.from("tutor_students").select("tutor_id,student_id,students(id,full_name)").limit(1000)
 ]);
 if(tutorRows.error||assignmentRows.error){alert("Gagal memuat pilihan Tentor/Murid: "+(tutorRows.error||assignmentRows.error).message);return}
 const currentTutor=row?.class_tutors?.[0]?.tutor_id||null;
 const activeSchedules=(row?.schedules||[]).filter(x=>x.is_active!==false);
 const days=activeSchedules.map(x=>Number(x.day_of_week));
 const fallbackDays=String(row?.class_day||"").split(",").map(x=>Object.keys(dayNames).find(k=>dayNames[k]===x.trim())).filter(Boolean).map(Number);
 const chosenDays=days.length?days:fallbackDays;
 const firstSchedule=activeSchedules[0]||row?.schedules?.[0]||{};
 const grades=["PAUD","TK A","TK B",...Array.from({length:6},(_,i)=>"SD Kelas "+(i+1)),...Array.from({length:3},(_,i)=>"SMP Kelas "+(i+7)),...Array.from({length:3},(_,i)=>"SMA Kelas "+(i+10)),"Kelompok Belajar"];
 const subjects=["Calistung","All Mapel","English Course","Mengaji","Kreativitas"];
 const opts=(items,value,label)=>items.map(x=>'<option value="'+esc(x[value])+'" '+(String(x[value])===String(label)?"selected":"")+'>'+esc(x[label])+'</option>').join("");
 $("recordFormWrap").innerHTML='<form id="recordForm" class="admin-form"><h3>'+(row?"Ubah Kelas & Jadwal":"Tambah Kelas & Jadwal")+'</h3>'+
 '<label>Tentor<select id="classTutor" name="tutor_id" required><option value="">Pilih Tentor</option>'+tutorRows.data.map(t=>'<option value="'+esc(t.id)+'" '+(t.id===currentTutor?"selected":"")+'>'+esc(t.full_name)+'</option>').join("")+'</select></label>'+
 '<label>Murid<select id="classStudent" name="student_id" required><option value="">Pilih Tentor terlebih dahulu</option></select></label>'+
 '<label>Mata Pelajaran<select name="subject" required><option value="">Pilih mata pelajaran</option>'+subjects.map(v=>'<option '+(v===(row?.subject||"")?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select></label>'+
 '<label>Jenjang / Kelas<select name="class_grade" required><option value="">Pilih kelas</option>'+grades.map(v=>'<option '+(v===(row?.class_grade||"")?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select></label>'+
 '<label>Jumlah murid kelompok (opsional)<select name="group_size"><option value="">Tidak ditentukan</option>'+[1,2,3,4,5].map(v=>'<option value="'+v+'" '+(Number(row?.group_size)===v?"selected":"")+'>'+v+' murid</option>').join("")+'</select></label>'+
 '<label>Hari belajar (pilih satu atau beberapa)<select id="classDays" name="days" multiple size="5" required>'+Object.entries(dayNames).map(([n,v])=>'<option value="'+n+'" '+(chosenDays.includes(Number(n))?"selected":"")+'>'+v+'</option>').join("")+'</select></label>'+
 '<label>Durasi per pertemuan<select name="duration_minutes" required>'+[60,90,120].map(v=>'<option value="'+v+'" '+(Number(firstSchedule.duration_minutes||60)===v?"selected":"")+'>'+v+' menit</option>').join("")+'</select></label>'+
 '<label>Lokasi / Alamat belajar<input name="location" type="text" value="'+esc(firstSchedule.location||"")+'" placeholder="Alamat tempat belajar"></label>'+
 '<label>Paket Pertemuan<select id="classPackage" name="package_id" required><option value="">Pilih murid dan tentor terlebih dahulu</option></select></label>'+
 '<p class="portal-muted">Admin mengatur hari dan durasi. Jam mulai dan selesai tidak diisi di sini; Tentor mencatat waktu aktual melalui Presensi Masuk dan Presensi Pulang.</p>'+
 '<div class="portal-actions"><button class="portal-btn" type="submit">Simpan</button><button class="small-btn" type="button" id="cancelForm">Batal</button></div></form>';
 const studentSelect=$("classStudent"),tutorSelect=$("classTutor"),packageSelect=$("classPackage");
 const selectedStudentId=row?.student_id||null;
 const existingPackage=async()=>{
  if(!row?.id||!currentTutor||!selectedStudentId)return null;
  const q=await db.from("student_packages").select("id").eq("student_id",selectedStudentId).eq("tutor_id",currentTutor).or("class_id.is.null,class_id.eq."+row.id).eq("status","active").limit(1);
  return q.data?.[0]?.id||null;
 };
 const existingPackageId=await existingPackage();
 async function refreshClassStudents(){
  const tid=tutorSelect.value;
  const eligible=(assignmentRows.data||[]).filter(x=>x.tutor_id===tid&&x.students?.id);
  const unique=[...new Map(eligible.map(x=>[x.students.id,x.students])).values()].sort((a,b)=>a.full_name.localeCompare(b.full_name,"id"));
  if(selectedStudentId&&tid===currentTutor&&!unique.some(x=>x.id===selectedStudentId)){
   const old=await db.from("students").select("id,full_name").eq("id",selectedStudentId).maybeSingle();
   if(old.data)unique.push(old.data);
  }
  studentSelect.innerHTML='<option value="">Pilih murid yang ditugaskan kepada Tentor</option>'+unique.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===(studentSelect.dataset.value||selectedStudentId)?"selected":"")+'>'+esc(x.full_name)+'</option>').join("");
  if(!tid){studentSelect.disabled=true;studentSelect.innerHTML='<option value="">Pilih Tentor terlebih dahulu</option>'}
  else studentSelect.disabled=false;
  await refreshClassPackages();
 }
 async function refreshClassPackages(){
  const sid=studentSelect.value,tid=tutorSelect.value;
  packageSelect.innerHTML='<option value="">Memuat paket aktif...</option>';
  if(!sid||!tid){packageSelect.innerHTML='<option value="">Pilih murid dan tentor terlebih dahulu</option>';return}
  let q=db.from("student_packages").select("id,subject,package_meetings,used_meetings,class_id").eq("student_id",sid).eq("tutor_id",tid).eq("status","active");
  if(row?.id)q=q.or("class_id.is.null,class_id.eq."+row.id);else q=q.is("class_id",null);
  const result=await q.order("created_at",{ascending:false});
  if(result.error){packageSelect.innerHTML='<option value="">Gagal memuat paket</option>';alert("Gagal memuat paket: "+result.error.message);return}
  const packages=(result.data||[]).filter(p=>Number(p.used_meetings||0)<Number(p.package_meetings||0));
  packageSelect.innerHTML='<option value="">Pilih paket aktif</option>'+packages.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.subject)+' — sisa '+(p.package_meetings-p.used_meetings)+' dari '+p.package_meetings+'</option>').join("");
  if(existingPackageId&&sid===selectedStudentId&&tid===currentTutor)packageSelect.value=existingPackageId;
 }
 tutorSelect.onchange=async()=>{studentSelect.dataset.value="";await refreshClassStudents()};
 studentSelect.onchange=()=>{studentSelect.dataset.value=studentSelect.value;refreshClassPackages()};
 $("cancelForm").onclick=()=>{$("recordFormWrap").innerHTML=""};
 await refreshClassStudents();
 if(selectedStudentId)studentSelect.value=selectedStudentId;
 await refreshClassPackages();
 $("recordForm").onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(e.currentTarget);
  const days=[...$("classDays").selectedOptions].map(o=>Number(o.value));
  const group=fd.get("group_size");
  const result=await db.rpc("bimbelfun_admin_save_class_schedule",{
   p_class_id:row?.id||null,
   p_student_id:fd.get("student_id"),
   p_tutor_id:fd.get("tutor_id"),
   p_subject:fd.get("subject"),
   p_class_grade:fd.get("class_grade"),
   p_group_size:group?Number(group):null,
   p_days:days,
   p_duration_minutes:Number(fd.get("duration_minutes")),
   p_location:fd.get("location")||null,
   p_package_id:fd.get("package_id")
  });
  if(result.error){alert("Gagal menyimpan Kelas & Jadwal: "+result.error.message);return}
  editId=null;$("recordFormWrap").innerHTML="";
  alert("Kelas dan jadwal berhasil disinkronkan dengan penugasan Tentor dan paket murid.");
  await loadRecords(cfg);
 };
}

async function openRecordForm(cfg,row=null){
 if(cfg.table==="classes")return openClassScheduleForm(cfg,row);
 editId=row?.id||null;if(cfg.table==="payments")rowForPaymentEdit=row||null;const controls=await Promise.all(cfg.fields.map(f=>fieldControl(f,row?.[f[0]],cfg.table)));
 $("recordFormWrap").innerHTML='<form id="recordForm" class="admin-form"><h3>'+(row?"Ubah Data":"Tambah Data")+'</h3>'+controls.join("")+'<div class="portal-actions"><button class="portal-btn" type="submit">Simpan</button><button class="small-btn" type="button" id="cancelForm">Batal</button></div></form>';
 $("cancelForm").onclick=()=>{$("recordFormWrap").innerHTML=""};
 $("recordForm").onsubmit=async e=>{e.preventDefault();const formData=new FormData(e.target);const values=Object.fromEntries(formData.entries());if(cfg.table==="classes")values.class_day=formData.getAll("class_day").join(", ");for(const k in values)if(values[k]==="")values[k]=null;for(const k in values)if(["price","amount","day_of_week","package_meetings","group_size"].includes(k)&&values[k]!==null)values[k]=Number(values[k]);if(cfg.table==="classes"){let selected=null;if(values.student_id){const result=await db.from("students").select("full_name").eq("id",values.student_id).single();selected=result.data;}values.class_name=selected?.full_name||(values.class_grade==="Kelompok Belajar"?"Kelompok Belajar":"Kelas murid");values.program_id=null;values.education_level=values.class_grade;values.learning_mode="offline";if(values.class_grade!=="Kelompok Belajar")values.group_size=null;}if(cfg.table==="student_packages"){values.class_id=null;}if(cfg.table==="student_packages"&&values.created_by===undefined)values.created_by=currentUser.id;if(cfg.table==="invoices"&&values.created_by===undefined)values.created_by=currentUser.id;if(cfg.table==="payments"&&values.recorded_by===undefined)values.recorded_by=currentUser.id;if(cfg.table==="expenses"&&values.created_by===undefined)values.created_by=currentUser.id;if(cfg.table==="payments"&&editId){const paymentId=editId,studentId=values.student_id;delete values.student_id;delete values.recorded_by;const oldInvoice=rowForPaymentEdit?.invoices;const invoiceId=rowForPaymentEdit?.invoice_id;if(!invoiceId){alert("Invoice terkait tidak ditemukan. Pembayaran tidak diubah.");return}const invoiceUpdate=await db.from("invoices").update({student_id:studentId,amount:values.amount,due_date:values.payment_date,status:"paid"}).eq("id",invoiceId);if(invoiceUpdate.error){alert("Gagal memperbarui invoice: "+invoiceUpdate.error.message);return}const paymentUpdate=await db.from("payments").update(values).eq("id",paymentId);if(paymentUpdate.error){if(oldInvoice)await db.from("invoices").update({student_id:oldInvoice.student_id,amount:oldInvoice.amount,due_date:oldInvoice.due_date,status:oldInvoice.status}).eq("id",invoiceId);alert("Gagal memperbarui pembayaran: "+paymentUpdate.error.message);return}editId=null;rowForPaymentEdit=null;$("recordFormWrap").innerHTML="";await loadRecords(cfg);return}if(cfg.table==="payments"&&!editId){const studentId=values.student_id;delete values.student_id;const stamp=new Date();const invoiceNo="BF-"+stamp.getFullYear()+String(stamp.getMonth()+1).padStart(2,"0")+String(stamp.getDate()).padStart(2,"0")+"-"+String(stamp.getHours()).padStart(2,"0")+String(stamp.getMinutes()).padStart(2,"0")+String(stamp.getSeconds()).padStart(2,"0")+"-"+Math.random().toString(36).slice(2,6).toUpperCase();const invoicePayload={student_id:studentId,invoice_number:invoiceNo,amount:values.amount,due_date:values.payment_date,status:"paid",notes:values.notes||"Invoice otomatis dari pembayaran",created_by:currentUser.id};const created=await db.from("invoices").insert(invoicePayload).select("id").single();if(created.error){alert("Gagal membuat invoice: "+created.error.message);return}values.invoice_id=created.data.id;values.recorded_by=currentUser.id;const paid=await db.from("payments").insert(values);if(paid.error){await db.from("invoices").delete().eq("id",created.data.id);alert("Invoice dibuat tetapi pembayaran gagal disimpan: "+paid.error.message);return}alert("Pembayaran tersimpan. Invoice "+invoiceNo+" berhasil dibuat.");editId=null;$("recordFormWrap").innerHTML="";await loadInvoicesAdmin();return}const query=editId?db.from(cfg.table).update(values).eq("id",editId):db.from(cfg.table).insert(values);const {error}=await query;if(error){alert("Gagal menyimpan: "+error.message);return}editId=null;rowForPaymentEdit=null;$("recordFormWrap").innerHTML="";if(cfg.table==="invoices"){await loadInvoicesAdmin()}else{await loadRecords(cfg)}};
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
function normalizeWhatsAppPhone(value){
 let phone=String(value||"").replace(/\D/g,"");
 if(phone.startsWith("00"))phone=phone.slice(2);
 if(phone.startsWith("0"))phone="62"+phone.slice(1);
 else if(phone.startsWith("8"))phone="62"+phone;
 return phone;
}
function shareInvoice(x){
 const rawPhone=x.students?.guardian_phone||"";
 const phone=normalizeWhatsAppPhone(rawPhone);
 if(!phone){alert("Nomor WhatsApp orang tua belum diisi pada data murid.");return}
 if(phone.length<9||phone.length>15){alert("Format nomor WhatsApp orang tua tidak valid. Periksa kembali nomor pada data murid.");return}
 const url="https://wa.me/"+phone+"?text="+encodeURIComponent(invoiceMessage(x));
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
