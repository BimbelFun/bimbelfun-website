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
{level:"SMA",grade:"Kelas 12",subject:"Ekonomi",topic:"Pendapatan nasional",title:"Konsep PDB",prompt:"Jelaskan secara singkat apa yang dimaksud Produk Domestik Bruto (PDB).",answer:"Nilai total barang dan jasa akhir yang diproduksi di dalam wilayah suatu negara selama periode tertentu."},

{level:"PAUD",grade:"PAUD",subject:"Motorik Halus",topic:"Menebalkan",title:"Jalur garis lurus dan lengkung",prompt:"Tebalkan jalur putus-putus dari kiri ke kanan.",answer:"Latihan koordinasi mata dan tangan.",worksheetType:"trace"},
{level:"PAUD",grade:"PAUD",subject:"Motorik Halus",topic:"Menebalkan",title:"Menebalkan garis zigzag",prompt:"Ikuti jalur zigzag dengan pensil tanpa keluar garis.",answer:"Latihan motorik halus.",worksheetType:"trace"},
{level:"PAUD",grade:"PAUD",subject:"Mewarnai",topic:"Mewarnai bentuk",title:"Mewarnai bentuk geometri",prompt:"Warnai lingkaran, segitiga, dan persegi dengan warna berbeda.",answer:"Bebas sesuai kreativitas anak.",worksheetType:"color"},
{level:"PAUD",grade:"PAUD",subject:"Mewarnai",topic:"Mewarnai alam",title:"Mewarnai matahari dan awan",prompt:"Warnai matahari, awan, dan rumput.",answer:"Bebas sesuai kreativitas anak.",worksheetType:"color"},
{level:"PAUD",grade:"PAUD",subject:"Gunting Tempel",topic:"Kolase bentuk",title:"Mencocokkan bentuk",prompt:"Gunting bentuk pada bagian bawah lalu tempel pada kotak yang sesuai.",answer:"Lingkaran ke lingkaran, segitiga ke segitiga, persegi ke persegi.",worksheetType:"cut"},
{level:"PAUD",grade:"PAUD",subject:"Menggambar",topic:"Melengkapi gambar",title:"Melengkapi gambar balon",prompt:"Gambarkan tali pada setiap balon lalu warnai.",answer:"Bebas sesuai kreativitas anak.",worksheetType:"draw"},
{level:"PAUD",grade:"PAUD",subject:"Kognitif",topic:"Mencocokkan",title:"Pasangkan benda dan bentuk",prompt:"Tarik garis dari benda ke bentuk yang mirip.",answer:"Roda–lingkaran; buku–persegi panjang; atap rumah–segitiga.",worksheetType:"match"},
{level:"PAUD",grade:"PAUD",subject:"Numerasi",topic:"Berhitung",title:"Hitung gambar buah",prompt:"Hitung gambar buah pada lembar kerja dan tulis jumlahnya.",answer:"Hitung satu per satu bersama pendamping.",worksheetType:"count"},
{level:"PAUD",grade:"PAUD",subject:"Bahasa",topic:"Kosakata",title:"Sebutkan nama hewan",prompt:"Amati gambar sederhana dan sebutkan nama hewan yang kamu kenal.",answer:"Contoh: kucing, ikan, burung, kelinci.",worksheetType:"draw"},
{level:"PAUD",grade:"PAUD",subject:"Motorik Halus",topic:"Menebalkan",title:"Menebalkan pola gelombang",prompt:"Tebalkan pola gelombang dari awal sampai akhir.",answer:"Usahakan mengikuti jalur.",worksheetType:"trace"},
{level:"TK A",grade:"TK A",subject:"Calistung",topic:"Menebalkan huruf",title:"Tebalkan huruf A B C",prompt:"Tebalkan huruf besar A, B, dan C. Sebutkan bunyinya.",answer:"A, B, C.",worksheetType:"letters"},
{level:"TK A",grade:"TK A",subject:"Calistung",topic:"Huruf awal",title:"Pasangkan huruf dan gambar",prompt:"Hubungkan A dengan apel, B dengan bola, dan K dengan kucing.",answer:"A–apel; B–bola; K–kucing.",worksheetType:"match"},
{level:"TK A",grade:"TK A",subject:"Numerasi",topic:"Menebalkan angka",title:"Tebalkan angka 1 sampai 5",prompt:"Tebalkan angka 1, 2, 3, 4, dan 5.",answer:"Urutan angka 1–5.",worksheetType:"numbers"},
{level:"TK A",grade:"TK A",subject:"Mewarnai",topic:"Warna dasar",title:"Mewarnai benda sesuai warna",prompt:"Warnai matahari kuning, daun hijau, dan awan biru muda.",answer:"Ikuti instruksi warna.",worksheetType:"color"},
{level:"TK A",grade:"TK A",subject:"Gunting Tempel",topic:"Mengelompokkan",title:"Gunting dan tempel bentuk",prompt:"Gunting bentuk di bawah lalu tempel di kelompok bentuk yang sama.",answer:"Kelompokkan berdasarkan bentuk.",worksheetType:"cut"},
{level:"TK A",grade:"TK A",subject:"Menggambar",topic:"Menggambar bebas",title:"Gambar rumah sederhana",prompt:"Gambarlah rumah dengan pintu, jendela, dan atap. Warnai gambarmu.",answer:"Perhatikan bagian rumah; hasil gambar boleh berbeda.",worksheetType:"draw"},
{level:"TK A",grade:"TK A",subject:"Kognitif",topic:"Pola",title:"Lanjutkan pola bentuk",prompt:"Lanjutkan pola lingkaran, segitiga, lingkaran, segitiga.",answer:"Lingkaran, segitiga.",worksheetType:"pattern"},
{level:"TK A",grade:"TK A",subject:"Motorik Halus",topic:"Menebalkan",title:"Ikuti jalan menuju bunga",prompt:"Tebalkan jalur dari kupu-kupu menuju bunga.",answer:"Ikuti jalur tanpa keluar garis.",worksheetType:"trace"},
{level:"TK A",grade:"TK A",subject:"Numerasi",topic:"Menghitung",title:"Hitung dan tulis 1–5",prompt:"Hitung lima kelompok benda lalu tulis angkanya.",answer:"Sesuaikan jumlah gambar dengan angka.",worksheetType:"count"},
{level:"TK B",grade:"TK B",subject:"Calistung",topic:"Menebalkan huruf",title:"Tebalkan huruf vokal",prompt:"Tebalkan A, I, U, E, O lalu sebutkan satu kata untuk setiap huruf.",answer:"Contoh: apel, ikan, ular, ember, obat.",worksheetType:"letters"},
{level:"TK B",grade:"TK B",subject:"Calistung",topic:"Menulis kata",title:"Tebalkan kata sederhana",prompt:"Tebalkan kata BUKU, BOLA, dan SAPI. Salin kembali pada garis kosong.",answer:"Salin kata dengan urutan huruf yang benar.",worksheetType:"words"},
{level:"TK B",grade:"TK B",subject:"Numerasi",topic:"Angka 1–10",title:"Tebalkan angka 6 sampai 10",prompt:"Tebalkan angka 6, 7, 8, 9, dan 10.",answer:"Urutan angka 6–10.",worksheetType:"numbers"},
{level:"TK B",grade:"TK B",subject:"Mewarnai",topic:"Mewarnai dan berhitung",title:"Warnai sesuai jumlah",prompt:"Warnai 3 bintang, 4 lingkaran, dan 5 segitiga.",answer:"Periksa jumlah setiap bentuk.",worksheetType:"color"},
{level:"TK B",grade:"TK B",subject:"Gunting Tempel",topic:"Urutan cerita",title:"Susun urutan kegiatan",prompt:"Gunting tiga kotak gambar kegiatan lalu tempel berurutan: bangun tidur, mandi, sarapan.",answer:"Urutan dapat didiskusikan bersama pendamping.",worksheetType:"cut"},
{level:"TK B",grade:"TK B",subject:"Kognitif",topic:"Mencari pasangan",title:"Pasangkan induk dan anak hewan",prompt:"Hubungkan kucing dengan anak kucing, ayam dengan anak ayam, sapi dengan anak sapi.",answer:"Pasangkan hewan dengan anaknya.",worksheetType:"match"},
{level:"TK B",grade:"TK B",subject:"Menggambar",topic:"Menggambar pola",title:"Lengkapi gambar kupu-kupu",prompt:"Gambar sayap di sisi lainnya agar kupu-kupu seimbang, lalu warnai.",answer:"Latihan pengamatan simetri.",worksheetType:"draw"},
{level:"TK B",grade:"TK B",subject:"Numerasi",topic:"Pola bilangan",title:"Lengkapi urutan angka",prompt:"Isi angka yang hilang: 1, 2, __, 4, __, 6, 7, __, 9, 10.",answer:"3, 5, dan 8.",worksheetType:"write"},
{level:"TK B",grade:"TK B",subject:"Motorik Halus",topic:"Menebalkan",title:"Menebalkan bentuk dan pola",prompt:"Tebalkan pola lingkaran, gelombang, dan zigzag.",answer:"Ikuti bentuk dengan perlahan.",worksheetType:"trace"},
{level:"TK B",grade:"TK B",subject:"Bahasa",topic:"Suku kata",title:"Gabungkan suku kata",prompt:"Gabungkan BA + JU, SE + PA + TU, dan BU + NGA.",answer:"BAJU, SEPATU, BUNGA.",worksheetType:"write"}
];
function worksheetPage(x,n,escHtml){
 const header='<div class="meta">'+escHtml(x.level)+' · '+escHtml(x.grade)+' · '+escHtml(x.subject)+'</div><h2>'+n+'. '+escHtml(x.title)+'</h2><p>'+escHtml(x.prompt)+'</p>';
 const trace='<div class="trace-row">〰 〰 〰 〰 〰 〰 〰</div><div class="trace-row">· · · · · · · · · · · · ·</div>';
 const shapes='<div class="shape-row"><span class="circle"></span><span class="triangle"></span><span class="square"></span><span class="star">☆</span></div>';
 const cut='<p>Gunting pada garis putus-putus, lalu tempel pada kotak yang sesuai.</p><div class="cut-grid"><span>LINGKARAN</span><span>SEGITIGA</span><span>PERSEGI</span></div><div class="shape-row cut-shapes"><span class="circle"></span><span class="triangle"></span><span class="square"></span></div>';
 const draw='<div class="draw-box">Gambarku</div>';
 const lines='<div class="write-lines"></div><div class="write-lines"></div>';
 let work=x.worksheetType==="color"?shapes:x.worksheetType==="cut"?cut:x.worksheetType==="draw"?draw:x.worksheetType==="match"?'<div class="match-grid"><span>APEL</span><span>BUKU</span><span>RODA</span><span>○</span><span>▭</span><span>△</span></div>':x.worksheetType==="trace"?trace:x.worksheetType==="letters"?'<div class="trace-letters">A　 B　 C　 D　 E</div>'+lines:x.worksheetType==="numbers"?'<div class="trace-letters">1　 2　 3　 4　 5　 6　 7　 8　 9　 10</div>'+lines:x.worksheetType==="words"?'<div class="trace-letters">BUKU　 BOLA　 SAPI</div>'+lines:x.worksheetType==="pattern"?shapes+lines:x.worksheetType==="count"?shapes+lines:lines;
 return '<section class="item">'+header+work+'<p class="student-line">Nama: ______________________________</p></section>';
}
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
  w.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Worksheet BimbelFun</title><style>body{font:14px Arial,sans-serif;color:#17211b;margin:28px}h1{color:#16845a}h2{font-size:17px;margin:20px 0 6px}.meta{color:#58645e;font-size:11px}.item{margin:18px 0 26px;break-inside:avoid;page-break-inside:avoid;min-height:520px}.trace-row,.trace-letters{font-size:34px;letter-spacing:8px;color:#999;border-bottom:1px dashed #aaa;padding:24px 8px;margin:18px 0}.shape-row{display:flex;align-items:center;justify-content:space-around;margin:45px 0}.circle,.square{display:inline-block;width:90px;height:90px;border:3px solid #222}.circle{border-radius:50%}.triangle{width:0;height:0;border-left:50px solid transparent;border-right:50px solid transparent;border-bottom:90px solid #222;position:relative}.star{font-size:100px;color:#222}.cut-grid{display:flex;justify-content:space-around;margin:35px 0}.cut-grid span{border:1px solid #333;padding:24px 12px}.cut-shapes{border:2px dashed #555;padding:25px}.draw-box{height:280px;border:2px solid #333;margin:25px 0;display:flex;align-items:center;justify-content:center;color:#bbb}.match-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:30px}.match-grid span{border:1px solid #555;padding:22px;text-align:center;font-size:22px}.write-lines{height:45px;border-bottom:1px solid #aaa;margin:18px 0}.student-line{margin-top:35px}@media print{button{display:none}}</style></head><body><h1>BIMBEL FUN — LEMBAR KERJA</h1><p>Nama: __________________________ Tanggal: ______________</p>'+rows.map((x,i)=>worksheetPage(x,i+1,escHtml)).join("")+'<p class="answer">Catatan tentor: sesuaikan instruksi dan tingkat kesulitan dengan kebutuhan murid.</p><script>window.onload=()=>window.print()<\/script></body></html>');
  w.document.close();
 });
 update();
}
