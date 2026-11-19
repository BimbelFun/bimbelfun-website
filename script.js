const langButton = document.getElementById('langToggle');
let currentLang = 'id';
function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-id]').forEach(el => { el.hidden = lang !== 'id'; });
  document.querySelectorAll('[data-en]').forEach(el => { el.hidden = lang !== 'en'; });
  langButton.textContent = lang === 'id' ? 'EN' : 'ID';
}
langButton.addEventListener('click', () => setLanguage(currentLang === 'id' ? 'en' : 'id'));
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('mainNav');
menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false');
}));
document.getElementById('year').textContent = new Date().getFullYear();
async function loadPublicBimbelStats() {
 const section=document.getElementById('publicStats');if(!section||!window.supabase)return;
 const client=window.supabase.createClient('https://eoghhxnxugvsxxjotenu.supabase.co','sb_publishable_XNEladKm2lliq4h40XMcTQ_qsarZcTe');
 const {data,error}=await client.rpc('bimbelfun_public_dashboard_stats');if(error||!data){section.hidden=true;return}
 document.getElementById('publicStudentCount').textContent=Number(data.student_count||0).toLocaleString('id-ID');
 document.getElementById('publicTutorCount').textContent=Number(data.tutor_count||0).toLocaleString('id-ID');
 const escHtml=v=>String(v||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 document.getElementById('publicTutorList').innerHTML=(data.tutors||[]).map(t=>'<article class="public-tutor-card"><strong>'+escHtml(t.full_name)+'</strong><span>'+escHtml(t.expertise||'Tentor BIMBEL FUN')+'</span><small>'+Number(t.student_count||0).toLocaleString('id-ID')+' murid yang diajar</small></article>').join('');
}
loadPublicBimbelStats();
setLanguage('id');
