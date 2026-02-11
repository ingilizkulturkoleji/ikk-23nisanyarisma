import React, { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";

import {
  Upload,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  PenTool,
  Download,
  LogOut,
  ShieldCheck,
  Award,
  Instagram,
  Lock,
  Search,
  Printer,
  Menu,
  X,
  Loader2,
  FileCheck,
  Phone,
  MapPin,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  Globe,
  FileImage,
  File,
} from "lucide-react";

/* =========================
   ENV (Vercel)
========================= */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/* =========================
   Firebase Init
========================= */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Firestore path
const APP_ID = "ikk-yarisma";
const SUBMISSIONS_COL = collection(db, "artifacts", APP_ID, "public", "data", "submissions");

/* =========================
   Assets / Constants
========================= */
const LOGO_URL = "https://i.ibb.co/zHJ5f7bd/ikk-LOGO-PNG.png";
const SEAL_URL =
  "https://i.ibb.co/7xtJHgHX/Gemini-Generated-mage-m6wzg8m6wzg8m6wz-removebg-preview.png";
const SIGNATURE_URL = "https://i.ibb.co/DD6G3YfM/g-rhanimza.png";
const PRINCIPAL_NAME = "Gürhan Keskin";

// Admin creds (UI’da gösterilmez)
const ADMIN_USER = "ikkdijital";
const ADMIN_PASS = "ikk2026";

/* =========================
   Helpers
========================= */
const generateValidationId = () =>
  "IKK-" + Math.random().toString(36).slice(2, 11).toUpperCase();

const normalizePhone = (raw = "") => String(raw).replace(/\D/g, "");

const normalizeName = (raw = "") =>
  String(raw).trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");

const makeSubmissionKey = ({ studentName, studentSurname, parentPhone }) => {
  const phoneNorm = normalizePhone(parentPhone);
  const nameNorm = normalizeName(studentName);
  const surnameNorm = normalizeName(studentSurname);
  const safe = (s) => s.replace(/[^a-z0-9ğüşöçı_]/gi, "_");
  return `dup_${safe(nameNorm)}_${safe(surnameNorm)}_${phoneNorm}`;
};

const getFileIcon = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic"].includes(ext))
    return <FileImage size={14} />;
  if (["pdf", "doc", "docx", "txt"].includes(ext))
    return <FileText size={14} />;
  return <File size={14} />;
};

const isAllowedFile = (file) => {
  if (!file) return false;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const allowed = ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"];
  return allowed.includes(ext);
};

// Gemini: yalnızca resimler için
const analyzeWithGemini = async (file) => {
  if (!file) return "Dosya Yok";
  if (!file.type?.startsWith("image/")) return "Format Desteklenmiyor (Manuel Kontrol)";
  if (!GEMINI_API_KEY) return "API Anahtarı Yok (Manuel Kontrol)";

  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
  });

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Sen bir resim yarışması jürisisin. Bu görselin bir ilkokul/ortaokul öğrencisi tarafından geleneksel yöntemlerle (boya, kalem vs.) mi yapıldığını yoksa Yapay Zeka (AI) tarafından mı üretildiğini analiz et. Yanıtını KESİNLİKLE sadece şu formatta ver: '%[0-100 ARASI RAKAM] ([DURUM])'. Durumlar: 'Temiz', 'Şüpheli', 'AI Üretimi'. Örnek: '%10 (Temiz)' veya '%95 (AI Üretimi)'.",
                },
                { inlineData: { mimeType: file.type, data: base64Data } },
              ],
            },
          ],
        }),
      }
    );

    const data = await resp.json();
    const aiResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return aiResult ? String(aiResult).trim() : "Analiz Edilemedi";
  } catch (e) {
    console.error("Gemini error:", e);
    return "API Hatası (Manuel Kontrol)";
  }
};

