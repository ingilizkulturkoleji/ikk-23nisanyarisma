import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Vercel + local .env üzerinden okunur
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Basit doğrulama (beyaz ekran olmasın diye)
const requiredKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId"
];

for (const k of requiredKeys) {
  if (!firebaseConfig[k]) {
    // eslint-disable-next-line no-console
    console.error(
      `Eksik ENV: VITE_FIREBASE_* ayarlarından "${k}" boş. Vercel Environment Variables içine ekleyin.`
    );
  }
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const appId = import.meta.env.VITE_APP_ID || "ikk-yarisma";
export const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
