import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import {
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken
} from "firebase/auth";
import {
  Upload, CheckCircle, FileText, Image as ImageIcon,
  PenTool, Download, LogOut, ShieldCheck, Award,
  Instagram, Lock, Search, Printer, Menu, X, Loader2, FileCheck,
  Phone, MapPin, Facebook, Youtube, Linkedin, Twitter, Globe
} from "lucide-react";

import { auth, db, appId, geminiApiKey } from "./firebase";

// --- GÖRSEL VE İÇERİK TANIMLARI ---
const LOGO_URL = "https://i.ibb.co/zHJ5f7bd/ikk-LOGO-PNG.png";
const SEAL_URL = "https://i.ibb.co/7xtJHgHX/Gemini-Generated-mage-m6wzg8m6wzg8m6wz-removebg-preview.png";
const SIGNATURE_URL = "https://i.ibb.co/DD6G3YfM/g-rhanimza.png";
const PRINCIPAL_NAME = "Gürhan Keskin";

// --- YARDIMCI FONKSIYONLAR ---
const generateValidationId = () => {
  return "IKK-" + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// GEMINI API ENTEGRASYONU
const analyzeWithGemini = async (file) => {
  const apiKey = geminiApiKey;

  if (!file) return "Dosya Yok";

  const isImage = file.type.startsWith("image/");
  if (!isImage) return "Format Desteklenmiyor (Manuel Kontrol)";

  // Key yoksa prod’da patlatmak yerine manuel’e düş
  if (!apiKey) return "API Key Yok (Manuel Kontrol)";

  try {
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Sen bir resim yarışması jürisisin. Bu görselin bir ilkokul/ortaokul öğrencisi tarafından geleneksel yöntemlerle (boya, kalem vs.) mi yapıldığını yoksa Yapay Zeka (AI) tarafından mı üretildiğini analiz et. Yanıtını KESİNLİKLE sadece şu formatta ver: '%[0-100 ARASI RAKAM] ([DURUM])'. Durumlar: 'Temiz', 'Şüpheli', 'AI Üretimi'. Örnek: '%10 (Temiz)' veya '%95 (AI Üretimi)'."
                },
                { inlineData: { mimeType: file.type, data: base64Data } }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const aiResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return aiResult ? aiResult.trim() : "Analiz Edilemedi";
  } catch (error) {
    console.error("Gemini Hatası:", error);
    return "API Hatası (Manuel Kontrol)";
  }
};