const downloadCSV = (data) => {
  const BOM = "\uFEFF";
  const headers = [
    "İsim",
    "Soyisim",
    "Okul",
    "Veli Telefon No",
    "Kategori",
    "Sınıf",
    "AI Durumu",
    "Tarih",
    "Dosya Adı",
    "Dosya Linki",
  ];

  const rows = [headers.join(";")];

  data.forEach((row) => {
    const created = row.createdAt?.seconds ? new Date(row.createdAt.seconds * 1000) : null;
    const rowData = [
      row.studentName,
      row.studentSurname,
      row.school,
      row.parentPhone,
      row.category,
      row.grade ? `${row.grade}. Sınıf` : "",
      row.aiScore,
      created ? created.toLocaleDateString("tr-TR") : "",
      row.fileName || "",
      row.fileUrl || "",
    ];

    const escaped = rowData.map((field) => {
      const s = String(field ?? "");
      if (s.includes(";") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    });

    rows.push(escaped.join(";"));
  });

  const csvString = BOM + rows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ikk_basvurular_${new Date().toLocaleDateString("tr-TR")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/* =========================
   KVKK Component
========================= */
const KvkkContent = () => (
  <div className="text-sm text-slate-700 leading-relaxed space-y-4">
    <p><strong>Değerli İlgili,</strong></p>
    <p>
      6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında kişisel
      verileriniz işlenebilir, paylaşılabilir, muhafaza edilebilir ve gerektiğinde
      imha edilebilir.
    </p>
    <p>
      <strong>Batıkent İngiliz Kültür Koleji</strong> olarak kişisel verilerin
      güvenliği için azami özen gösterilmektedir.
    </p>
    <p>
      https://www.ingilizkultur.com.tr/ adresinde yer alan aydınlatma metnini okudum,
      anladım. Kişisel verilerimin belirtilen şekilde işlenmesine onay veriyorum.
    </p>
  </div>
);

/* =========================
   APP
========================= */
export default function IKKCompetitionApp() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");
  const [submissionData, setSubmissionData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth error:", e);
      }
    };
    init();
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleAdminLogin = (username, password) => {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      setIsAdmin(true);
      setView("adminDashboard");
    } else {
      alert("Hatalı kullanıcı adı veya şifre!");
    }
  };

  const handleSubmission = async (formData) => {
    if (!user) {
      alert("Oturum açılıyor, lütfen tekrar deneyin.");
      return;
    }

    if (!formData.file || !isAllowedFile(formData.file)) {
      alert("Lütfen JPG/PNG/WEBP veya PDF/DOC/DOCX dosyası yükleyin.");
      return;
    }

    const phoneNorm = normalizePhone(formData.parentPhone);

    setLoading(true);
    setLoadingMessage("Başvuru kontrol ediliyor...");

    // ✅ %100 duplicate engeli: docId üzerinden
    const dupId = makeSubmissionKey({
      studentName: formData.studentName,
      studentSurname: formData.studentSurname,
      parentPhone: formData.parentPhone,
    });

    const dupRef = doc(db, "artifacts", APP_ID, "public", "data", "submissions", dupId);

    try {
      const existing = await getDoc(dupRef);
      if (existing.exists()) {
        setLoading(false);
        alert("Bu öğrenci için (aynı ad/soyad ve aynı telefon) daha önce başvuru yapılmış.");
        return;
      }
    } catch (e) {
      console.error("Duplicate check error:", e);
      // İstersen burada durdurabilirsin.
    }

    // Upload (Resumable + Progress)
    setLoadingMessage("Dosya yükleniyor... (%0)");

    let fileUrl = "";
    let storagePath = "";
    const fileName = formData.file?.name || "";
    const fileType = formData.file?.type || "";

    try {
      const safeName = `${Date.now()}_${fileName}`.replace(/\s+/g, "_");
      storagePath = `submissions/${user.uid}/${safeName}`;
      const fileRef = ref(storage, storagePath);

      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(fileRef, formData.file);

        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setLoadingMessage(`Dosya yükleniyor... (%${pct})`);
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      fileUrl = await getDownloadURL(ref(storage, storagePath));
    } catch (e) {
      console.error("Storage upload error:", e);
      setLoading(false);
      alert("Dosya yükleme sırasında hata oluştu. (CORS / Yetki / Ağ) Lütfen tekrar deneyin.");
      return;
    }

    // Firestore kaydı (Gemini beklemeden!)
    setLoadingMessage("Kaydediliyor ve sertifika hazırlanıyor...");

    const initialAiScore =
      formData.file?.type?.startsWith("image/") ? "Analiz Kuyrukta" : "Manuel Kontrol";

    const finalData = {
      studentName: formData.studentName,
      studentSurname: formData.studentSurname,
      school: formData.school,
      grade: formData.grade,
      category: formData.category,
      parentPhone: formData.parentPhone,
      parentPhoneNorm: phoneNorm,

      validationId: generateValidationId(),
      userId: user.uid,
      createdAt: serverTimestamp(),
      status: "İnceleniyor",
      aiScore: initialAiScore,

      fileName,
      fileType,
      storagePath,
      fileUrl,
    };

    try {
      await setDoc(dupRef, finalData);

      // Kullanıcıyı bekletme: hemen sertifikaya geçir
      setSubmissionData(finalData);
      setLoading(false);
      setView("certificate");

      // 🔥 Gemini arka planda çalışsın (sadece resim)
      if (formData.file?.type?.startsWith("image/")) {
        analyzeWithGemini(formData.file)
          .then(async (score) => {
            try {
              await updateDoc(dupRef, { aiScore: score || "Analiz Edilemedi" });
            } catch (e) {
              console.error("AI score update error:", e);
            }
          })
          .catch((e) => console.error("Gemini bg error:", e));
      }
    } catch (e) {
      console.error("Firestore add error:", e);
      setLoading(false);
      alert("Başvuru kaydedilirken hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  const renderView = () => {
    switch (view) {
      case "landing":
        return <LandingPage onStart={() => setView("form")} onAdmin={() => setView("adminLogin")} />;
      case "form":
        return <ApplicationForm onSubmit={handleSubmission} onBack={() => setView("landing")} />;
      case "certificate":
        return (
          <Certificate
            data={submissionData}
            onPrint={() => window.print()}
            onNew={() => setView("landing")}
          />
        );
      case "contact":
        return <ContactPage onBack={() => setView("landing")} />;
      case "adminLogin":
        return <AdminLogin onLogin={handleAdminLogin} onBack={() => setView("landing")} />;
      case "adminDashboard":
        return (
          <AdminDashboard
            onLogout={() => {
              setIsAdmin(false);
              setView("landing");
            }}
          />
        );
      default:
        return <LandingPage onStart={() => setView("form")} onAdmin={() => setView("adminLogin")} />;
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 bg-slate-50 selection:bg-blue-200 flex flex-col">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4 cursor-pointer" onClick={() => setView("landing")}>
            <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden border-2 border-slate-100">
              <img src={LOGO_URL} alt="İKK" className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold text-blue-900 leading-none tracking-tight">
                İNGİLİZ KÜLTÜR <br /> <span className="text-red-600">KOLEJLERİ</span>
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setView("contact")}
              className="text-blue-900 font-semibold hover:text-red-600 transition flex items-center gap-1"
            >
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
            <button
              onClick={() => {
                setView("contact");
                setMobileMenuOpen(false);
              }}
              className="w-full text-center bg-white py-3 rounded-lg border border-slate-200 text-blue-900 font-semibold shadow-sm flex items-center justify-center gap-2"
            >
              <Phone size={18} /> İletişim
            </button>
            <div className="text-sm font-medium text-red-600 border border-red-200 bg-white px-3 py-1 rounded-full">
              #geleceksensin
            </div>
            <button
              onClick={() => {
                setView("landing");
                setMobileMenuOpen(false);
              }}
              className="text-blue-900 font-semibold"
            >
              Ana Sayfa
            </button>
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
        ) : (
          renderView()
        )}
      </main>

      <footer className="bg-blue-900 text-white py-8 md:py-10 mt-auto border-t-4 border-red-600">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <img
              src={LOGO_URL}
              alt="İKK Footer"
              className="h-16 w-auto opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500"
            />
          </div>
          <p className="opacity-80 text-lg font-bold">© 2026 İngiliz Kültür Kolejleri</p>
          <p className="text-sm opacity-60 mt-1">Tüm Hakları Saklıdır.</p>
          <p className="text-xs md:text-sm opacity-50 mt-4">
            23 Nisan Ulusal Egemenlik ve Çocuk Bayramı Özel Projesi
          </p>
        </div>
      </footer>
    </div>
  );
}

