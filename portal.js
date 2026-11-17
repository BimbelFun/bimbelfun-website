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
const configs={
 tutors:{title:"Data Tentor",table:"tutors",fields:[["tutor_code","Kode tentor"],["full_name","Nama lengkap","required"],["phone","Nomor HP"],["email","Email"],["expertise","Keahlian"],["status","Status"]]},
 students:{title:"Database Murid",table:"students",fields:[["student_code","Kode murid"],["full_name","Nama lengkap","required"],["gender","Jenis kelamin"],["birth_date","Tanggal lahir","date"],["education_level","Jenjang pendidikan","education"],["school_name","Nama sekolah"],["guardian_name","Nama orang tua/wali"],["guardian_phone","Telepon wali"],["address","Alamat"],["status","Status"]]},
 programs:{title:"Program Belajar",table:"programs",fields:[["program_name","Nama program","required"],["education_level","Jenjang","education"],["description","Deskripsi"],["price","Biaya","number"],["status","Status"]]},
 classes:{title:"Data Kelas",table:"classes",fields:[["class_name","Nama kelas","required"],["program_id","Program","select:programs:id:program_name"],["education_level","Jenjang","education"],["learning_mode","Metode belajar"],["status","Status"]]},
 class_tutors:{title:"Penugasan Tentor",table:"class_tutors",fields:[["class_id","Kelas","select:classes:id:class_name"],["tutor_id","Tentor","select:tutors:id:full_name"]]},
 class_students:{title:"Pendaftaran Murid ke Kelas",table:"class_students",fields:[["class_id","Kelas","select:classes:id:class_name"],["student_id","Murid","select:students:id:full_name"],["joined_at","Tanggal bergabung","date"],["status","Status"]]},
 schedules:{title:"Jadwal Kelas",table:"schedules",fields:[["class_id","Kelas","select:classes:id:class_name"],["subject","Mata pelajaran","subject"],["day_of_week","Hari (1 Senin – 7 Minggu)","number"],["start_time","Jam mulai","time"],["end_time","Jam selesai","time"],["duration_minutes","Durasi per pertemuan","duration"],["location","Lokasi"]] },
 student_packages:{title:"Paket Pertemuan Murid",table:"student_packages",fields:[["student_id","Murid","select:students:id:full_name"],["class_id","Kelas","select:classes:id:class_name"],["subject","Mata pelajaran","subject"],["package_meetings","Jumlah pertemuan","package-count"],["price","Harga paket (Rp)","number"],["purchased_at","Tanggal pembelian","date"],["expires_at","Tanggal berakhir","date"],["status","Status paket","package-status"],["notes","Catatan"]]},
 invoices:{title:"Tagihan Orang Tua",table:"invoices",fields:[["student_id","Murid","select:students:id:full_name"],["package_id","Paket","select:student_packages:id:subject"],["invoice_number","Nomor tagihan","required"],["amount","Jumlah tagihan (Rp)","number"],["due_date","Jatuh tempo","date"],["status","Status","invoice-status"],["notes","Catatan"]]},
 payments:{title:"Pembayaran",table:"payments",fields:[["invoice_id","Tagihan","select:invoices:id:invoice_number"],["amount","Jumlah pembayaran (Rp)","number"],["payment_date","Tanggal pembayaran","date"],["payment_method","Metode pembayaran"],["reference","Referensi"],["notes","Catatan"]]},
 expenses:{title:"Pengeluaran",table:"expenses",fields:[["category","Kategori","required"],["description","Keterangan","required"],["amount","Jumlah (Rp)","number"],["expense_date","Tanggal","date"],["paid_to","Dibayarkan kepada"],["notes","Catatan"]]}
};
async function loadSession(){
 const {data:{session}}=await db.auth.getSession();if(!session)return;
 const {data:p,error}=await db.from("profiles").select("full_name,role").eq("user_id",session.user.id).single();
 if(error||!p){await db.auth.signOut();loginMessage("Profil belum terdaftar di tabel profiles. Minta admin memeriksanya.");return}
 currentUser=session.user;$("loginPanel").classList.add("portal-hidden");$("appPanel").classList.remove("portal-hidden");$("welcome").textContent="Halo, "+(p.full_name||session.user.email);$("roleLabel").textContent="Akses: "+p.role;
 if(p.role==="admin"){$("adminPanel").classList.remove("portal-hidden");await renderAdmin();startRealtime("admin")}
 else if(p.role==="tentor"){$("tutorPanel").classList.remove("portal-hidden");$("todayDate").textContent="Tanggal: "+new Date().toLocaleDateString("id-ID");await loadTutor(session.user.id);startRealtime("tutor")}
 else showMessage("Peran akun belum diatur sebagai admin atau tentor.",true)
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
 const {data:links,error}=await db.from("class_students").select("students(id,full_name)").eq("class_id",s.class_id);
 if(error){showMessage("Gagal memuat murid kelas: "+error.message,true);return}
 const students=(links||[]).map(x=>x.students).filter(Boolean);
 studentSelect.innerHTML="<option value=\"\">Pilih murid</option>"+students.map(x=>"<option value=\""+esc(x.id)+"\">"+esc(x.full_name)+"</option>").join("");
 studentSelect.onchange=async()=>{
  const {data:pkgs}=await db.from("student_packages").select("id,subject,package_meetings,used_meetings,status").eq("student_id",studentSelect.value).eq("status","active");
  packageSelect.innerHTML="<option value=\"\">Tanpa paket / pilih paket</option>"+(pkgs||[]).filter(p=>p.used_meetings<p.package_meetings).map(p=>"<option value=\""+esc(p.id)+"\">"+esc(p.subject)+" — sisa "+(p.package_meetings-p.used_meetings)+" dari "+p.package_meetings+"</option>").join("");
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
 const tables=["tutors","students","programs","classes","class_tutors","class_students","schedules","attendance_records","student_packages","invoices","payments","expenses"];
 realtimeChannel=db.channel("bimbelfun-live-updates");
 for(const table of tables)realtimeChannel=realtimeChannel.on("postgres_changes",{event:"*",schema:"public",table},async()=>{
  if(role==="admin"){await renderAdmin();return}
  if(table==="class_tutors"||table==="schedules"||table==="tutors"){await loadTutor(currentUser.id);return}
  if(table==="attendance_records"){await refreshTutorAttendance();await loadTutorHistory()}
 });
 realtimeChannel.subscribe();
}
async function countRows(table){const {count,error}=await db.from(table).select("*",{count:"exact",head:true});return error?"-":count}
async function renderAdmin(){
 const root=$("adminContent");
 if(currentView==="dashboard"){
  root.innerHTML='<h2>Ringkasan Data</h2><div class="admin-stats" id="stats">Memuat...</div><p class="portal-muted">Pilih menu di atas untuk mengelola data. Pastikan data awal sudah dimasukkan.</p>';
  const names=[["Tentor","tutors"],["Murid","students"],["Program","programs"],["Kelas","classes"],["Jadwal","schedules"],["Presensi","attendance_records"],["Paket","student_packages"],["Tagihan","invoices"],["Pembayaran","payments"],["Pengeluaran","expenses"]];
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
 if(currentView==="invoices"){await loadInvoicesAdmin();return}
 const cfg=configs[currentView];if(!cfg)return;
 root.innerHTML='<div class="portal-head"><div><h2>'+cfg.title+'</h2><p class="portal-muted">Tambah, ubah, dan hapus data.</p></div><button id="addRecord" class="portal-btn">+ Tambah Data</button></div><div id="recordFormWrap"></div><div style="overflow:auto"><table class="portal-table"><thead id="recordHead"></thead><tbody id="recordRows"><tr><td>Memuat...</td></tr></tbody></table></div>';
 $("addRecord").onclick=()=>openRecordForm(cfg);
 await loadRecords(cfg);
}
async function loadRecords(cfg){
 const cols=cfg.fields.map(f=>f[0]).join(",")+(cfg.table==="student_packages"?",used_meetings":"");
 let query=db.from(cfg.table).select("id,"+cols);if(!["class_tutors","class_students"].includes(cfg.table))query=query.order("created_at",{ascending:false});const {data,error}=await query.limit(250);
 const head=$("recordHead"),body=$("recordRows");
 if(error){body.innerHTML='<tr><td>'+esc(error.message)+'</td></tr>';return}
 head.innerHTML="<tr>"+cfg.fields.map(f=>"<th>"+esc(f[1])+"</th>").join("")+(cfg.table==="student_packages"?"<th>Terpakai / Sisa</th>":"")+"<th>Aksi</th></tr>";
 body.innerHTML=data.length?data.map(row=>"<tr>"+cfg.fields.map(f=>"<td>"+esc(row[f[0]])+"</td>").join("")+(cfg.table==="student_packages"?"<td>"+Number(row.used_meetings||0)+" / "+(Number(row.package_meetings)-Number(row.used_meetings||0))+"</td>":"")+'<td><button class="small-btn" data-edit="'+row.id+'">Ubah</button> <button class="small-btn danger" data-delete="'+row.id+'">Hapus</button></td></tr>').join(""):'<tr><td colspan="'+(cfg.fields.length+1)+'">Belum ada data.</td></tr>';
 body.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openRecordForm(cfg,data.find(r=>r.id===b.dataset.edit)));
 body.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Yakin ingin menghapus data ini?"))return;const {error}=await db.from(cfg.table).delete().eq("id",b.dataset.delete);if(error)alert(error.message);else await loadRecords(cfg)});
}
async function fieldControl(f,value){
 const [name,label,type]=f;let inputType=type==="date"?"date":type==="number"?"number":type==="time"?"time":"text";
 if(type==="education")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih jenjang</option>'+["PAUD","TK A","TK B",...Array.from({length:6},(_,i)=>"SD KELAS "+(i+1)),...Array.from({length:3},(_,i)=>"SMP KELAS "+(i+7)),...Array.from({length:3},(_,i)=>"SMA KELAS "+(i+10))].map(v=>'<option value="'+esc(v)+'" '+(value===v?"selected":"")+' >'+esc(v)+'</option>').join("")+'</select></label>';
 if(type==="subject")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih mata pelajaran</option>'+["Calistung","All Mapel","English Course","Mengaji","Kreativitas"].map(v=>'<option value="'+esc(v)+'" '+(value===v?"selected":"")+' >'+esc(v)+'</option>').join("")+'</select></label>';
 if(type==="package-count")return '<label>'+esc(label)+'<select name="'+name+'" required>'+[4,8,12,16].map(v=>'<option value="'+v+'" '+(Number(value||4)===v?"selected":"")+' >'+v+' pertemuan</option>').join("")+'</select></label>';
 if(type==="package-status"||type==="invoice-status")return '<label>'+esc(label)+'<select name="'+name+'">'+(type==="package-status"?["active","completed","cancelled"]:["unpaid","partial","paid"]).map(v=>'<option value="'+v+'" '+(value===v?"selected":"")+' >'+v+'</option>').join("")+'</select></label>';
 if(type==="duration")return '<label>'+esc(label)+'<select name="'+name+'" required><option value="60" '+(String(value??60)==="60"?"selected":"")+' >60 menit</option><option value="90" '+(String(value)==="90"?"selected":"")+' >90 menit</option><option value="120" '+(String(value)==="120"?"selected":"")+' >120 menit</option></select></label>';
 if(type?.startsWith("select:")){const [,table,key,textCol]=type.split(":");const {data}=await db.from(table).select(key+","+textCol).order(textCol);return '<label>'+esc(label)+'<select name="'+name+'" required><option value="">Pilih '+esc(label)+'</option>'+(data||[]).map(o=>'<option value="'+esc(o[key])+'" '+(o[key]===value?"selected":"")+'>'+esc(o[textCol])+'</option>').join("")+'</select></label>'}
 return '<label>'+esc(label)+'<input name="'+name+'" type="'+inputType+'" '+(f[2]==="required"?"required":"")+' value="'+esc(value??"")+'"></label>';
}
async function openRecordForm(cfg,row=null){
 editId=row?.id||null;const controls=await Promise.all(cfg.fields.map(f=>fieldControl(f,row?.[f[0]])));
 $("recordFormWrap").innerHTML='<form id="recordForm" class="admin-form"><h3>'+(row?"Ubah Data":"Tambah Data")+'</h3>'+controls.join("")+'<div class="portal-actions"><button class="portal-btn" type="submit">Simpan</button><button class="small-btn" type="button" id="cancelForm">Batal</button></div></form>';
 $("cancelForm").onclick=()=>{$("recordFormWrap").innerHTML=""};
 $("recordForm").onsubmit=async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target).entries());for(const k in values)if(values[k]==="")values[k]=null;for(const k in values)if(["price","amount","day_of_week","package_meetings"].includes(k)&&values[k]!==null)values[k]=Number(values[k]);if(cfg.table==="student_packages"&&values.created_by===undefined)values.created_by=currentUser.id;if(cfg.table==="invoices"&&values.created_by===undefined)values.created_by=currentUser.id;if(cfg.table==="payments"&&values.recorded_by===undefined)values.recorded_by=currentUser.id;if(cfg.table==="expenses"&&values.created_by===undefined)values.created_by=currentUser.id;const query=editId?db.from(cfg.table).update(values).eq("id",editId):db.from(cfg.table).insert(values);const {error}=await query;if(error){alert("Gagal menyimpan: "+error.message);return}editId=null;$("recordFormWrap").innerHTML="";if(cfg.table==="invoices"){await loadInvoicesAdmin()}else{await loadRecords(cfg)}};
}
async function loadInvoicesAdmin(){
 $("adminContent").innerHTML='<h2>Tagihan Orang Tua</h2><button id="addInvoice" class="portal-btn">+ Buat Tagihan</button><div id="recordFormWrap"></div><div style="overflow:auto;margin-top:16px"><table class="portal-table"><thead><tr><th>No. Tagihan</th><th>Murid</th><th>Jumlah</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="invoiceRows"><tr><td colspan="6">Memuat...</td></tr></tbody></table></div>';
 $("addInvoice").onclick=()=>openRecordForm(configs.invoices);
 const {data,error}=await db.from("invoices").select("id,invoice_number,amount,due_date,status,students(full_name,guardian_phone)").order("created_at",{ascending:false}).limit(250);
 $("invoiceRows").innerHTML=error?'<tr><td colspan="6">'+esc(error.message)+'</td></tr>':(data||[]).map(x=>'<tr><td>'+esc(x.invoice_number)+'</td><td>'+esc(x.students?.full_name||"-")+'</td><td>Rp '+Number(x.amount).toLocaleString("id-ID")+'</td><td>'+esc(x.due_date||"-")+'</td><td>'+esc(x.status)+'</td><td><button class="small-btn" data-print="'+x.id+'">Cetak / PDF</button> <button class="small-btn" data-wa="'+x.id+'">WhatsApp</button></td></tr>').join("")||'<tr><td colspan="6">Belum ada tagihan.</td></tr>';
 $("invoiceRows").querySelectorAll("[data-print]").forEach(b=>b.onclick=()=>printInvoice(data.find(x=>x.id===b.dataset.print)));
 $("invoiceRows").querySelectorAll("[data-wa]").forEach(b=>b.onclick=()=>shareInvoice(data.find(x=>x.id===b.dataset.wa)));
}
function invoiceMessage(x){
 return "Tagihan BIMBEL FUN\nNomor: "+x.invoice_number+"\nNama murid: "+(x.students?.full_name||"-")+"\nJumlah: Rp "+Number(x.amount).toLocaleString("id-ID")+"\nJatuh tempo: "+(x.due_date||"-")+"\nStatus: "+x.status+"\nTerima kasih.";
}
function printInvoice(x){
 const w=window.open("","_blank");if(!w){alert("Izinkan pop-up untuk mencetak tagihan.");return}
 w.document.write('<html><head><title>Tagihan '+esc(x.invoice_number)+'</title><style>body{font:16px Arial;padding:32px}h1{color:#168f8a}hr{margin:24px 0}</style></head><body><h1>BIMBEL FUN</h1><h2>Tagihan Pembayaran</h2><hr><p>Nomor: '+esc(x.invoice_number)+'</p><p>Murid: '+esc(x.students?.full_name||"-")+'</p><p>Jumlah: Rp '+Number(x.amount).toLocaleString("id-ID")+'</p><p>Jatuh tempo: '+esc(x.due_date||"-")+'</p><p>Status: '+esc(x.status)+'</p><p>Terima kasih.</p></body></html>');w.document.close();w.print();
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
$("adminTabs").addEventListener("click",e=>{const b=e.target.closest("button[data-view]");if(!b)return;currentView=b.dataset.view;$("adminTabs").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));renderAdmin()});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();loginMessage("Memproses...");const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){loginMessage(error.message);return}loginMessage("");await loadSession()});
$("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();location.reload()});
$("checkInBtn").addEventListener("click",async()=>{if(!tutorRecord||!selectedScheduleId)return;if(!$("tutorStudent").value){showMessage("Pilih murid yang diajar terlebih dahulu.",true);return}const {error}=await db.from("attendance_records").insert({tutor_id:tutorRecord.id,schedule_id:selectedScheduleId,attendance_date:today(),check_in:new Date().toISOString(),status:"hadir",student_id:$("tutorStudent").value||null,package_id:$("tutorPackage").value||null,subject:$("tutorSubject").value||null,teaching_address:$("teachingAddress").value.trim()||null});if(error){showMessage(error.message,true);return}showMessage("Presensi masuk tersimpan.");await refreshTutorAttendance()});
$("checkOutBtn").addEventListener("click",async()=>{if(!tutorRecord||!selectedScheduleId)return;const {error}=await db.from("attendance_records").update({check_out:new Date().toISOString()}).eq("tutor_id",tutorRecord.id).eq("schedule_id",selectedScheduleId).eq("attendance_date",today());if(error){showMessage(error.message,true);return}showMessage("Presensi pulang tersimpan.");await refreshTutorAttendance()});
db.auth.onAuthStateChange((_event,session)=>{if(!session){$("appPanel").classList.add("portal-hidden");$("loginPanel").classList.remove("portal-hidden")}});
loadSession();
