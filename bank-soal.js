// Contoh bank soal dan aktivitas worksheet BIMBEL FUN.
// Materi contoh disusun sebagai inspirasi, bukan pengganti ATP/modul ajar satuan pendidikan.
const BIMBELFUN_RESOURCES = [
{level:"PAUD",grade:"PAUD",subject:"Motorik & Kognitif",topic:"Garis dan bentuk",title:"Menebalkan garis",prompt:"Ikuti garis putus-putus dari kiri ke kanan. Setelah itu, lingkari bentuk lingkaran.",answer:"Latihan motorik halus; tidak ada satu jawaban tunggal.",activity:true},
{level:"PAUD",grade:"PAUD",subject:"Bahasa",topic:"Kosakata",title:"Mengenal benda sekitar",prompt:"Sebutkan nama 3 benda yang ada di kelas. Ceritakan kegunaan salah satunya.",answer:"Contoh: buku untuk dibaca, pensil untuk menulis, tas untuk membawa barang.",activity:true},
{level:"TK A",grade:"TK A",subject:"Calistung",topic:"Huruf",title:"Mengenal huruf awal",prompt:"Huruf apakah yang mengawali kata Apel, Bola, dan Ceri?",answer:"A, B, dan C."},
{level:"TK A",grade:"TK A",subject:"Numerasi",topic:"Berhitung 1–5",title:"Menghitung benda",prompt:"Ada 2 apel. Ibu memberi 1 apel lagi. Berapa jumlah apel sekarang?",answer:"3 apel."},
{level:"TK B",grade:"TK B",subject:"Calistung",topic:"Suku kata",title:"Menyusun suku kata",prompt:"Gabungkan suku kata BU dan KU. Kata apakah yang terbentuk?",answer:"BUKU."},
{level:"TK B",grade:"TK B",subject:"Numerasi",topic:"Pola bilangan",title:"Melanjutkan pola",prompt:"Perhatikan pola: 1, 2, 1, 2, __, __. Angka apa berikutnya?",answer:"1, 2."},
{level:"SD",grade:"Kelas 1",subject:"Matematika",topic:"Penjumlahan",title:"Penjumlahan sederhana",prompt:"Rani memiliki 12 kelereng. Ia mendapat 5 kelereng lagi. Berapa kelereng Rani sekarang?",answer:"12 + 5 = 17 kelereng."},
{level:"SD",grade:"Kelas 2",subject:"Bahasa Indonesia",topic:"Kalimat",title:"Kalimat ajakan",prompt:"Buat satu kalimat ajakan untuk menjaga kebersihan kelas.",answer:"Contoh: Ayo, kita membuang sampah pada tempatnya."},
{level:"SD",grade:"Kelas 3",subject:"IPAS",topic:"Bagian tumbuhan",title:"Fungsi akar",prompt:"Apa fungsi utama akar bagi tumbuhan?",answer:"Menyerap air dan zat hara dari tanah serta membantu menopang tumbuhan."},
{level:"SD",grade:"Kelas 4",subject:"Matematika",topic:"Pecahan",title:"Pecahan sederhana",prompt:"Sebuah kue dipotong menjadi 8 bagian sama besar. Adi makan 3 bagian. Berapa bagian kue yang tersisa?",answer:"5/8 bagian."},
{level:"SD",grade:"Kelas 5",subject:"IPAS",topic:"Ekosistem",title:"Rantai makanan",prompt:"Pada rantai makanan rumput → belalang → katak → ular, hewan apakah konsumen tingkat pertama?",answer:"Belalang."},
{level:"SD",grade:"Kelas 6",subject:"Matematika",topic:"Perbandingan",title:"Perbandingan",prompt:"Perbandingan buku merah dan biru adalah 2 : 3. Jika buku merah ada 10, berapa buku biru?",answer:"15 buku biru."},
{level:"SMP",grade:"Kelas 7",subject:"Matematika",topic:"Bilangan bulat",title:"Operasi bilangan bulat",prompt:"Hitung hasil dari −8 + 15 − 4.",answer:"3."},
{level:"SMP",grade:"Kelas 8",subject:"IPA",topic:"Sistem pencernaan",title:"Organ pencernaan",prompt:"Di organ manakah sebagian besar penyerapan sari-sari makanan berlangsung?",answer:"Usus halus."},
{level:"SMP",grade:"Kelas 9",subject:"Matematika",topic:"Persamaan linear",title:"Persamaan satu variabel",prompt:"Tentukan nilai x jika 3x − 7 = 11.",answer:"3x = 18, sehingga x = 6."},
{level:"SMP",grade:"Kelas 9",subject:"Bahasa Inggris",topic:"Simple past tense",title:"Choose the correct verb",prompt:"Yesterday, she ___ to the library. (go / goes / went)",answer:"went."},
{level:"SMA",grade:"Kelas 10",subject:"Matematika",topic:"Fungsi kuadrat",title:"Akar persamaan kuadrat",prompt:"Tentukan akar-akar persamaan x² − 5x + 6 = 0.",answer:"(x − 2)(x − 3) = 0, jadi x = 2 atau x = 3."},
{level:"SMA",grade:"Kelas 10",subject:"Biologi",topic:"Keanekaragaman hayati",title:"Tingkat keanekaragaman",prompt:"Apa perbedaan keanekaragaman gen dan keanekaragaman jenis? Berikan masing-masing satu contoh.",answer:"Keanekaragaman gen adalah variasi dalam satu spesies (misalnya varietas mangga); keanekaragaman jenis adalah variasi antarspesies (misalnya mangga dan jambu)."},
{level:"SMA",grade:"Kelas 11",subject:"Fisika",topic:"Gerak lurus",title:"Kecepatan rata-rata",prompt:"Sebuah mobil menempuh 120 km dalam 2 jam. Berapa kecepatan rata-ratanya?",answer:"120 ÷ 2 = 60 km/jam."},
{level:"SMA",grade:"Kelas 11",subject:"Kimia",topic:"Mol",title:"Menghitung jumlah mol",prompt:"Berapa mol zat dalam 18 gram air (H₂O), jika Mr H₂O = 18?",answer:"n = m/Mr = 18/18 = 1 mol."},
{level:"SMA",grade:"Kelas 12",subject:"Matematika",topic:"Turunan",title:"Turunan fungsi",prompt:"Tentukan turunan pertama dari f(x) = 3x² + 2x − 5.",answer:"f'(x) = 6x + 2."},
{level:"SMA",grade:"Kelas 12",subject:"Ekonomi",topic:"Pendapatan nasional",title:"Konsep PDB",prompt:"Jelaskan secara singkat apa yang dimaksud Produk Domestik Bruto (PDB).",answer:"Nilai total barang dan jasa akhir yang diproduksi di dalam wilayah suatu negara selama periode tertentu."}
];
function initTutorResources(){
 const panel=document.getElementById("learningResources");
 if(!panel||panel.dataset.ready==="yes")return;
 panel.dataset.ready="yes";
 panel.classList.remove("portal-hidden");
 const level=document.getElementById("resourceLevel"),grade=document.getElementById("resourceGrade"),subject=document.getElementById("resourceSubject"),search=document.getElementById("resourceSearch"),list=document.getElementById("resourceList"),count=document.getElementById("resourceCount");
 const escHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function fillOptions(select,values,placeholder){const old=select.value;select.innerHTML='<option value="">'+placeholder+'</option>'+values.map(v=>'<option value="'+escHtml(v)+'">'+escHtml(v)+'</option>').join("");if(values.includes(old))select.value=old}
 function update(){
  const lv=level.value;
  fillOptions(grade,[...new Set(BIMBELFUN_RESOURCES.filter(x=>!lv||x.level===lv).map(x=>x.grade))],"Semua kelas");
  fillOptions(subject,[...new Set(BIMBELFUN_RESOURCES.filter(x=>(!lv||x.level===lv)&&(!grade.value||x.grade===grade.value)).map(x=>x.subject))],"Semua mata pelajaran");
  const q=search.value.trim().toLocaleLowerCase("id");
  const rows=BIMBELFUN_RESOURCES.filter(x=>(!lv||x.level===lv)&&(!grade.value||x.grade===grade.value)&&(!subject.value||x.subject===subject.value)&&(!q||[x.title,x.topic,x.prompt,x.subject,x.grade].join(" ").toLocaleLowerCase("id").includes(q)));
  count.textContent=rows.length+" materi ditemukan";
  list.innerHTML=rows.map((x,i)=>'<article class="resource-card"><div class="resource-meta">'+escHtml(x.level)+' · '+escHtml(x.grade)+' · '+escHtml(x.subject)+'</div><h3>'+escHtml(x.title)+'</h3><p class="resource-topic">'+escHtml(x.topic)+'</p><p>'+escHtml(x.prompt)+'</p><details><summary>Lihat kunci jawaban / panduan</summary><p>'+escHtml(x.answer)+'</p></details></article>').join("")||'<p class="portal-muted">Belum ada materi yang cocok. Coba ubah pilihan atau kata pencarian.</p>';
  list.dataset.printRows=JSON.stringify(rows);
 }
 level.addEventListener("change",()=>{grade.value="";subject.value="";update()});
 grade.addEventListener("change",()=>{subject.value="";update()});
 subject.addEventListener("change",update);search.addEventListener("input",update);
 document.getElementById("printWorksheets").addEventListener("click",()=>{
  const rows=JSON.parse(list.dataset.printRows||"[]");
  if(!rows.length){alert("Tidak ada materi untuk dicetak.");return}
  const w=window.open("","_blank");if(!w){alert("Izinkan pop-up untuk mencetak worksheet.");return}
  w.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Worksheet BimbelFun</title><style>body{font:14px Arial,sans-serif;color:#17211b;margin:28px}h1{color:#16845a}h2{font-size:17px;margin:20px 0 6px}.meta{color:#58645e;font-size:11px}.item{margin:18px 0 26px;break-inside:avoid}.answer{margin-top:28px;border-top:1px dashed #aaa;padding-top:10px}.line{height:24px;border-bottom:1px solid #bbb;margin:8px 0} @media print{button{display:none}}</style></head><body><h1>BIMBEL FUN — LEMBAR KERJA</h1><p>Nama: __________________________ Tanggal: ______________</p>'+rows.map((x,i)=>'<section class="item"><div class="meta">'+escHtml(x.level)+' · '+escHtml(x.grade)+' · '+escHtml(x.subject)+'</div><h2>'+(i+1)+'. '+escHtml(x.title)+'</h2><p>'+escHtml(x.prompt)+'</p><div class="line"></div><div class="line"></div></section>').join("")+'<p class="answer">Catatan tentor: sesuaikan instruksi dan tingkat kesulitan dengan kebutuhan murid.</p><script>window.onload=()=>window.print()<\/script></body></html>');
  w.document.close();
 });
 update();
}