/* =========================
   Contact
========================= */
function ContactPage({ onBack }) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-extrabold text-blue-900">İletişim</h2>
        <p className="text-slate-600 max-w-xl mx-auto">
          Sorularınız ve önerileriniz için bizimle iletişime geçebilir, sosyal medya hesaplarımızdan bizi takip edebilirsiniz.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100 flex flex-col justify-center space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center group-hover:bg-blue-900 group-hover:text-white transition">
                <Phone size={24} />
              </div>
              <div>
                <div className="text-sm text-slate-500 font-medium">Çağrı Merkezi</div>
                <a href="tel:4449507" className="text-xl md:text-2xl font-bold text-slate-800 hover:text-blue-900 transition">
                  444 9 507
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 bg-red-100 text-red-900 rounded-full flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition">
                <MapPin size={24} />
              </div>
              <div>
                <div className="text-sm text-slate-500 font-medium">Adres / Konum</div>
                <a
                  href="https://share.google/UY7JC9dLmiAGyPC4A"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-bold text-slate-800 hover:text-red-600 transition flex items-center gap-1"
                >
                  Google Haritalar'da Aç
                </a>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <a
              href="https://ingilizkultur.com.tr"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center w-full py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition gap-2"
            >
              <Globe size={18} /> Web Sitemiz
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
          <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
            <Instagram className="text-pink-600" /> Bizi Takip Edin
          </h3>

          <div className="space-y-3">
            <SocialButton
              icon={<Instagram />}
              label="Instagram"
              color="bg-gradient-to-r from-purple-500 to-pink-500"
              link="https://www.instagram.com/ingilizkulturkolejibatikent/"
            />
            <SocialButton icon={<Twitter />} label="X (Twitter)" color="bg-black" link="https://x.com/ingilizkltrkol" />
            <SocialButton
              icon={<Facebook />}
              label="Facebook"
              color="bg-blue-600"
              link="https://www.facebook.com/people/Bat%C4%B1kent%C4%B0ngilizk%C3%BClt%C3%BCrkolej/100091627883847/"
            />
            <SocialButton
              icon={<Youtube />}
              label="YouTube"
              color="bg-red-600"
              link="https://www.youtube.com/channel/UCfXAdaM-ZwO4rlIwQEh0g1Q"
            />
            <SocialButton
              icon={<Linkedin />}
              label="LinkedIn"
              color="bg-blue-700"
              link="https://www.linkedin.com/in/ingiliz-k%C3%BClt%C3%BCr-koleji-bat%C4%B1kent-247ab4216/"
            />
          </div>
        </div>
      </div>

      <div className="text-center pt-8">
        <button onClick={onBack} className="text-slate-500 hover:text-blue-900 transition flex items-center justify-center mx-auto gap-2">
          <LogOut className="rotate-180" size={18} /> Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );
}

