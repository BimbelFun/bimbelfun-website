/* Bimbel Fun: seven-feature workspace. Loaded after portal.js. */
(function () {
"use strict";
const byId = id => document.getElementById(id);
const money = n => "Rp " + Number(n || 0).toLocaleString("id-ID");
const monthNow = () => new Date().getFullYear() + "-" + String(new Date().getMonth()+1).padStart(2,"0");
const monthStart = m => m + "-01";
const monthEnd = m => { const d=new Date(m+"-01T12:00:00"); d.setMonth(d.getMonth()+1); d.setDate(0); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const safe = v => esc(v);
const dayLabel = n => ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][Number(n)%7] || "-";
const printWindow = (title, body) => {
 const w=window.open("","_blank"); if(!w){alert("Izinkan pop-up untuk membuka dokumen.");return;}
 w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>"+safe(title)+"</title><style>body{font:15px Arial;color:#183b39;max-width:800px;margin:30px auto;padding:20px}header{display:flex;align-items:center;gap:18px;border-bottom:3px solid #24c7bd;padding-bottom:18px}header img{max-width:100px;max-height:70px}h1,h2{color:#168f8a}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #dce9e7;text-align:left;vertical-align:top}.muted{color:#64748b}@media print{button{display:none}}</style></head><body><header><img src='assets/bimbelfun-logo.png' alt='Bimbel Fun'><div><h1>BIMBEL FUN</h1><div class='muted'>Make Learning Fun</div></div></header>"+body+"</body></html>");
 w.document.close(); w.onload=()=>w.print();
};
const btn = (label, attrs) => "<button type='button' "+(attrs||"")+" class='small-btn'>"+label+"</button>";
let popupBusy=false, tutorWorkspaceReady=false;
const baseRenderAdmin=renderAdmin;
const baseLoadTutor=loadTutor;
const baseLoadRecords=loadRecords;
const baseOpenRecordForm=openRecordForm;

function addAdminTabs(){
 const nav=byId("adminTabs"); if(!nav || nav.querySelector("[data-view='content_tasks']")) return;
 const items=[["content_tasks","🎬","Tugas Konten"],["progress_reports","📘","Perkembangan Murid"],["tutor_payroll","💰","Gaji Tentor"]];
 items.forEach(([view,icon,label])=>nav.insertAdjacentHTML("beforeend","<button data-view='"+view+"'><span class='nav-icon'>"+icon+"</span><span>"+label+"</span></button>"));
}
async function getPendingBankRequests(){
 const {data,error}=await db.from("tutor_bank_access_requests").select("id,question_id,requester_tutor_id,requested_at").eq("status","pending").order("requested_at",{ascending:true}).limit(100);
 if(error) return {data:[],error};
 const rows=data||[];
 const qids=[...new Set(rows.map(x=>x.question_id))], tids=[...new Set(rows.map(x=>x.requester_tutor_id))];
 const [q,t]=await Promise.all([
  qids.length?db.from("tutor_bank_questions").select("id,title,owner_tutor_id").in("id",qids):Promise.resolve({data:[]}),
  tids.length?db.from("tutors").select("id,full_name").in("id",tids):Promise.resolve({data:[]})
 ]);
 const owners=[...new Set((q.data||[]).map(x=>x.owner_tutor_id))];
 const o=owners.length?await db.from("tutors").select("id,full_name").in("id",owners):{data:[]};
 const qm=new Map((q.data||[]).map(x=>[x.id,x]));
 const tm=new Map([...(t.data||[]),...(o.data||[])].map(x=>[x.id,x.full_name]));
 return {data:rows.map(r=>({...r,question:qm.get(r.question_id),requester:tm.get(r.requester_tutor_id)||"Tentor",owner:tm.get(qm.get(r.question_id)?.owner_tutor_id)||"Tentor"})),error:null};
}
async function maybeShowBankRequestPopup(){
 if(popupBusy || !currentUser) return;
 const result=await getPendingBankRequests(); if(result.error || !result.data.length) return;
 const root=byId("adminContent"); if(!root) return;
 const count=result.data.length;
 if(!root.querySelector("#bfBankRequestBanner")){
  root.insertAdjacentHTML("afterbegin","<div id='bfBankRequestBanner' class='bf-notice'><strong>"+count+" permintaan akses Bank Soal menunggu pemeriksaan.</strong> <button id='bfOpenBankRequests' class='small-btn'>Periksa permintaan</button></div>");
  byId("bfOpenBankRequests").onclick=()=>showBankRequestDialog(result.data);
 }
 if(!document.getElementById("bfBankRequestDialog")) showBankRequestDialog(result.data);
}
function showBankRequestDialog(rows){
 if(!rows.length || document.getElementById("bfBankRequestDialog")) return;
 popupBusy=true;
 const html=rows.map(r=>"<article class='bf-request-row'><strong>"+safe(r.requester)+" meminta akses</strong><div>Soal: "+safe(r.question?.title||"Soal")+"</div><div class='portal-muted'>Pemilik: "+safe(r.owner)+" · "+safe(r.requested_at?.slice(0,16).replace("T"," "))+"</div><label>Catatan Admin (opsional)<input id='bf-note-"+r.id+"' type='text' placeholder='Alasan atau catatan'></label><div class='portal-actions'><button class='portal-btn' data-approve='"+r.id+"'>Setujui</button><button class='small-btn danger' data-reject='"+r.id+"'>Tolak</button></div></article>").join("");
 document.body.insertAdjacentHTML("beforeend","<div id='bfBankRequestDialog' class='bf-modal-backdrop'><section class='bf-modal'><div class='portal-head'><div><h2>Permintaan Akses Bank Soal</h2><p class='portal-muted'>Admin menentukan Tentor yang boleh melihat soal milik Tentor lain.</p></div><button id='bfCloseBankRequests' class='small-btn'>Tutup</button></div>"+html+"</section></div>");
 byId("bfCloseBankRequests").onclick=()=>{byId("bfBankRequestDialog")?.remove();popupBusy=false;};
 document.querySelectorAll("[data-approve],[data-reject]").forEach(b=>b.onclick=async()=>{
  const id=b.dataset.approve||b.dataset.reject, approve=!!b.dataset.approve;
  b.disabled=true;
  const note=byId("bf-note-"+id)?.value||null;
  const {error}=await db.rpc("bimbelfun_admin_review_bank_access_request",{p_request_id:id,p_approve:approve,p_admin_note:note});
  if(error){alert("Gagal memproses permintaan: "+error.message);b.disabled=false;return;}
  byId("bfBankRequestDialog")?.remove();popupBusy=false;await renderAdmin();
 });
}
async function renderAdminVideoTasks(){
 const root=byId("adminContent");
 root.innerHTML="<h2>Tugas Konten Video</h2><p class='portal-muted'>Buat tugas individu atau kelompok. Tugas kelompok harus berisi tepat 7 Tentor dan cukup mengumpulkan satu video.</p><div id='bfTaskFormWrap'></div><div id='bfTaskList'></div><h3>Pengumpulan dan Penilaian</h3><div id='bfSubmissionList'>Memuat...</div>";
 const {data:tutors,error}=await db.from("tutors").select("id,full_name").order("full_name");
 if(error){byId("bfTaskFormWrap").textContent=error.message;return;}
 const tutorNameMap=new Map((tutors||[]).map(t=>[t.id,t.full_name]));
 const options=(tutors||[]).map(t=>"<label class='bf-tutor-choice'><input type='checkbox' name='tutor_ids' value='"+t.id+"'> "+safe(t.full_name)+"</label>").join("");
 byId("bfTaskFormWrap").innerHTML="<form id='bfTaskForm' class='admin-form'><h3>Buat Tugas Baru</h3><label>Judul tugas<input name='title' required></label><label>Instruksi<textarea name='instructions' rows='3' required></textarea></label><label>Batas waktu<input name='due_at' type='datetime-local'></label><label>Jenis tugas<select name='assignment_type' id='bfTaskType'><option value='individual'>Individu</option><option value='group'>Kelompok (7 Tentor)</option></select></label><label id='bfGroupNameWrap' class='portal-hidden'>Nama kelompok<input name='group_name' placeholder='Contoh: Kelompok A'></label><fieldset class='bf-tutor-choices'><legend>Pilih Tentor</legend><div id='bfTaskTutors'>"+options+"</div><small class='portal-muted'>Pilih satu atau beberapa Tentor. Untuk kelompok, pilih tepat 7 orang.</small></fieldset><div class='portal-actions'><button class='portal-btn' type='submit'>Buat Tugas</button></div><p id='bfTaskMessage' class='portal-muted'></p></form>";
 byId("bfTaskType").onchange=()=>byId("bfGroupNameWrap").classList.toggle("portal-hidden",byId("bfTaskType").value!=="group");
 byId("bfTaskForm").onsubmit=async e=>{
  e.preventDefault();const fd=new FormData(e.currentTarget),ids=fd.getAll("tutor_ids");
  if(!ids.length){byId("bfTaskMessage").textContent="Pilih Tentor terlebih dahulu.";return;}
  if(fd.get("assignment_type")==="group"&&ids.length!==7){byId("bfTaskMessage").textContent="Tugas kelompok harus terdiri dari tepat 7 Tentor.";return;}
  const due=fd.get("due_at")?new Date(fd.get("due_at")).toISOString():null;
  const {data,error}=await db.rpc("bimbelfun_admin_create_video_task",{p_title:fd.get("title"),p_instructions:fd.get("instructions"),p_due_at:due,p_assignment_type:fd.get("assignment_type"),p_tutor_ids:ids,p_group_name:fd.get("group_name")||null});
  if(error){byId("bfTaskMessage").textContent="Gagal membuat tugas: "+error.message;return;}
  byId("bfTaskMessage").textContent="Tugas berhasil dibuat.";e.currentTarget.reset();byId("bfGroupNameWrap").classList.add("portal-hidden");await renderAdminVideoTasks();
 };
 const {data:tasks,error:taskError}=await db.from("tutor_video_tasks").select("id,title,instructions,due_at,assignment_type,created_at,tutor_video_task_targets(id,target_type,tutor_id,group_id,tutor_groups(group_name))").order("created_at",{ascending:false}).limit(100);
 byId("bfTaskList").innerHTML=taskError?"Gagal memuat tugas: "+safe(taskError.message):(tasks||[]).map(t=>{
  const targets=t.tutor_video_task_targets||[];
  const who=targets.map(x=>x.target_type==="group"?(x.tutor_groups?.group_name||"Kelompok"):(tutorNameMap.get(x.tutor_id)||"Tentor")).join(", ");
  return "<article class='bf-feature-card'><strong>"+safe(t.title)+"</strong><div>"+safe(t.assignment_type==="group"?"Kelompok":"Individu")+" · "+safe(who)+"</div><div class='portal-muted'>Batas waktu: "+safe(t.due_at?new Date(t.due_at).toLocaleString("id-ID"):"Tidak ditentukan")+"</div><p>"+safe(t.instructions)+"</p></article>";
 }).join("")||"<p class='portal-muted'>Belum ada tugas video.</p>";
 const {data:subs,error:subError}=await db.from("tutor_video_submissions").select("id,drive_url,submitted_at,status,score,admin_comment,tutor_video_task_targets(task_id,tutor_id,group_id,tutor_groups(group_name),tutors(full_name),tutor_video_tasks(title))").order("submitted_at",{ascending:false}).limit(200);
 byId("bfSubmissionList").innerHTML=subError?"Gagal memuat pengumpulan: "+safe(subError.message):(subs||[]).map(s=>{
  const target=s.tutor_video_task_targets||{}, name=target.tutors?.full_name||target.tutor_groups?.group_name||"Kelompok";
  return "<article class='bf-feature-card' data-submission='"+s.id+"'><strong>"+safe(target.tutor_video_tasks?.title||"Tugas Video")+"</strong><div>Tentor/Kelompok: "+safe(name)+" · "+safe(s.submitted_at?.slice(0,16).replace("T"," "))+"</div><a href='"+safe(s.drive_url)+"' target='_blank' rel='noopener'>Buka video Google Drive</a><div class='admin-form'><label>Status<select data-status><option value='submitted' "+(s.status==="submitted"?"selected":"")+">Sudah dikumpulkan</option><option value='revision' "+(s.status==="revision"?"selected":"")+">Perlu revisi</option><option value='approved' "+(s.status==="approved"?"selected":"")+">Disetujui</option></select></label><label>Nilai 0–100<input data-score type='number' min='0' max='100' value='"+(s.score??"")+"'></label><label>Komentar Admin<textarea data-comment rows='2'>"+safe(s.admin_comment||"")+"</textarea></label><button class='small-btn' data-save-review>Simpan penilaian</button></div></article>";
 }).join("")||"<p class='portal-muted'>Belum ada video yang dikumpulkan.</p>";
 byId("bfSubmissionList").querySelectorAll("[data-save-review]").forEach(b=>b.onclick=async()=>{
  const card=b.closest("[data-submission]"),id=card.dataset.submission;
  const payload={status:card.querySelector("[data-status]").value,score:card.querySelector("[data-score]").value===""?null:Number(card.querySelector("[data-score]").value),admin_comment:card.querySelector("[data-comment]").value||null};
  if(payload.score!==null&&(payload.score<0||payload.score>100)){alert("Nilai harus 0 sampai 100.");return;}
  const {error}=await db.from("tutor_video_submissions").update(payload).eq("id",id);
  if(error)alert("Gagal menyimpan penilaian: "+error.message);else alert("Penilaian berhasil disimpan.");
 });
}
async function renderAdminProgressReports(){
 const root=byId("adminContent");
 root.innerHTML="<h2>Catatan Perkembangan Murid</h2><p class='portal-muted'>Laporan yang dibuat Tentor. Admin dapat memeriksa, mencetak PDF, dan membagikan ringkasan kepada orang tua.</p><div id='bfProgressAdminList'>Memuat...</div>";
 const {data,error}=await db.from("student_progress_reports").select("id,report_date,period_start,period_end,material,strengths,improvements,notes,shared_to_parent,students(full_name,guardian_phone),tutors(full_name)").order("report_date",{ascending:false}).limit(500);
 const sortedReports=(data||[]).slice().sort((a,b)=>String(a.tutors?.full_name||"").localeCompare(String(b.tutors?.full_name||""),"id")||String(a.students?.full_name||"").localeCompare(String(b.students?.full_name||""),"id")||String(b.report_date||"").localeCompare(String(a.report_date||"")));
 byId("bfProgressAdminList").innerHTML=error?"Gagal memuat laporan: "+safe(error.message):(sortedReports).map(r=>"<article class='bf-feature-card' data-report='"+r.id+"'><strong>"+safe(r.students?.full_name||"Murid")+" · "+safe(r.tutors?.full_name||"Tentor")+"</strong><div class='portal-muted'>Tanggal: "+safe(r.report_date)+" · Periode: "+safe(r.period_start||"-")+" s.d. "+safe(r.period_end||"-")+"</div><p><b>Materi:</b> "+safe(r.material)+"</p><p><b>Kelebihan:</b> "+safe(r.strengths||"-")+"</p><p><b>Perlu ditingkatkan:</b> "+safe(r.improvements||"-")+"</p><p>"+safe(r.notes||"")+"</p><div class='portal-actions'><button class='small-btn' data-print-report>Cetak / PDF</button><button class='small-btn' data-share-report>"+(r.shared_to_parent?"Bagikan lagi":"Bagikan ke orang tua")+"</button><button class='small-btn danger' data-delete-report>Hapus</button></div></article>").join("")||"<p class='portal-muted'>Belum ada catatan perkembangan.</p>";
 byId("bfProgressAdminList").querySelectorAll("[data-report]").forEach(card=>{
  const r=data.find(x=>x.id===card.dataset.report);
  card.querySelector("[data-print-report]").onclick=()=>printProgressReport(r);
  card.querySelector("[data-share-report]").onclick=async()=>{
   const phone=normalizeWhatsAppPhone(r.students?.guardian_phone||"");
   if(!phone){alert("Nomor WhatsApp orang tua belum diisi pada data murid.");return;}
   await db.from("student_progress_reports").update({shared_to_parent:true,shared_at:new Date().toISOString()}).eq("id",r.id);
   const msg="Laporan perkembangan Bimbel Fun untuk "+(r.students?.full_name||"murid")+". Periode "+(r.period_start||"-")+" sampai "+(r.period_end||"-")+". Materi: "+r.material+". Kelebihan: "+(r.strengths||"-")+". Perlu ditingkatkan: "+(r.improvements||"-")+".";
   window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(msg),"_blank");
   await renderAdminProgressReports();
  };
  card.querySelector("[data-delete-report]").onclick=async()=>{if(!confirm("Hapus catatan perkembangan ini?"))return;const {error}=await db.from("student_progress_reports").delete().eq("id",r.id);if(error)alert(error.message);else await renderAdminProgressReports();};
 });
}
function printProgressReport(r){
 const body="<h2>Laporan Perkembangan Murid</h2><table><tr><th>Nama Murid</th><td>"+safe(r.students?.full_name||"-")+"</td></tr><tr><th>Tentor</th><td>"+safe(r.tutors?.full_name||"-")+"</td></tr><tr><th>Tanggal</th><td>"+safe(r.report_date)+"</td></tr><tr><th>Periode</th><td>"+safe(r.period_start||"-")+" s.d. "+safe(r.period_end||"-")+"</td></tr><tr><th>Materi</th><td>"+safe(r.material)+"</td></tr><tr><th>Kelebihan</th><td>"+safe(r.strengths||"-")+"</td></tr><tr><th>Perlu ditingkatkan</th><td>"+safe(r.improvements||"-")+"</td></tr><tr><th>Catatan</th><td>"+safe(r.notes||"-")+"</td></tr></table><p class='muted'>Bimbel Fun · Make Learning Fun</p>";
 printWindow("Laporan Perkembangan Murid",body);
}
async function renderAdminAttendance(){
 const root=byId("adminContent"),defaultMonth=monthNow();
 root.innerHTML="<h2>Rekap Presensi Tentor</h2><div class='bf-filter'><label>Bulan rekap<input id='bfAttendanceMonth' type='month' value='"+defaultMonth+"'></label><button id='bfReloadAttendance' class='small-btn'>Muat ulang</button></div><p class='portal-muted'>Rekap ditampilkan per Tentor. Tutup rekap setelah pemeriksaan selesai; data tetap tersimpan sebagai arsip.</p><div id='bfAttendanceSummary'>Memuat...</div><h3>Rincian Presensi</h3><div id='bfAttendanceDetails'>Memuat...</div>";
 async function load(){
  const m=byId("bfAttendanceMonth").value||defaultMonth,start=monthStart(m),end=monthEnd(m);
  const [tr,ar,cl]=await Promise.all([
   db.from("tutors").select("id,full_name").order("full_name"),
   db.from("attendance_records").select("id,tutor_id,schedule_id,attendance_date,check_in,check_out,status,subject,student_name_snapshot,class_name_snapshot,duration_minutes_snapshot,group_student_count,students(full_name),schedules(duration_minutes)").gte("attendance_date",start).lte("attendance_date",end).order("attendance_date",{ascending:false}).limit(3000),
   db.from("attendance_monthly_closures").select("tutor_id,period_start,closed_at").eq("period_start",start)
  ]);
  if(tr.error||ar.error||cl.error){byId("bfAttendanceSummary").textContent=(tr.error||ar.error||cl.error).message;return;}
  const closed=new Set((cl.data||[]).map(x=>x.tutor_id));
  const byTutor=new Map((tr.data||[]).map(t=>[t.id,[]]));
  (ar.data||[]).forEach(a=>{if(!byTutor.has(a.tutor_id))byTutor.set(a.tutor_id,[]);byTutor.get(a.tutor_id).push(a);});
  byId("bfAttendanceSummary").innerHTML="<div style='overflow:auto'><table class='portal-table'><thead><tr><th>Tentor</th><th>Jumlah Pertemuan</th><th>Status Rekap</th><th>Aksi</th></tr></thead><tbody>"+[...byTutor.entries()].map(([id,rows])=>{
   const sessions=new Set(rows.map(r=>r.attendance_date+"|"+(r.schedule_id||r.id))).size, isClosed=closed.has(id);
   return "<tr><td>"+safe((tr.data||[]).find(t=>t.id===id)?.full_name||"-")+"</td><td>"+sessions+"</td><td>"+(isClosed?"Diarsipkan":"Belum ditutup")+"</td><td>"+(isClosed?"<button class='small-btn' data-reopen='"+id+"'>Buka kembali</button>":"<button class='small-btn' data-close='"+id+"'>Tutup Rekap Bulan Ini</button>")+"</td></tr>";
  }).join("")+"</tbody></table></div>";
  const tutorNameById=new Map((tr.data||[]).map(t=>[t.id,t.full_name]));
  const attendanceRowsSorted=(ar.data||[]).slice().sort((a,b)=>String(tutorNameById.get(a.tutor_id)||"").localeCompare(String(tutorNameById.get(b.tutor_id)||""),"id")||String(a.student_name_snapshot||a.students?.full_name||"").localeCompare(String(b.student_name_snapshot||b.students?.full_name||""),"id")||String(a.attendance_date).localeCompare(String(b.attendance_date)));
  byId("bfAttendanceDetails").innerHTML=attendanceRowsSorted.length?"<div style='overflow:auto'><table class='portal-table'><thead><tr><th>Tanggal</th><th>Tentor</th><th>Murid</th><th>Kelas</th><th>Mapel</th><th>Masuk</th><th>Pulang</th><th>Kelompok</th><th>Aksi</th></tr></thead><tbody>"+attendanceRowsSorted.map(r=>{
   const isClosed=closed.has(r.tutor_id);
   return "<tr><td>"+safe(r.attendance_date)+"</td><td>"+safe((tr.data||[]).find(t=>t.id===r.tutor_id)?.full_name||"-")+"</td><td>"+safe(r.student_name_snapshot||r.students?.full_name||"-")+"</td><td>"+safe(r.class_name_snapshot||"-")+"</td><td>"+safe(r.subject||"-")+"</td><td>"+safe(r.check_in?new Date(r.check_in).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):"-")+"</td><td>"+safe(r.check_out?new Date(r.check_out).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):"-")+"</td><td>"+safe(r.group_student_count||"-")+"</td><td><button class='small-btn danger' data-att-delete='"+r.id+"' "+(isClosed?"disabled":"")+">Hapus</button></td></tr>";
  }).join("")+"</tbody></table></div>":"<p class='portal-muted'>Belum ada presensi pada periode ini.</p>";
  byId("bfAttendanceSummary").querySelectorAll("[data-close]").forEach(b=>b.onclick=async()=>{const {error}=await db.rpc("bimbelfun_admin_close_attendance_month",{p_tutor_id:b.dataset.close,p_period_start:start});if(error)alert("Gagal menutup rekap: "+error.message);else await load();});
  byId("bfAttendanceSummary").querySelectorAll("[data-reopen]").forEach(b=>b.onclick=async()=>{if(!confirm("Buka kembali arsip presensi Tentor ini?"))return;const {error}=await db.rpc("bimbelfun_admin_reopen_attendance_month",{p_tutor_id:b.dataset.reopen,p_period_start:start});if(error)alert(error.message);else await load();});
  byId("bfAttendanceDetails").querySelectorAll("[data-att-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Hapus catatan presensi ini? Data kelas dan murid tidak akan dihapus."))return;const {error}=await db.from("attendance_records").delete().eq("id",b.dataset.attDelete);if(error)alert("Gagal menghapus presensi: "+error.message);else await load();});
 }
 byId("bfAttendanceMonth").onchange=load;byId("bfReloadAttendance").onclick=load;await load();
}
async function renderAdminPayroll(){
 const root=byId("adminContent"),m=monthNow();
 root.innerHTML="<h2>Invoice Gaji Tentor</h2><p class='portal-muted'>Gaji dihitung dari jumlah sesi presensi selesai × tarif per sesi, lalu Admin dapat menambah atau mengurangi penyesuaian.</p><div class='bf-filter'><label>Bulan penggajian<input id='bfPayrollMonth' type='month' value='"+m+"'></label><button id='bfPayrollReload' class='small-btn'>Muat ulang</button></div><div id='bfPayrollRows'>Memuat...</div>";
 async function load(){
  const month=byId("bfPayrollMonth").value||m,start=monthStart(month),end=monthEnd(month);
  const [t,p,c,a]=await Promise.all([
   db.from("tutors").select("id,full_name").order("full_name"),
   db.from("tutor_payrolls").select("*").eq("period_start",start),
   db.from("attendance_monthly_closures").select("tutor_id").eq("period_start",start),
   db.from("attendance_records").select("tutor_id,attendance_date,schedule_id,id,check_in,check_out").gte("attendance_date",start).lte("attendance_date",end).not("check_in","is",null).not("check_out","is",null).limit(3000)
  ]);
  if(t.error||p.error||c.error||a.error){byId("bfPayrollRows").textContent=(t.error||p.error||c.error||a.error).message;return;}
  const payrolls=new Map((p.data||[]).map(x=>[x.tutor_id,x])),closed=new Set((c.data||[]).map(x=>x.tutor_id)),counts=new Map();
  (a.data||[]).forEach(x=>{if(!counts.has(x.tutor_id))counts.set(x.tutor_id,new Set());counts.get(x.tutor_id).add(x.attendance_date+"|"+(x.schedule_id||x.id));});
  byId("bfPayrollRows").innerHTML="<div style='overflow:auto'><table class='portal-table'><thead><tr><th>Tentor</th><th>Sesi</th><th>Tarif / sesi</th><th>Penyesuaian (+/-)</th><th>Catatan</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>"+(t.data||[]).map(x=>{
   const p=payrolls.get(x.id),n=counts.get(x.id)?.size||0,base=n*Number(p?.rate_per_session||0),adj=Number(p?.adjustment_amount||0);
   return "<tr data-payroll-tutor='"+x.id+"'><td>"+safe(x.full_name)+"</td><td>"+(p?.session_count??n)+"</td><td><input data-rate type='number' min='0' value='"+(p?.rate_per_session??"")+"' placeholder='Tarif Rp' "+(p?.status==="paid"?"disabled":"")+"></td><td><input data-adjust type='number' value='"+(p?.adjustment_amount??0)+"' "+(p?.status==="paid"?"disabled":"")+"></td><td><input data-note value='"+safe(p?.adjustment_note||"")+"' placeholder='Catatan' "+(p?.status==="paid"?"disabled":"")+"></td><td>"+money(p?.net_amount??(base+adj))+"</td><td>"+(p?.status==="paid"?"Sudah dibayar":p?"Belum dibayar":closed.has(x.id)?"Belum dibuat":"Rekap belum ditutup")+"</td><td><button class='small-btn' data-generate "+(!closed.has(x.id)||p?.status==="paid"?"disabled":"")+">Hitung / Buat Invoice</button> "+(p?"<button class='small-btn' data-payroll-print>Cetak PDF</button> "+(p.status!=="paid"?"<button class='small-btn' data-mark-paid>Tandai dibayar</button>":""):"")+"</td></tr>";
  }).join("")+"</tbody></table></div>";
  byId("bfPayrollRows").querySelectorAll("[data-payroll-tutor]").forEach(row=>{
   const id=row.dataset.payrollTutor,p=payrolls.get(id);
   row.querySelector("[data-generate]")?.addEventListener("click",async()=>{
    const rate=Number(row.querySelector("[data-rate]").value),adjust=Number(row.querySelector("[data-adjust]").value||0),note=row.querySelector("[data-note]").value||null;
    if(!Number.isFinite(rate)||rate<0){alert("Isi tarif per pertemuan yang valid.");return;}
    const {error}=await db.rpc("bimbelfun_admin_generate_tutor_payroll",{p_tutor_id:id,p_period_start:start,p_rate_per_session:rate,p_adjustment_amount:adjust,p_adjustment_note:note});
    if(error)alert("Gagal membuat invoice gaji: "+error.message);else await load();
   });
   row.querySelector("[data-mark-paid]")?.addEventListener("click",async()=>{if(!confirm("Tandai invoice gaji ini sudah dibayar?"))return;const {error}=await db.from("tutor_payrolls").update({status:"paid",paid_at:new Date().toISOString()}).eq("id",p.id);if(error)alert(error.message);else await load();});
   row.querySelector("[data-payroll-print]")?.addEventListener("click",()=>printPayroll({...p,tutor_name:t.data?.find(tutor=>tutor.id===id)?.full_name||"Tentor"}));
  });
 }
 byId("bfPayrollMonth").onchange=load;byId("bfPayrollReload").onclick=load;await load();
}
function printPayroll(p){
 const body="<h2>Invoice Gaji Tentor</h2><table><tr><th>Nomor Invoice</th><td>"+safe(p.invoice_number||"-")+"</td></tr><tr><th>Tentor</th><td>"+safe(p.tutor_name||"Bimbel Fun")+"</td></tr><tr><th>Periode</th><td>"+safe(p.period_start)+" s.d. "+safe(p.period_end)+"</td></tr><tr><th>Jumlah sesi</th><td>"+p.session_count+"</td></tr><tr><th>Tarif per sesi</th><td>"+money(p.rate_per_session)+"</td></tr><tr><th>Subtotal</th><td>"+money(p.base_amount)+"</td></tr><tr><th>Penyesuaian</th><td>"+money(p.adjustment_amount)+"</td></tr><tr><th>Total gaji</th><td><b>"+money(p.net_amount)+"</b></td></tr><tr><th>Status</th><td>"+safe(p.status)+"</td></tr></table><p class='muted'>Bimbel Fun · Make Learning Fun</p>";
 printWindow("Invoice Gaji Tentor",body);
}
async function renderTutorVideoTasks(){
 const root=byId("bfTutorVideoSection");if(!root)return;
 root.innerHTML="<h2>Tugas Konten Video</h2><p class='portal-muted'>Tugas individu dan kelompok dari Admin. Tugas kelompok hanya membutuhkan satu pengumpulan untuk seluruh anggota.</p><div id='bfTutorTasks'>Memuat...</div>";
 const {data,error}=await db.from("tutor_video_tasks").select("id,title,instructions,due_at,assignment_type,tutor_video_task_targets(id,target_type,tutor_id,group_id,tutor_groups(group_name),tutor_video_submissions(id,drive_url,status,admin_comment,score,submitted_at))").order("created_at",{ascending:false}).limit(100);
 if(error){byId("bfTutorTasks").textContent=error.message;return;}
 const targets=(data||[]).flatMap(t=>(t.tutor_video_task_targets||[]).map(x=>({task:t,target:x,submission:x.tutor_video_submissions?.[0]||null})));
 byId("bfTutorTasks").innerHTML=targets.map(({task,target,submission})=>{
  const group=target.target_type==="group";
  const statusHtml=submission
   ? "<p>Status: <b>"+safe(submission.status)+"</b>"+(submission.score!==null?" · Nilai: "+submission.score:"")+"</p>"+(submission.admin_comment?"<p>Catatan Admin: "+safe(submission.admin_comment)+"</p>":"")+(submission.drive_url?"<a href='"+safe(submission.drive_url)+"' target='_blank' rel='noopener'>Lihat video yang dikumpulkan</a>":"")
   : "<p class='portal-muted'>Belum dikumpulkan.</p>";
  const formHtml=(!submission||submission.status==="revision")
   ? "<form class='bf-submit-video'><label>Tautan Google Drive<input name='drive_url' type='url' required placeholder='https://drive.google.com/...' value='"+safe(submission?.drive_url||"")+"'></label><button class='small-btn' type='submit'>"+(submission?"Kirim revisi":"Kumpulkan video")+"</button></form>"
   : "";
  return "<article class='bf-feature-card' data-target='"+target.id+"'><strong>"+safe(task.title)+"</strong><div class='portal-muted'>"+(group?"Kelompok: "+safe(target.tutor_groups?.group_name||"Kelompok"):"Tugas individu")+" · Tenggat: "+safe(task.due_at?new Date(task.due_at).toLocaleString("id-ID"):"Tidak ditentukan")+"</div><p>"+safe(task.instructions)+"</p>"+statusHtml+formHtml+"</article>";
 }).join("")||"<p class='portal-muted'>Belum ada tugas video untuk Anda.</p>";
 byId("bfTutorTasks").querySelectorAll("[data-target]").forEach(card=>{
  card.querySelector("form")?.addEventListener("submit",async e=>{
   e.preventDefault();const url=new FormData(e.currentTarget).get("drive_url");
   if(!/^https:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(url)){alert("Gunakan tautan Google Drive yang valid.");return;}
   const targetId=card.dataset.target,existing=targets.find(x=>x.target.id===targetId)?.submission;
   const payload={target_id:targetId,drive_url:url,submitted_by:currentUser.id,submitted_at:new Date().toISOString(),status:"submitted"};
   const result=existing?await db.from("tutor_video_submissions").update({drive_url:url,submitted_by:currentUser.id,submitted_at:new Date().toISOString(),status:"submitted"}).eq("id",existing.id):await db.from("tutor_video_submissions").insert(payload);
   if(result.error)alert("Gagal mengirim video: "+result.error.message);else await renderTutorVideoTasks();
  });
 });
}
async function renderTutorProgressReports(){
 const root=byId("bfTutorProgressSection");if(!root)return;
 const {data:students,error}=await db.from("students").select("id,full_name").order("full_name");
 if(error){root.textContent=error.message;return;}
 root.innerHTML="<h2>Catatan Perkembangan Murid</h2><form id='bfTutorProgressForm' class='admin-form'><label>Murid<select name='student_id' required><option value=''>Pilih murid</option>"+(students||[]).map(s=>"<option value='"+s.id+"'>"+safe(s.full_name)+"</option>").join("")+"</select></label><label>Tanggal laporan<input name='report_date' type='date' value='"+new Date().toISOString().slice(0,10)+"' required></label><div class='form-grid'><label>Periode mulai<input name='period_start' type='date'></label><label>Periode selesai<input name='period_end' type='date'></label></div><label>Materi yang dipelajari<textarea name='material' required rows='3'></textarea></label><label>Kelebihan / perkembangan<textarea name='strengths' rows='2'></textarea></label><label>Hal yang perlu ditingkatkan<textarea name='improvements' rows='2'></textarea></label><label>Catatan tambahan<textarea name='notes' rows='2'></textarea></label><button class='portal-btn' type='submit'>Simpan Catatan</button><p id='bfTutorProgressMessage' class='portal-muted'></p></form><h3>Catatan Saya</h3><div id='bfTutorProgressList'>Memuat...</div>";
 byId("bfTutorProgressForm").onsubmit=async e=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);
  const payload={student_id:fd.get("student_id"),tutor_id:tutorRecord.id,report_date:fd.get("report_date"),period_start:fd.get("period_start")||null,period_end:fd.get("period_end")||null,material:fd.get("material"),strengths:fd.get("strengths")||null,improvements:fd.get("improvements")||null,notes:fd.get("notes")||null};
  const {error}=await db.from("student_progress_reports").insert(payload);
  byId("bfTutorProgressMessage").textContent=error?"Gagal menyimpan: "+error.message:"Catatan perkembangan berhasil disimpan.";
  if(!error){e.currentTarget.reset();await load();}
 };
 async function load(){
  const {data,error}=await db.from("student_progress_reports").select("id,report_date,period_start,period_end,material,strengths,improvements,notes,students(full_name)").eq("tutor_id",tutorRecord.id).order("report_date",{ascending:false}).limit(100);
  byId("bfTutorProgressList").innerHTML=error?safe(error.message):(data||[]).map(r=>"<article class='bf-feature-card'><strong>"+safe(r.students?.full_name||"Murid")+"</strong><div class='portal-muted'>"+safe(r.report_date)+" · "+safe(r.period_start||"-")+" s.d. "+safe(r.period_end||"-")+"</div><p><b>Materi:</b> "+safe(r.material)+"</p><p><b>Kelebihan:</b> "+safe(r.strengths||"-")+"</p><p><b>Perlu ditingkatkan:</b> "+safe(r.improvements||"-")+"</p><p>"+safe(r.notes||"")+"</p></article>").join("")||"<p class='portal-muted'>Belum ada catatan.</p>";
 }
 await load();
}
async function renderTutorPayroll(){
 const root=byId("bfTutorPayrollSection");
 const {data,error}=await db.from("tutor_payrolls").select("*").eq("tutor_id",tutorRecord.id).order("period_start",{ascending:false});
 root.innerHTML="<h2>Gaji Saya</h2><p class='portal-muted'>Invoice gaji bulanan dan status pembayarannya.</p>"+(error?"<p>"+safe(error.message)+"</p>":(data||[]).map(p=>"<article class='bf-feature-card'><strong>"+safe(p.invoice_number||"-")+"</strong><div>"+safe(p.period_start)+" s.d. "+safe(p.period_end)+"</div><div>Jumlah sesi: "+p.session_count+"</div><div>Tarif per sesi: "+money(p.rate_per_session)+"</div><div>Subtotal: "+money(p.base_amount)+"</div><div>Penyesuaian: "+money(p.adjustment_amount)+"</div><h3>Total: "+money(p.net_amount)+"</h3><p>Status: <b>"+(p.status==="paid"?"Sudah dibayar":"Belum dibayar")+"</b></p><button class='small-btn' data-payroll-print='"+p.id+"'>Cetak / PDF</button></article>").join("")||"<p class='portal-muted'>Belum ada invoice gaji.</p>");
 root.querySelectorAll("[data-payroll-print]").forEach(b=>b.onclick=()=>printPayroll({...data.find(x=>x.id===b.dataset.payrollPrint),tutor_name:tutorRecord.full_name}));
}
async function renderTutorBankQuestions(){
 const section=byId("learningResources");if(!section)return;
 let host=byId("bfTutorBankWorkspace");
 if(!host){host=document.createElement("div");host.id="bfTutorBankWorkspace";host.className="bf-feature-card";section.insertBefore(host,section.firstChild);}
 host.innerHTML="<h2>Bank Soal Tentor</h2><p class='portal-muted'>Soal yang Anda buat langsung tersimpan. Tentor lain harus meminta izin Admin untuk melihat isi soal.</p><form id='bfBankQuestionForm' class='admin-form'><h3>Tambah Soal</h3><label>Judul soal<input name='title' required></label><div class='form-grid'><label>Jenjang<input name='education_level' placeholder='SD / SMP / SMA'></label><label>Kelas<input name='grade' placeholder='Kelas 5'></label></div><div class='form-grid'><label>Mata pelajaran<input name='subject' required></label><label>Topik<input name='topic'></label></div><label>Jenis soal<select name='question_type'><option value='essay'>Uraian</option><option value='multiple_choice'>Pilihan ganda</option></select></label><label>Pertanyaan<textarea name='question_text' rows='3' required></textarea></label><label>Pilihan jawaban (satu per baris, khusus pilihan ganda)<textarea name='options' rows='4' placeholder='A. ...&#10;B. ...&#10;C. ...'></textarea></label><label>Jawaban benar<textarea name='correct_answer' rows='2'></textarea></label><label>Pembahasan<textarea name='explanation' rows='2'></textarea></label><button class='portal-btn' type='submit' id='bfBankQuestionSubmit'>Simpan Soal</button><p id='bfBankQuestionMessage' class='portal-muted'></p></form><h3>Daftar Bank Soal</h3><div id='bfBankQuestionList'>Memuat...</div><div id='bfBankQuestionDetail'></div>";
 let editingQuestionId=null;
 byId("bfBankQuestionForm").onsubmit=async e=>{
  e.preventDefault();const fd=new FormData(e.currentTarget),type=fd.get("question_type");
  const opts=type==="multiple_choice"?String(fd.get("options")||"").split("\n").map(x=>x.trim()).filter(Boolean):[];
  const payload={owner_tutor_id:tutorRecord.id,title:fd.get("title"),education_level:fd.get("education_level")||null,grade:fd.get("grade")||null,subject:fd.get("subject"),topic:fd.get("topic")||null,question_type:type,question_text:fd.get("question_text"),options:opts,correct_answer:fd.get("correct_answer")||null,explanation:fd.get("explanation")||null};
  const result=editingQuestionId?await db.from("tutor_bank_questions").update(payload).eq("id",editingQuestionId):await db.from("tutor_bank_questions").insert(payload);
  byId("bfBankQuestionMessage").textContent=result.error?"Gagal menyimpan soal: "+result.error.message:(editingQuestionId?"Perubahan soal berhasil disimpan.":"Soal berhasil ditambahkan ke Bank Soal Anda.");
  if(!result.error){editingQuestionId=null;e.currentTarget.reset();byId("bfBankQuestionSubmit").textContent="Simpan Soal";await load();}
 };
 async function load(){
  const [catalog,grants,requests,tutors]=await Promise.all([
   db.from("tutor_bank_question_catalog").select("*").order("created_at",{ascending:false}).limit(500),
   db.from("tutor_bank_access_grants").select("question_id").eq("tutor_id",tutorRecord.id),
   db.from("tutor_bank_access_requests").select("question_id,status,requested_at").eq("requester_tutor_id",tutorRecord.id).order("requested_at",{ascending:false}),
   db.from("tutors").select("id,full_name")
  ]);
  if(catalog.error){byId("bfBankQuestionList").textContent=catalog.error.message;return;}
  const grantSet=new Set((grants.data||[]).map(x=>x.question_id)),reqMap=new Map();
  (requests.data||[]).forEach(x=>{if(!reqMap.has(x.question_id))reqMap.set(x.question_id,x);});
  const tutorMap=new Map((tutors.data||[]).map(x=>[x.id,x.full_name]));
  byId("bfBankQuestionList").innerHTML=(catalog.data||[]).map(q=>{
   const own=q.owner_tutor_id===tutorRecord.id,granted=grantSet.has(q.id),req=reqMap.get(q.id);
   const action=own||granted?"<button class='small-btn' data-view-question='"+q.id+"'>Lihat soal</button>":req?.status==="pending"?"<span class='portal-muted'>Menunggu persetujuan Admin</span>":"<button class='small-btn' data-request-question='"+q.id+"'>"+(req?.status==="rejected"?"Ajukan akses lagi":"Minta akses")+"</button>";
   return "<article class='bf-feature-card'><strong>"+safe(q.title)+"</strong><div>"+safe(q.subject)+" · "+safe(q.grade||q.education_level||"-")+" · Pemilik: "+safe(tutorMap.get(q.owner_tutor_id)||"Tentor")+"</div><div class='portal-actions'>"+action+(own?" <button class='small-btn' data-edit-question='"+q.id+"'>Ubah</button> <button class='small-btn danger' data-delete-question='"+q.id+"'>Hapus</button>":"")+"</div></article>";
  }).join("")||"<p class='portal-muted'>Belum ada soal.</p>";
  byId("bfBankQuestionList").querySelectorAll("[data-view-question]").forEach(b=>b.onclick=async()=>{
   const {data,error}=await db.from("tutor_bank_questions").select("*").eq("id",b.dataset.viewQuestion).single();
   if(error){alert("Akses belum disetujui atau soal tidak ditemukan: "+error.message);return;}
   const detail=byId("bfBankQuestionDetail");
   detail.innerHTML="<article class='bf-feature-card'><h3>"+safe(data.title)+"</h3><div>"+safe(data.subject)+" · "+safe(data.grade||"-")+"</div><p>"+safe(data.question_text)+"</p>"+(data.options||[]).map(x=>"<div>"+safe(x)+"</div>").join("")+"<p><b>Jawaban:</b> "+safe(data.correct_answer||"-")+"</p><p><b>Pembahasan:</b> "+safe(data.explanation||"-")+"</p></article>";
  });
  byId("bfBankQuestionList").querySelectorAll("[data-request-question]").forEach(b=>b.onclick=async()=>{
   const {error}=await db.from("tutor_bank_access_requests").insert({question_id:b.dataset.requestQuestion,requester_tutor_id:tutorRecord.id});
   if(error)alert("Gagal mengajukan akses: "+error.message);else await load();
  });
  byId("bfBankQuestionList").querySelectorAll("[data-edit-question]").forEach(b=>b.onclick=async()=>{
   const {data,error}=await db.from("tutor_bank_questions").select("*").eq("id",b.dataset.editQuestion).single();
   if(error){alert(error.message);return;}
   const form=byId("bfBankQuestionForm");
   ["title","education_level","grade","subject","topic","question_type","question_text","correct_answer","explanation"].forEach(k=>form.elements[k].value=data[k]??"");
   form.elements.options.value=(data.options||[]).join("\n");
   editingQuestionId=data.id;byId("bfBankQuestionSubmit").textContent="Simpan Perubahan";
   form.scrollIntoView({behavior:"smooth",block:"start"});
  });
  byId("bfBankQuestionList").querySelectorAll("[data-delete-question]").forEach(b=>b.onclick=async()=>{
   if(!confirm("Hapus soal yang Anda buat?"))return;
   const {error}=await db.from("tutor_bank_questions").delete().eq("id",b.dataset.deleteQuestion);
   if(error)alert(error.message);else await load();
  });
 }
 await load();
}
function setupTutorWorkspace(){
 const panel=byId("tutorPanel");if(!panel)return;
 let nav=byId("bfTutorNav");
 if(!nav){
  nav=document.createElement("nav");nav.id="bfTutorNav";nav.className="bf-tutor-nav";
  nav.innerHTML="<button data-tutor-view='murid' class='active'>Murid</button><button data-tutor-view='jadwal'>Jadwal</button><button data-tutor-view='video'>Video</button><button data-tutor-view='bank'>Bank Soal</button><button data-tutor-view='progress'>Catatan Murid</button><button data-tutor-view='payroll'>Gaji Saya</button>";
  panel.insertBefore(nav,panel.firstChild);
 }
 const summary=byId("tutorAssignmentsSummary"),today=byId("todayDate"),history=byId("tutorAttendanceHistory"),resources=byId("learningResources");
 if(summary){summary.dataset.bfSection="murid";if(summary.previousElementSibling)summary.previousElementSibling.dataset.bfSection="murid";}
 if(today){today.dataset.bfSection="jadwal";if(today.previousElementSibling)today.previousElementSibling.dataset.bfSection="jadwal";if(today.nextElementSibling)today.nextElementSibling.dataset.bfSection="jadwal";}
 const form=panel.querySelector(".admin-form");if(form)form.dataset.bfSection="jadwal";
 ["checkInBtn","checkOutBtn","attendanceState"].forEach(id=>{const el=byId(id);if(el){(id==="attendanceState"?el:el.parentElement).dataset.bfSection="jadwal";}});
 if(history){history.dataset.bfSection="jadwal";if(history.parentElement)history.parentElement.dataset.bfSection="jadwal";if(history.parentElement?.previousElementSibling)history.parentElement.previousElementSibling.dataset.bfSection="jadwal";}
 if(resources)resources.dataset.bfSection="bank";
 const ensure=(id,title,section)=>{let el=byId(id);if(!el){el=document.createElement("section");el.id=id;el.className="portal-panel";el.dataset.bfSection=section;el.innerHTML="<h2>"+title+"</h2>";panel.appendChild(el);}return el;};
 ensure("bfTutorVideoSection","Tugas Konten Video","video");
 ensure("bfTutorProgressSection","Catatan Perkembangan Murid","progress");
 ensure("bfTutorPayrollSection","Gaji Saya","payroll");
 const show=view=>{
  panel.querySelectorAll("[data-bf-section]").forEach(el=>el.style.display=el.dataset.bfSection===view?"":"none");
  nav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.tutorView===view));
  if(view==="video")renderTutorVideoTasks();
  if(view==="progress")renderTutorProgressReports();
  if(view==="payroll")renderTutorPayroll();
  if(view==="bank")renderTutorBankQuestions();
 };
 nav.querySelectorAll("button").forEach(b=>b.onclick=()=>show(b.dataset.tutorView));
 if(!tutorWorkspaceReady){tutorWorkspaceReady=true;show("murid");}else show("murid");
}
loadTutor=async function(uid){await baseLoadTutor(uid);setupTutorWorkspace();};
async function loadAdminClasses(cfg){
 const {data,error}=await db.from("classes").select("id,class_name,student_id,subject,class_grade,class_day,has_group_learning,students(full_name,address),class_students(student_id,status,students(full_name)),schedules(id,day_of_week,subject,duration_minutes,is_active),class_tutors(tutor_id,is_active,tutors(full_name))").limit(1000);
 const head=byId("recordHead"),body=byId("recordRows");if(error){body.innerHTML="<tr><td>"+safe(error.message)+"</td></tr>";return;}
 head.innerHTML="<tr><th>Tentor</th><th>Murid</th><th>Hari</th><th>Mapel</th><th>Kelas</th><th>Kelompok belajar</th><th>Durasi</th><th>Alamat murid</th><th>Aksi</th></tr>";
 const rows=[];
 (data||[]).forEach(c=>{
  const tutor=(c.class_tutors||[]).filter(x=>x.is_active!==false).map(x=>x.tutors?.full_name).filter(Boolean).sort((a,b)=>a.localeCompare(b,"id")).join(", ")||"-";
  const active=(c.schedules||[]).filter(s=>s.is_active!==false);
  const memberNames=(c.class_students||[]).filter(z=>!["inactive","nonaktif","removed"].includes(String(z.status||"active").toLowerCase())).map(z=>z.students?.full_name).filter(Boolean).sort((a,b)=>a.localeCompare(b,"id"));
  const student=memberNames.length?memberNames.join(", "):(c.students?.full_name||c.class_name||"-");
  (active.length?active:[null]).forEach(s=>rows.push({c,s,tutor,student}));
 });
 rows.sort((a,b)=>a.tutor.localeCompare(b.tutor,"id")||a.student.localeCompare(b.student,"id")||Number(a.s?.day_of_week||0)-Number(b.s?.day_of_week||0));
 body.innerHTML=rows.map(({c,s,tutor,student})=>"<tr><td>"+safe(tutor)+"</td><td>"+safe(student)+"</td><td>"+(s?safe(dayLabel(s.day_of_week)):"-")+"</td><td>"+safe(s?.subject||c.subject||"-")+"</td><td>"+safe(c.class_grade||"-")+"</td><td>"+(c.has_group_learning?"Ada":"Tidak ada")+"</td><td>"+(s?s.duration_minutes+" menit":"-")+"</td><td>"+safe(c.students?.address||"-")+"</td><td><button class='small-btn' data-class-edit='"+c.id+"'>Ubah</button> "+(s?"<button class='small-btn danger' data-schedule-delete='"+s.id+"'>Hapus jadwal</button>":"")+"</td></tr>").join("")||"<tr><td colspan='9'>Belum ada jadwal.</td></tr>";
 body.querySelectorAll("[data-class-edit]").forEach(b=>b.onclick=()=>baseOpenRecordForm(cfg,(data||[]).find(c=>c.id===b.dataset.classEdit)));
 body.querySelectorAll("[data-schedule-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Nonaktifkan jadwal ini? Riwayat presensi tetap disimpan."))return;const {error}=await db.from("schedules").update({is_active:false}).eq("id",b.dataset.scheduleDelete);if(error)alert("Gagal menghapus jadwal: "+error.message);else await loadAdminClasses(cfg);});
}
async function getTutorStudentsAndClasses(tutorId){
 const [direct,assigned]=await Promise.all([
  db.from("tutor_students").select("student_id,students(id,full_name)").eq("tutor_id",tutorId),
  db.from("class_tutors").select("classes(id,class_name,student_id,subject,has_group_learning,students(id,full_name),class_students(student_id,status,students(id,full_name)))").eq("tutor_id",tutorId).eq("is_active",true)
 ]);
 const students=new Map(),classes=[];
 (direct.data||[]).forEach(x=>{if(x.students?.id)students.set(x.students.id,x.students);});
 (assigned.data||[]).forEach(x=>{
  const c=x.classes;if(!c)return;classes.push(c);
  if(c.students?.id)students.set(c.students.id,c.students);
  (c.class_students||[]).filter(z=>!["inactive","nonaktif","removed"].includes(String(z.status||"active").toLowerCase())).forEach(z=>{if(z.students?.id)students.set(z.students.id,z.students);});
 });
 return {students:[...students.values()].sort((a,b)=>a.full_name.localeCompare(b.full_name,"id")),classes};
}
async function openStudentPackageForm(cfg,row){
 const wrap=byId("recordFormWrap");editId=row?.id||null;
 const {data:tutors,error}=await db.from("tutors").select("id,full_name").order("full_name");
 if(error){alert(error.message);return;}
 wrap.innerHTML="<form id='bfPackageForm' class='admin-form'><h3>"+(row?"Ubah Paket Pertemuan":"Tambah Paket Pertemuan")+"</h3><label>Tentor<select name='tutor_id' id='bfPackageTutor' required><option value=''>Pilih Tentor</option>"+(tutors||[]).map(t=>"<option value='"+t.id+"' "+(row?.tutor_id===t.id?"selected":"")+">"+safe(t.full_name)+"</option>").join("")+"</select></label><label>Murid<select name='student_id' id='bfPackageStudent' required disabled><option value=''>Pilih Tentor dahulu</option></select></label><label>Kelas / Jadwal<select name='class_id' id='bfPackageClass' disabled><option value=''>Tidak dikaitkan ke kelas</option></select></label><p id='bfPackageGroupHint' class='portal-muted'>Pilih Tentor, Murid, dan kelas untuk menentukan aturan paket.</p><label>Mata pelajaran<select name='subject' id='bfPackageSubject' required><option value=''>Pilih mata pelajaran</option>"+["Calistung","All Mapel","English Course","Mengaji","Kreativitas"].map(v=>"<option>"+v+"</option>").join("")+"</select></label><label>Jumlah pertemuan<select name='package_meetings' required>"+[4,8,12,16].map(v=>"<option value='"+v+"' "+(Number(row?.package_meetings||4)===v?"selected":"")+">"+v+" pertemuan</option>").join("")+"</select></label><label>Harga paket (Rp)<input name='price' type='number' min='0' step='1' value='"+(row?.price??"")+"'></label><label>Tanggal pembayaran<input name='purchased_at' type='date' value='"+safe(row?.purchased_at||"")+"'></label><label>Tanggal berakhir (opsional)<input name='expires_at' type='date' value='"+safe(row?.expires_at||"")+"'></label><label>Status<select name='status'><option value='active' "+(row?.status==="active"?"selected":"")+">Aktif</option><option value='completed' "+(row?.status==="completed"?"selected":"")+">Selesai</option><option value='cancelled' "+(row?.status==="cancelled"?"selected":"")+">Dibatalkan</option></select></label><label>Catatan<textarea name='notes' rows='2'>"+safe(row?.notes||"")+"</textarea></label><div class='portal-actions'><button class='portal-btn' type='submit'>Simpan Paket</button><button class='small-btn' type='button' id='bfPackageCancel'>Batal</button></div><p id='bfPackageMessage' class='portal-muted'></p></form>";
 const form=byId("bfPackageForm"),tutorSel=byId("bfPackageTutor"),studentSel=byId("bfPackageStudent"),classSel=byId("bfPackageClass"),subjectSel=byId("bfPackageSubject");
 let assigned={students:[],classes:[]};
 const classForStudent=studentId=>assigned.classes.filter(c=>c.student_id===studentId||(c.class_students||[]).some(z=>z.student_id===studentId&&!["inactive","nonaktif","removed"].includes(String(z.status||"active").toLowerCase())));
 const updateGroup=()=>{
  const c=assigned.classes.find(x=>x.id===classSel.value),group=!!c?.has_group_learning;
  const price=form.elements.price,date=form.elements.purchased_at;
  price.required=!group;date.required=!group;
  byId("bfPackageGroupHint").textContent=group?"Kelompok belajar: Ada. Harga dan tanggal pembayaran boleh dikosongkan.":"Jadwal biasa: harga dan tanggal pembayaran wajib diisi.";
  if(c?.subject)subjectSel.value=c.subject;
 };
 const loadClasses=()=>{
  const list=classForStudent(studentSel.value);
  classSel.disabled=!studentSel.value;
  classSel.innerHTML="<option value=''>Tidak dikaitkan ke kelas</option>"+list.map(c=>"<option value='"+c.id+"'>"+safe(c.class_name||"Kelas")+" · "+(c.has_group_learning?"Kelompok belajar":"Reguler")+"</option>").join("");
  if(row?.class_id)classSel.value=row.class_id;
  updateGroup();
 };
 const loadStudents=async()=>{
  const tid=tutorSel.value;studentSel.disabled=!tid;classSel.disabled=true;
  studentSel.innerHTML="<option value=''>"+(tid?"Memuat murid...":"Pilih Tentor dahulu")+"</option>";
  if(!tid){assigned={students:[],classes:[]};return;}
  assigned=await getTutorStudentsAndClasses(tid);
  studentSel.innerHTML="<option value=''>Pilih murid</option>"+assigned.students.map(s=>"<option value='"+s.id+"'>"+safe(s.full_name)+"</option>").join("");
  if(row?.student_id)studentSel.value=row.student_id;
  loadClasses();
 };
 byId("bfPackageCancel").onclick=()=>{wrap.innerHTML="";editId=null;};
 tutorSel.onchange=async()=>{row=null;await loadStudents();};
 studentSel.onchange=loadClasses;classSel.onchange=updateGroup;
 if(row?.tutor_id)await loadStudents();if(row?.subject)subjectSel.value=row.subject;
 form.onsubmit=async e=>{
  e.preventDefault();const fd=new FormData(form),selectedClass=assigned.classes.find(x=>x.id===fd.get("class_id")),group=!!selectedClass?.has_group_learning;
  const price=fd.get("price"),purchased=fd.get("purchased_at");
  if(!group&&(!price||!purchased)){byId("bfPackageMessage").textContent="Untuk jadwal biasa, harga dan tanggal pembayaran wajib diisi.";return;}
  const payload={tutor_id:fd.get("tutor_id"),student_id:fd.get("student_id"),class_id:fd.get("class_id")||null,subject:fd.get("subject"),package_meetings:Number(fd.get("package_meetings")),price:price===""?null:Number(price),purchased_at:purchased||null,expires_at:fd.get("expires_at")||null,status:fd.get("status"),notes:fd.get("notes")||null};
  if(!editId)payload.created_by=currentUser.id;
  const result=editId?await db.from("student_packages").update(payload).eq("id",editId):await db.from("student_packages").insert(payload);
  if(result.error){byId("bfPackageMessage").textContent="Gagal menyimpan: "+result.error.message;return;}
  editId=null;wrap.innerHTML="";await loadAdminPackages(cfg);
 };
}
async function loadAdminPackages(cfg){
 const {data,error}=await db.from("student_packages").select("id,student_id,tutor_id,class_id,subject,package_meetings,used_meetings,price,purchased_at,expires_at,status,notes,students(full_name,education_level,school_name),tutors(full_name),classes(class_name,has_group_learning)").order("created_at",{ascending:false}).limit(500);
 const head=byId("recordHead"),body=byId("recordRows");if(error){body.innerHTML="<tr><td>"+safe(error.message)+"</td></tr>";return;}
 head.innerHTML="<tr><th>Tentor</th><th>Murid</th><th>Mapel</th><th>Kelas</th><th>Pertemuan</th><th>Biaya</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr>";
 body.innerHTML=(data||[]).sort((a,b)=>String(a.tutors?.full_name||"").localeCompare(String(b.tutors?.full_name||""),"id")||String(a.students?.full_name||"").localeCompare(String(b.students?.full_name||""),"id")).map(x=>"<tr><td>"+safe(x.tutors?.full_name||"-")+"</td><td>"+safe(x.students?.full_name||"-")+"</td><td>"+safe(x.subject)+"</td><td>"+safe(x.classes?.class_name||"-")+(x.classes?.has_group_learning?" (Kelompok)":"")+"</td><td>"+Number(x.used_meetings||0)+" / "+Number(x.package_meetings||0)+"</td><td>"+(x.price===null?"-":money(x.price))+"</td><td>"+safe(x.purchased_at||"-")+"</td><td>"+safe(x.status)+"</td><td><button class='small-btn' data-pkg-edit='"+x.id+"'>Ubah</button> <button class='small-btn danger' data-pkg-delete='"+x.id+"'>Hapus</button></td></tr>").join("")||"<tr><td colspan='9'>Belum ada paket.</td></tr>";
 body.querySelectorAll("[data-pkg-edit]").forEach(b=>b.onclick=()=>openStudentPackageForm(cfg,data.find(x=>x.id===b.dataset.pkgEdit)));
 body.querySelectorAll("[data-pkg-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Hapus paket ini? Pastikan paket belum digunakan."))return;const {error}=await db.from("student_packages").delete().eq("id",b.dataset.pkgDelete);if(error)alert(error.message);else await loadAdminPackages(cfg);});
}
loadRecords=async function(cfg){
 if(cfg.table==="classes")return loadAdminClasses(cfg);
 if(cfg.table==="student_packages")return loadAdminPackages(cfg);
 return baseLoadRecords(cfg);
};
openRecordForm=async function(cfg,row){
 if(cfg.table==="student_packages")return openStudentPackageForm(cfg,row);
 return baseOpenRecordForm(cfg,row);
};
renderAdmin=async function(){
 addAdminTabs();
 if(currentView==="attendance"){await renderAdminAttendance();}
 else if(currentView==="content_tasks"){await renderAdminVideoTasks();}
 else if(currentView==="progress_reports"){await renderAdminProgressReports();}
 else if(currentView==="tutor_payroll"){await renderAdminPayroll();}
 else {await baseRenderAdmin();}
 await maybeShowBankRequestPopup();
};
const originalInitTutorResources=initTutorResources;
initTutorResources=function(){originalInitTutorResources();setupTutorWorkspace();};
document.addEventListener("DOMContentLoaded",addAdminTabs);
addAdminTabs();
})();
