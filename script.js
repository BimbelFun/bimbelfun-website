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
setLanguage('id');