function SocialButton({ icon, label, color, link }) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`${color} text-white px-4 py-3 rounded-xl flex items-center justify-between group hover:opacity-90 transition shadow-md transform hover:scale-[1.02]`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-semibold">{label}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Globe size={16} />
      </div>
    </a>
  );
}

/* =========================
   Landing
========================= */
function LandingPage({ onStart, onAdmin }) {
  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700">
      <section className="text-center py-10 lg:py-20 relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-red-900 text-white shadow-2xl mx-auto max-w-6xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 px-4 flex flex-col items-center">
          <div className="mb-6 animate-in zoom-in duration-1000">
            {/* ✅ Logo büyütüldü */}
            <img
              src={LOGO_URL}
              alt="İngiliz Kültür Kolejleri"
              className="w-40 h-40 md:w-60 md:h-60 object-contain drop-shadow-2xl filter brightness-110"
            />
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
          <button
            onClick={onStart}
            className="group bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 md:py-5 md:px-12 rounded-full shadow-lg transform transition hover:scale-105 flex items-center gap-3 text-lg"
          >
            Yarışmaya Katıl <Award className="w-6 h-6 group-hover:rotate-12 transition" />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <PrizeCard icon={<div className="text-4xl">🏆</div>} rank="1." prize="Laptop" desc="Eğitimine güç katacak yüksek performanslı bilgisayar." color="border-yellow-400" />
        <PrizeCard icon={<div className="text-4xl">🥈</div>} rank="2." prize="Tablet" desc="Yaratıcılığını her yere taşıyabileceğin yeni nesil tablet." color="border-gray-300" />
        <PrizeCard icon={<div className="text-4xl">🥉</div>} rank="3." prize="Akıllı Saat" desc="Zamanı yönet ve sağlıklı kal." color="border-orange-400" />
      </section>

      <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-slate-100 max-w-6xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-blue-900 mb-6 text-center">Yarışma Kategorileri ve Kurallar</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <CategoryCard title="1. Sınıflar: Resim" icon={<ImageIcon className="w-8 h-8 text-blue-600" />} rules={["A4 Kağıdı", "Kuru, Pastel veya Sulu Boya", "JPEG/PNG formatında yükleme", "Konu: 23 Nisan"]} />
          <CategoryCard title="2. Sınıflar: Şiir" icon={<PenTool className="w-8 h-8 text-green-600" />} rules={["A4 Kağıdına el yazısı", "Mavi veya Siyah kalem", "Net fotoğraf (JPEG/PNG)", "Konu: 23 Nisan Sevinci"]} />
          <CategoryCard title="3. Sınıflar: Kompozisyon" icon={<FileText className="w-8 h-8 text-purple-600" />} rules={["Ulusal Egemenlik Konulu", "Min. 200 Kelime", "Mavi/Siyah Kalem", "Ek sayfa eklenebilir", "PDF/Word/Resim"]} />
        </div>
      </section>

      <div className="text-center pt-8">
        <button onClick={onAdmin} className="text-slate-400 hover:text-slate-600 text-sm flex items-center justify-center mx-auto gap-1">
          <Lock className="w-3 h-3" /> Jüri / Yönetici Girişi
        </button>
      </div>
    </div>
  );
}