const downloadCSV = (data) => {
  const BOM = "\uFEFF";
  const headers = ["İsim", "Soyisim", "Okul", "Veli Telefon No", "Kategori", "Sınıf", "AI Durumu", "Tarih", "Dosya"];

  const csvRows = [];
  csvRows.push(headers.join(";"));

  data.forEach((row) => {
    const rowData = [
      row.studentName,
      row.studentSurname,
      row.school,
      row.parentPhone,
      row.category,
      row.grade + ". Sınıf",
      row.aiScore,
      row.createdAt?.seconds ? new Date(row.createdAt.seconds * 1000).toLocaleDateString("tr-TR") : "",
      row.fileName
    ];

    const escapedRow = rowData.map((field) => {
      const stringField = String(field || "");
      if (stringField.includes(";") || stringField.includes("\n")) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    });

    csvRows.push(escapedRow.join(";"));
  });

  const csvString = BOM + csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `ikk_basvurular_${new Date().toLocaleDateString("tr-TR")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- KVKK METNİ (daha sade, genel ve uyumlu) ---
const KvkkContent = () => (
  <div className="text-sm text-slate-700 leading-relaxed space-y-4">
    <p><strong>Aydınlatma Metni (KVKK - 6698)</strong></p>

    <p>
      Bu başvuru formu kapsamında paylaşılan kişisel verileriniz (öğrenci adı-soyadı, okul bilgisi, veli iletişim bilgisi ve yüklenen eser görseli/dosyası),
      <strong> Batıkent İngiliz Kültür Koleji</strong> tarafından, yarışma başvurusunun alınması, değerlendirme süreçlerinin yürütülmesi, sonuçların duyurulması,
      katılım belgesinin oluşturulması, gerekli hallerde sizinle iletişime geçilmesi ve hukuki yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.
    </p>

    <p>
      Kişisel verileriniz, mevzuattan kaynaklanan zorunluluklar dışında üçüncü kişilerle paylaşılmaz; yalnızca teknik hizmet sağlayıcılar (barındırma/altyapı),
      yetkili kamu kurumları ve hukuki yükümlülükler kapsamında yetkili merciler ile paylaşılabilir.
    </p>

    <p>
      KVKK’nın 11. maddesi uyarınca; kişisel verilerinize ilişkin bilgi talep etme, düzeltme, silme/yok etme, işlemeye itiraz etme gibi haklara sahipsiniz.
      Başvuru ve taleplerinizi okulunuzun resmi iletişim kanalları üzerinden iletebilirsiniz.
    </p>

    <p className="text-slate-600">
      Onay kutusunu işaretleyerek, bu metni okuduğunuzu ve anladığınızı; yarışma başvurusunun yürütülmesi kapsamında verilerinizin işlenmesine izin verdiğinizi beyan etmiş olursunuz.
    </p>
  </div>
);

export default function IKKCompetitionApp() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");
  const [submissionData, setSubmissionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth initialization failed", err);
        if (!auth.currentUser) await signInAnonymously(auth);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleSubmission = async (formData) => {
    if (!user) {
      alert("Oturum açılıyor, lütfen bekleyip tekrar deneyin.");
      return;
    }

    setLoading(true);
    setLoadingMessage("Dosyanız yükleniyor ve Gemini AI ile analiz ediliyor...");

    let aiScoreResult = "Analiz Bekleniyor";
    if (formData.file) {
      try {
        aiScoreResult = await analyzeWithGemini(formData.file);
      } catch {
        aiScoreResult = "Hata (Manuel)";
      }
    } else {
      aiScoreResult = "Dosya Yok";
    }

    setLoadingMessage("Sonuçlar kaydediliyor ve sertifikanız oluşturuluyor...");

    const finalData = {
      ...formData,
      userId: user.uid,
      validationId: generateValidationId(),
      createdAt: serverTimestamp(),
      aiScore: aiScoreResult,
      status: "İnceleniyor",
      file: null
    };

    try {
      await addDoc(collection(db, "artifacts", appId, "public", "data", "submissions"), finalData);
      setSubmissionData(finalData);
      setLoading(false);
      setView("certificate");
    } catch (error) {
      console.error("Kayıt hatası detay:", error);
      alert(`Başvuru sırasında bir hata oluştu: ${error.message}. Lütfen tekrar deneyin.`);
      setLoading(false);
    }
  };

  const handleAdminLogin = (username, password) => {
    if (username === "ikkadmin" && password === "2026") {
      setIsAdmin(true);
      setView("adminDashboard");
    } else {
      alert("Hatalı kullanıcı adı veya şifre!");
    }
  };

  const renderView = () => {
    switch (view) {
      case "landing":
        return <LandingPage onStart={() => setView("form")} onAdmin={() => setView("adminLogin")} />;
      case "form":
        return <ApplicationForm onSubmit={handleSubmission} onBack={() => setView("landing")} KvkkContent={KvkkContent} />;
      case "certificate":
        return <Certificate data={submissionData} onPrint={() => window.print()} onNew={() => setView("landing")} />;
      case "contact":
        return <ContactPage onBack={() => setView("landing")} />;
      case "adminLogin":
        return <AdminLogin onLogin={handleAdminLogin} onBack={() => setView("landing")} />;
      case "adminDashboard":
        return <AdminDashboard onLogout={() => { setIsAdmin(false); setView("landing"); }} />;
      default:
        return <LandingPage onStart={() => setView("form")} onAdmin={() => setView("adminLogin")} />;
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 bg-slate-50 selection:bg-blue-200 flex flex-col">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4 cursor-pointer" onClick={() => setView("landing")}>
            <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg overflow-hidden border-2 border-slate-100">
              <img src={LOGO_URL} alt="İKK" className="w-full h-full object-contain p-1" onError={(e) => { e.target.style.display = "none"; e.target.parentElement.innerText = "İKK"; }} />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold text-blue-900 leading-none tracking-tight">
                İNGİLİZ KÜLTÜR <br /> <span className="text-red-600">KOLEJLERİ</span>
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => setView("contact")} className="text-blue-900 font-semibold hover:text-red-600 transition flex items-center gap-1">
              <Phone size={18} /> İletişim
            </button>
            <div className="text-sm font-bold text-red-600 border-2 border-red-200 bg-red-50 px-4 py-2 rounded-full animate-pulse shadow-sm">
              #geleceksensin
            </div>
          </div>

          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-blue-900">
              {mobileMenuOpen ? <X size={32} /> : <Menu size={32} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-50 border-t p-4 flex flex-col items-center gap-3 animate-in slide-in-from-top-5">
            <button onClick={() => { setView("contact"); setMobileMenuOpen(false); }} className="w-full text-center bg-white py-3 rounded-lg border border-slate-200 text-blue-900 font-semibold shadow-sm flex items-center justify-center gap-2">
              <Phone size={18} /> İletişim
            </button>
            <div className="text-sm font-medium text-red-600 border border-red-200 bg-white px-3 py-1 rounded-full">
              #geleceksensin
            </div>
            <button onClick={() => { setView("landing"); setMobileMenuOpen(false); }} className="text-blue-900 font-semibold">Ana Sayfa</button>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6 flex-grow">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 text-center px-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-900"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-900 animate-pulse" />
              </div>
            </div>
            <h3 className="mt-6 text-xl font-bold text-blue-900">İşlem Yapılıyor</h3>
            <p className="mt-2 text-slate-600 max-w-md mx-auto">{loadingMessage}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              <ShieldCheck size={14} /> Gemini AI Güvenlik Taraması Aktif
            </div>
          </div>
        ) : renderView()}
      </main>

      <footer className="bg-blue-900 text-white py-8 md:py-10 mt-auto border-t-4 border-red-600">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <img src={LOGO_URL} alt="İKK Footer" className="h-16 w-auto opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500" />
          </div>
          <p className="opacity-80 text-lg font-bold">© 2026 İngiliz Kültür Kolejleri</p>
          <p className="text-sm opacity-60 mt-1">Tüm Hakları Saklıdır.</p>
          <p className="text-xs md:text-sm opacity-50 mt-4">23 Nisan Ulusal Egemenlik ve Çocuk Bayramı Özel Projesi</p>
        </div>
      </footer>
    </div>
  );
}

/* ====== Aşağıdaki bileşenler senin tasarımınla aynı mantıkta, kısa tuttum ======
   Senin önceki mesajındaki bileşenlerin tamamı vardı.
   Projende zaten varsa: kendi LandingPage / ApplicationForm / Certificate / AdminDashboard / ContactPage / AdminLogin
   dosyalarını KALDIRMANA gerek yok. Tek dosyada da çalışır.
*/

function ContactPage({ onBack }) { /* aynı */ return (
  <div className="max-w-4xl mx-auto space-y-8">
    <div className="text-center space-y-2">
      <h2 className="text-3xl md:text-4xl font-extrabold text-blue-900">İletişim</h2>
      <p className="text-slate-600 max-w-xl mx-auto">Sorularınız ve önerileriniz için bizimle iletişime geçebilirsiniz.</p>
    </div>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center">
            <Phone size={24} />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Çağrı Merkezi</div>
            <a href="tel:4449507" className="text-xl md:text-2xl font-bold text-slate-800 hover:text-blue-900 transition">444 9 507</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-900 rounded-full flex items-center justify-center">
            <MapPin size={24} />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Adres / Konum</div>
            <a href="https://share.google/UY7JC9dLmiAGyPC4A" target="_blank" rel="noreferrer" className="text-lg font-bold text-slate-800 hover:text-red-600 transition">
              Google Haritalar'da Aç
            </a>
          </div>
        </div>

        <a href="https://ingilizkultur.com.tr" target="_blank" rel="noreferrer" className="flex items-center justify-center w-full py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition gap-2">
          <Globe size={18} /> Web Sitemiz
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
        <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
          <Instagram className="text-pink-600" /> Bizi Takip Edin
        </h3>
        <div className="space-y-3">
          <a className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl flex items-center justify-between" href="https://www.instagram.com/ingilizkulturkolejibatikent/" target="_blank" rel="noreferrer">
            <span className="font-semibold flex items-center gap-2"><Instagram /> Instagram</span><Globe size={16} />
          </a>
          <a className="bg-black text-white px-4 py-3 rounded-xl flex items-center justify-between" href="https://x.com/ingilizkltrkol" target="_blank" rel="noreferrer">
            <span className="font-semibold flex items-center gap-2"><Twitter /> X</span><Globe size={16} />
          </a>
          <a className="bg-blue-600 text-white px-4 py-3 rounded-xl flex items-center justify-between" href="https://www.facebook.com/people/Bat%C4%B1kent%C4%B0ngilizk%C3%BClt%C3%BCrkolej/100091627883847/" target="_blank" rel="noreferrer">
            <span className="font-semibold flex items-center gap-2"><Facebook /> Facebook</span><Globe size={16} />
          </a>
          <a className="bg-red-600 text-white px-4 py-3 rounded-xl flex items-center justify-between" href="https://www.youtube.com/channel/UCfXAdaM-ZwO4rlIwQEh0g1Q" target="_blank" rel="noreferrer">
            <span className="font-semibold flex items-center gap-2"><Youtube /> YouTube</span><Globe size={16} />
          </a>
          <a className="bg-blue-700 text-white px-4 py-3 rounded-xl flex items-center justify-between" href="https://www.linkedin.com/in/ingiliz-k%C3%BClt%C3%BCr-koleji-bat%C4%B1kent-247ab4216/" target="_blank" rel="noreferrer">
            <span className="font-semibold flex items-center gap-2"><Linkedin /> LinkedIn</span><Globe size={16} />
          </a>
        </div>
      </div>
    </div>

    <div className="text-center pt-8">
      <button onClick={onBack} className="text-slate-500 hover:text-blue-900 transition flex items-center justify-center mx-auto gap-2">
        <LogOut className="rotate-180" size={18} /> Ana Sayfaya Dön
      </button>
    </div>
  </div>
);}

function LandingPage({ onStart, onAdmin }) {
  return (
    <div className="space-y-8 md:space-y-12">
      <section className="text-center py-10 lg:py-20 relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-red-900 text-white shadow-2xl mx-auto max-w-6xl">
        <div className="relative z-10 px-4 flex flex-col items-center">
          <div className="mb-6">
            <img src={LOGO_URL} alt="İngiliz Kültür Kolejleri" className="w-32 h-32 md:w-48 md:h-48 object-contain drop-shadow-2xl" />
          </div>
          <div className="inline-block px-6 py-2 mb-4 border border-white/30 rounded-full text-sm md:text-base font-medium backdrop-blur-sm bg-white/10">
            23 Nisan Ulusal Egemenlik ve Çocuk Bayramı
          </div>
          <h1 className="text-3xl md:text-6xl font-extrabold mb-4 tracking-tight leading-tight">
            Hayalini <span className="text-yellow-400">Geleceğe</span> Taşı
          </h1>
          <p className="text-base md:text-xl text-blue-100 max-w-2xl mx-auto mb-8 font-light">
            Resim, Şiir ve Kompozisyon yarışmamıza katıl, yeteneğini göster, harika ödüller kazan!
          </p>
          <button onClick={onStart} className="group bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 md:py-5 md:px-12 rounded-full shadow-lg transform transition hover:scale-105 flex items-center gap-3 text-lg">
            Yarışmaya Katıl <Award className="w-6 h-6 group-hover:rotate-12 transition" />
          </button>
        </div>
      </section>

      <div className="text-center pt-2">
        <button onClick={onAdmin} className="text-slate-400 hover:text-slate-600 text-sm flex items-center justify-center mx-auto gap-1">
          <Lock className="w-3 h-3" /> Jüri / Yönetici Girişi
        </button>
      </div>
    </div>
  );
}

function ApplicationForm({ onSubmit, onBack, KvkkContent }) {
  const [formData, setFormData] = useState({
    studentName: "", studentSurname: "", school: "", grade: "1", parentPhone: "",
    fileName: "", file: null, aiConsent: false, instagramFollow: false
  });
  const [showKvkk, setShowKvkk] = useState(false);

  const getRulesForGrade = (grade) => {
    if (grade === "1") return "Lütfen resim çalışmanızı A4 kağıdına yapıp net bir şekilde fotoğrafını çekerek yükleyiniz. (JPEG/PNG)";
    if (grade === "2") return "Şiirinizi A4 kağıdına kendi el yazınızla yazıp fotoğrafını yükleyiniz. (JPEG/PNG)";
    if (grade === "3") return "Kompozisyonunuzu en az 200 kelime olacak şekilde yazınız. (PDF/DOC/IMG)";
    return "";
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFormData({ ...formData, file, fileName: file.name });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.aiConsent) return alert("Lütfen yapay zeka kullanmadığınızı onaylayın.");
    if (!formData.instagramFollow) return alert("Lütfen Instagram hesabımızı takip ettiğinizi onaylayın.");

    let category = "Resim";
    if (formData.grade === "2") category = "Şiir";
    if (formData.grade === "3") category = "Kompozisyon";
    onSubmit({ ...formData, category });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden relative">
      <div className="bg-blue-900 p-4 md:p-6 text-white flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <PenTool className="w-6 h-6 md:w-8 md:h-8" />
          <h2 className="text-xl md:text-2xl font-bold">
            <span className="hidden md:inline">İngiliz Kültür Kolejleri</span> Başvuru Formu
          </h2>
        </div>
        <button onClick={onBack} className="text-blue-200 hover:text-white text-sm bg-blue-800/50 px-3 py-1 rounded">İptal</button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-4 md:space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Öğrenci Adı</label>
            <input required type="text" className="w-full border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Öğrenci Soyadı</label>
            <input required type="text" className="w-full border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setFormData({ ...formData, studentSurname: e.target.value })} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mevcut Okulu</label>
            <input required type="text" className="w-full border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setFormData({ ...formData, school: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sınıf Seviyesi</label>
            <select className="w-full border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })}>
              <option value="1">1. Sınıf (Resim)</option>
              <option value="2">2. Sınıf (Şiir)</option>
              <option value="3">3. Sınıf (Kompozisyon)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Veli Telefon Numarası</label>
          <input required type="tel" placeholder="0555 555 55 55" className="w-full border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })} />
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors">
          <p className="text-sm text-blue-800 font-semibold mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Kurallar:
          </p>
          <p className="text-xs text-slate-600 mb-4">{getRulesForGrade(formData.grade)}</p>

          <label className="cursor-pointer flex flex-col items-center justify-center h-24 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-blue-50 text-center p-2">
            <Upload className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-sm text-slate-600 break-all">{formData.fileName || "Dosya Seçmek İçin Tıklayın"}</span>
            <input required type="file" className="hidden" onChange={handleFileChange} />
          </label>

          <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Dosyalar otomatik olarak Gemini AI ile analiz edilecektir.
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-100 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white p-2 rounded-lg flex-shrink-0">
                <Instagram size={20} />
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-800">Instagram'da Bizi Takip Edin</p>
                <p className="text-xs text-slate-500">Yarışma sonuçları buradan duyurulacaktır.</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 w-full md:w-auto mt-2 md:mt-0">
              <button type="button" onClick={() => window.open("https://instagram.com/ingilizkulturkolejleri", "_blank")} className="text-xs bg-white border border-purple-200 px-3 py-1 rounded-full text-purple-700 hover:bg-purple-100 transition w-full md:w-auto">
                Sayfaya Git
              </button>
              <label className="flex items-center gap-2 cursor-pointer w-full md:w-auto justify-end">
                <input type="checkbox" className="w-4 h-4 text-purple-600 rounded" required
                  checked={formData.instagramFollow} onChange={(e) => setFormData({ ...formData, instagramFollow: e.target.checked })} />
                <span className="text-xs font-semibold text-purple-900">Takip ettim</span>
              </label>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
            <input type="checkbox" className="mt-1 w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 flex-shrink-0" required
              checked={formData.aiConsent} onChange={(e) => setFormData({ ...formData, aiConsent: e.target.checked })} />
            <span className="text-xs md:text-sm text-slate-700">
              Çalışmamın tamamen bana ait olduğunu, yapay zeka araçları ile oluşturulmadığını ve
              <button type="button" onClick={() => setShowKvkk(true)} className="text-blue-600 hover:underline font-bold ml-1">
                İngiliz Kültür Kolejleri KVKK metnini
              </button> kabul ediyorum.
            </span>
          </label>
        </div>

        <button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition flex justify-center items-center gap-2">
          Başvuruyu Tamamla <CheckCircle />
        </button>
      </form>

      {showKvkk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl sticky top-0">
              <div className="flex items-center gap-2 text-blue-900">
                <FileCheck size={20} />
                <h3 className="font-bold text-lg">KVKK Aydınlatma Metni</h3>
              </div>
              <button onClick={() => setShowKvkk(false)} className="text-slate-500 hover:text-red-500 transition p-1 rounded-full hover:bg-red-50">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <KvkkContent />
            </div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end">
              <button onClick={() => setShowKvkk(false)} className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-semibold transition shadow-md">
                Okudum, Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Certificate({ data, onPrint, onNew }) {
  if (!data) return null;
  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-green-100 text-green-800 px-4 md:px-6 py-3 rounded-full flex items-center gap-2 mb-6 font-bold shadow-sm text-sm md:text-base text-center">
        <CheckCircle className="w-5 h-5 flex-shrink-0" /> Başvurunuz Başarıyla Alındı!
      </div>

      <div className="w-full overflow-x-auto pb-4 flex justify-center">
        <div id="print-area" className="relative w-[800px] min-w-[800px] aspect-[1.414] bg-white border-[12px] border-double border-blue-900 p-12 shadow-2xl text-center flex flex-col justify-between mx-auto">
          <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center overflow-hidden">
            <img src={LOGO_URL} alt="Watermark" className="w-96 grayscale opacity-50" />
          </div>

          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <img src={LOGO_URL} alt="Logo" className="h-32 md:h-40 w-auto object-contain drop-shadow-lg" />
            </div>
            <h1 className="text-5xl font-serif text-blue-900 font-bold tracking-wider mb-2 uppercase">Katılım Sertifikası</h1>
            <div className="w-32 h-1 bg-red-600 mx-auto rounded-full"></div>
          </div>

          <div className="relative z-10 my-4 space-y-2 flex-grow flex flex-col justify-center">
            <p className="text-lg text-slate-600 font-serif italic">Sayın</p>
            <h2 className="text-4xl font-bold text-slate-800 font-serif capitalize py-2">
              {data.studentName} {data.studentSurname}
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kapsamında düzenlenen <br />
              <strong className="text-blue-900">"Hayalini Geleceğe Taşı"</strong> projesine <br />
              <span className="font-semibold text-red-600">{data.category}</span> dalında katılarak göstermiş olduğunuz <br />
              üstün cesaret ve yetenek için teşekkür ederiz.
            </p>
          </div>

          <div className="relative z-10 flex justify-between items-end mt-8 px-8">
            <div className="text-left w-1/3">
              <div className="text-xs text-slate-400 font-mono mb-1">Doğrulama Kodu:</div>
              <div className="text-sm font-bold text-slate-600 border px-2 py-1 inline-block bg-white">{data.validationId}</div>
              <div className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString("tr-TR")}</div>
            </div>

            <div className="flex flex-col items-center w-1/3">
              <div className="w-28 h-28 relative flex items-center justify-center mb-2">
                <img src={SEAL_URL} alt="Mühür" className="w-full h-full object-contain opacity-90 rotate-[-10deg]" />
              </div>
            </div>

            <div className="text-center w-1/3 flex flex-col items-center">
              <div className="h-16 mb-2 flex items-end justify-center">
                <img src={SIGNATURE_URL} alt="İmza" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="w-32 h-0.5 bg-slate-800 mb-1"></div>
              <div className="text-sm font-bold text-slate-700">{PRINCIPAL_NAME}</div>
              <div className="text-xs text-slate-500">Okul Müdürü</div>
            </div>
          </div>

          <div className="absolute top-0 left-0 w-0 h-0 border-t-[80px] border-r-[80px] border-t-red-600 border-r-transparent"></div>
          <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[80px] border-l-[80px] border-b-blue-900 border-l-transparent"></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 print:hidden w-full md:w-auto px-4">
        <button onClick={onPrint} className="bg-slate-800 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-900 transition shadow-lg w-full md:w-auto">
          <Printer className="w-5 h-5" /> Yazdır / PDF İndir
        </button>
        <button onClick={onNew} className="bg-white text-blue-900 border border-blue-900 px-6 py-3 rounded-lg hover:bg-blue-50 transition shadow-lg w-full md:w-auto">
          Yeni Başvuru
        </button>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; border-width: 0; transform: scale(1); }
          @page { size: landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
}

function AdminLogin({ onLogin, onBack }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-2xl mt-10 mx-4">
      <h2 className="text-2xl font-bold text-center text-blue-900 mb-6 flex justify-center items-center gap-2">
        <Lock /> Jüri Paneli Girişi
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700">Kullanıcı Adı</label>
          <input type="text" className="w-full p-2 border rounded outline-none focus:border-blue-500" value={u} onChange={(e) => setU(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700">Şifre</label>
          <input type="password" className="w-full p-2 border rounded outline-none focus:border-blue-500" value={p} onChange={(e) => setP(e.target.value)} />
        </div>
        <button onClick={() => onLogin(u, p)} className="w-full bg-blue-900 text-white py-2 rounded font-bold hover:bg-blue-800 transition">
          Giriş Yap
        </button>
        <button onClick={onBack} className="w-full text-slate-500 text-sm hover:underline">
          Ana Sayfaya Dön
        </button>
        <div className="text-center text-xs text-slate-400 mt-4">Demo Giriş: ikkadmin / 2026</div>
      </div>
    </div>
  );
}

function AdminDashboard({ onLogout }) {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState("");
  const [stats, setStats] = useState({ total: 0, resim: 0, siir: 0, komp: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const q = query(collection(db, "artifacts", appId, "public", "data", "submissions"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSubmissions(data);

      setStats({
        total: data.length,
        resim: data.filter((d) => d.grade === "1").length,
        siir: data.filter((d) => d.grade === "2").length,
        komp: data.filter((d) => d.grade === "3").length
      });
    };
    fetchData();
  }, []);

  const filteredData = submissions.filter((s) =>
    (s.studentName || "").toLowerCase().includes(filter.toLowerCase()) ||
    (s.validationId || "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-xl min-h-[600px] flex flex-col overflow-hidden">
      <div className="bg-slate-800 text-white p-4 md:p-6 flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-green-400" /> Jüri Paneli
        </h2>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV(filteredData)} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded flex items-center gap-2 text-xs md:text-sm font-bold transition">
            <Download size={16} /> <span className="hidden md:inline">Excel</span>
          </button>
          <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded flex items-center gap-2 text-xs md:text-sm font-bold transition">
            <LogOut size={16} /> <span className="hidden md:inline">Çıkış</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 p-4 bg-slate-50 border-b">
        <Stat title="Toplam" value={stats.total} />
        <Stat title="Resim" value={stats.resim} />
        <Stat title="Şiir" value={stats.siir} />
        <Stat title="Komp." value={stats.komp} />
      </div>

      <div className="p-4 flex items-center gap-2 border-b">
        <Search className="text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Ara..."
          className="w-full md:w-1/3 outline-none text-slate-700 bg-transparent"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto flex-1 p-0 md:p-4">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="text-slate-500 text-sm border-b bg-slate-50">
              <th className="p-3">ID</th>
              <th className="p-3">Öğrenci</th>
              <th className="p-3">Kategori</th>
              <th className="p-3">Okul</th>
              <th className="p-3">Tel</th>
              <th className="p-3">AI Durumu</th>
              <th className="p-3">Dosya</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredData.map((sub) => (
              <tr key={sub.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-3 font-mono text-xs text-slate-500">{sub.validationId}</td>
                <td className="p-3 font-bold text-slate-800">{sub.studentName} {sub.studentSurname}</td>
                <td className="p-3">{sub.category}</td>
                <td className="p-3 truncate max-w-[150px]">{sub.school}</td>
                <td className="p-3">{sub.parentPhone}</td>
                <td className="p-3 text-xs">{sub.aiScore}</td>
                <td className="p-3 text-slate-400 text-xs">—</td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">Kayıt bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-slate-200">
      <div className="text-[10px] md:text-xs text-slate-500 uppercase font-bold">{title}</div>
      <div className="text-xl md:text-2xl font-bold text-blue-900">{value}</div>
    </div>
  );
}
