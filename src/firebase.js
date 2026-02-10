import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function mustEnv(name) {
  const v = import.meta.env[name];
  if (!v || String(v).trim().length === 0) {
    throw new Error(`Eksik ENV: ${name}. Vercel Environment Variables içine ekleyin.`);
  }
  return String(v).trim(); // baş/son boşlukları temizler
}

const firebaseConfig = {
  apiKey: mustEnv("VITE_FIREBASE_API_KEY"),
  authDomain: mustEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: mustEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: mustEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: mustEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: mustEnv("VITE_FIREBASE_APP_ID")
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// senin yolun buna göreydi:
export const appId = "ikk-yarisma";

// Gemini
export const geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