function PrizeCard({ rank, prize, desc, icon, color }) {
  return (
    <div className={`bg-white p-6 rounded-2xl shadow-md border-t-4 ${color} text-center hover:shadow-xl transition flex flex-col items-center`}>
      <div className="mb-4 bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center shadow-inner">{icon}</div>
      <div className="text-3xl font-bold text-slate-800 mb-1">{rank}</div>
      <h3 className="text-xl font-bold text-blue-900 mb-2">{prize}</h3>
      <p className="text-slate-500 text-sm">{desc}</p>
    </div>
  );
}

function CategoryCard({ title, rules, icon }) {
  return (
    <div className="space-y-3 p-4 bg-slate-50 rounded-xl md:bg-transparent md:p-0">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      <ul className="text-sm space-y-2 text-slate-600">
        {rules.map((rule, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================
   Form
========================= */
function ApplicationForm({ onSubmit, onBack }) {
  const [formData, setFormData] = useState({
    studentName: "",
    studentSurname: "",
    school: "",
    grade: "1",
    parentPhone: "",
    fileName: "",
    file: null,
    aiConsent: false,
    instagramFollow: false,
  });

  const [showKvkk, setShowKvkk] = useState(false);

  const getRulesForGrade = (grade) => {
    if (grade === "1") return "Lütfen resim çalışmanızı A4 kağıdına yapıp net bir şekilde fotoğrafını çekerek yükleyiniz. (JPEG/PNG/WEBP)";
    if (grade === "2") return "Şiirinizi A4 kağıdına kendi el yazınızla yazıp fotoğrafını yükleyiniz. (JPEG/PNG/WEBP)";
    if (grade === "3") return "Kompozisyonunuzu en az 200 kelime olacak şekilde yazınız. Birden fazla sayfa ise tek bir dosya olarak yükleyiniz. (PDF/DOC/DOCX/IMG)";
    return "";
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedFile(file)) {
      alert("Sadece JPG/PNG/WEBP veya PDF/DOC/DOCX yükleyebilirsiniz.");
      return;
    }

    setFormData((p) => ({ ...p, file, fileName: file.name }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.aiConsent) return alert("Lütfen çalışmanın size ait olduğunu onaylayın.");
    if (!formData.instagramFollow) return alert("Lütfen Instagram hesabımızı takip ettiğinizi onaylayın.");

    let category = "Resim";
    if (formData.grade === "2") category = "Şiir";
    if (formData.grade === "3") category = "Kompozisyon";

    onSubmit({ ...formData, category });
  };

  return (
    <>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden relative">
        <div className="bg-blue-900 p-4 md:p-6 text-white flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <PenTool className="w-6 h-6 md:w-8 md:h-8" />
            <h2 className="text-xl md:text-2xl font-bold">
              <span className="hidden md:inline">İngiliz Kültür Kolejleri</span> Başvuru Formu
            </h2>
          </div>
          <button onClick={onBack} className="text-blue-200 hover:text-white text-sm bg-blue-800/50 px-3 py-1 rounded">
            İptal
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-4 md:space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Öğrenci Adı</label>
              <input
                required
                type="text"
                className="w-full border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) => setFormData((p) => ({ ...p, studentName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Öğrenci Soyadı</label>
              <input
                required
                type="text"
                className="w-full border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) => setFormData((p) => ({ ...p, studentSurname: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mevcut Okulu</label>
              <input
                required
                type="text"
                className="w-full border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) => setFormData((p) => ({ ...p, school: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sınıf Seviyesi</label>
              <select
                className="w-full border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.grade}
                onChange={(e) => setFormData((p) => ({ ...p, grade: e.target.value }))}
              >
                <option value="1">1. Sınıf (Resim)</option>
                <option value="2">2. Sınıf (Şiir)</option>
                <option value="3">3. Sınıf (Kompozisyon)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Veli Telefon Numarası</label>
            <input
              required
              type="tel"
              placeholder="0555 555 55 55"
              className="w-full border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setFormData((p) => ({ ...p, parentPhone: e.target.value }))}
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors">
            <p className="text-sm text-blue-800 font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Kurallar:
            </p>
            <p className="text-xs text-slate-600 mb-4">{getRulesForGrade(formData.grade)}</p>

            <label className="cursor-pointer flex flex-col items-center justify-center h-24 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-blue-50 text-center p-2">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm text-slate-600 break-all">{formData.fileName || "Dosya Seçmek İçin Tıklayın"}</span>
              <input
                required
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
              />
            </label>

            <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Görseller Gemini ile analiz edilir. PDF/Word manuel kontroldedir.
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
                <button
                  type="button"
                  onClick={() => window.open("https://instagram.com/ingilizkulturkolejleri", "_blank")}
                  className="text-xs bg-white border border-purple-200 px-3 py-1 rounded-full text-purple-700 hover:bg-purple-100 transition w-full md:w-auto"
                >
                  Sayfaya Git
                </button>

                <label className="flex items-center gap-2 cursor-pointer w-full md:w-auto justify-end">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-purple-600 rounded"
                    required
                    checked={formData.instagramFollow}
                    onChange={(e) => setFormData((p) => ({ ...p, instagramFollow: e.target.checked }))}
                  />
                  <span className="text-xs font-semibold text-purple-900">Takip ettim</span>
                </label>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
              <input
                type="checkbox"
                className="mt-1 w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 flex-shrink-0"
                required
                checked={formData.aiConsent}
                onChange={(e) => setFormData((p) => ({ ...p, aiConsent: e.target.checked }))}
              />
              <span className="text-xs md:text-sm text-slate-700">
                Çalışmamın tamamen bana ait olduğunu, yapay zeka araçları ile oluşturulmadığını ve
                <button type="button" onClick={() => setShowKvkk(true)} className="text-blue-600 hover:underline font-bold ml-1">
                  İngiliz Kültür Kolejleri KVKK metnini
                </button>{" "}
                kabul ediyorum.
              </span>
            </label>
          </div>

          <button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition flex justify-center items-center gap-2">
            Başvuruyu Tamamla <CheckCircle />
          </button>
        </form>

        {showKvkk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
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
    </>
  );
}

/* =========================
   Certificate
========================= */
function Certificate({ data, onPrint, onNew }) {
  if (!data) return null;

  return (
    <div className="flex flex-col items-center animate-in zoom-in duration-500 w-full">
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

      <p className="text-xs text-slate-400 mt-2 mb-4 md:hidden">Sertifikayı tam görmek için yana kaydırın.</p>

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

/* =========================
   Admin Login
========================= */
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
      </div>
    </div>
  );
}

/* =========================
   Admin Dashboard
========================= */
function AdminDashboard({ onLogout }) {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState("");
  const [stats, setStats] = useState({ total: 0, resim: 0, siir: 0, komp: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const q = query(SUBMISSIONS_COL, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
      setSubmissions(data);

      const st = {
        total: data.length,
        resim: data.filter((d) => d.grade === "1").length,
        siir: data.filter((d) => d.grade === "2").length,
        komp: data.filter((d) => d.grade === "3").length,
      };
      setStats(st);
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return submissions;
    return submissions.filter((s) => {
      const name = `${s.studentName || ""} ${s.studentSurname || ""}`.toLowerCase();
      const id = String(s.validationId || "").toLowerCase();
      return name.includes(f) || id.includes(f);
    });
  }, [submissions, filter]);

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
        <StatCard label="Toplam" value={stats.total} />
        <StatCard label="Resim" value={stats.resim} />
        <StatCard label="Şiir" value={stats.siir} />
        <StatCard label="Komp." value={stats.komp} />
      </div>

      <div className="p-4 flex items-center gap-2 border-b">
        <Search className="text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Ara (İsim veya ID)..."
          className="w-full md:w-1/3 outline-none text-slate-700 bg-transparent"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto flex-1 p-0 md:p-4">
        <table className="w-full text-left border-collapse min-w-[900px]">
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
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      sub.grade === "1"
                        ? "bg-indigo-100 text-indigo-800"
                        : sub.grade === "2"
                        ? "bg-green-100 text-green-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {sub.category}
                  </span>
                </td>
                <td className="p-3 truncate max-w-[180px]">{sub.school}</td>
                <td className="p-3">{sub.parentPhone}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        String(sub.aiScore || "").includes("AI")
                          ? "bg-red-500"
                          : String(sub.aiScore || "").includes("Temiz")
                          ? "bg-green-500"
                          : String(sub.aiScore || "").includes("Kuyrukta")
                          ? "bg-blue-500"
                          : "bg-yellow-500"
                      }`}
                    ></div>
                    <span className="text-xs">{sub.aiScore}</span>
                  </div>
                </td>
                <td className="p-3">
                  {sub.fileUrl ? (
                    <a
                      href={sub.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-semibold text-xs hover:underline"
                      title={sub.fileName || "Dosyayı indir"}
                    >
                      {getFileIcon(sub.fileName)} <span>İndir</span> <Download size={14} />
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}

            {filteredData.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-slate-200">
      <div className="text-[10px] md:text-xs text-slate-500 uppercase font-bold">{label}</div>
      <div className="text-xl md:text-2xl font-bold text-blue-900">{value}</div>
    </div>
  );
}
