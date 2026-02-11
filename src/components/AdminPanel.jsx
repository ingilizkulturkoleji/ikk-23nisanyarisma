import React, { useEffect, useMemo, useState } from "react";
import { db, auth, storage } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { getDownloadURL, ref } from "firebase/storage";
import FileCell from "./FileCell";

export default function AdminPanel({ onExit }) {
  const [rows, setRows] = useState([]);
  const [qText, setQText] = useState("");
  const [urlMap, setUrlMap] = useState({}); // storagePath -> url

  useEffect(() => {
    const qy = query(collection(db, "submissions"), orderBy("createdAt", "desc"));
    return onSnapshot(qy, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // download url cache
  useEffect(() => {
    const paths = rows.map(r => r.storagePath).filter(Boolean);
    const missing = paths.filter(p => !urlMap[p]);
    if (missing.length === 0) return;

    (async () => {
      const updates = {};
      for (const p of missing) {
        try {
          const url = await getDownloadURL(ref(storage, p));
          updates[p] = url;
        } catch {
          // yetki/404 vs.
        }
      }
      if (Object.keys(updates).length) setUrlMap(prev => ({ ...prev, ...updates }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.studentName, r.phone, r.school, r.category, r.id].some((x) =>
        String(x || "").toLowerCase().includes(t)
      )
    );
  }, [rows, qText]);

  const counts = useMemo(() => {
    const c = { total: rows.length, resim: 0, siir: 0, komp: 0 };
    for (const r of rows) {
      const k = String(r.category || "").toLowerCase();
      if (k.includes("resim")) c.resim++;
      else if (k.includes("şiir") || k.includes("siir")) c.siir++;
      else c.komp++;
    }
    return c;
  }, [rows]);

  async function handleLogout() {
    await signOut(auth);
    onExit?.();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="bg-slate-900 text-white rounded-2xl shadow p-5 flex items-center justify-between">
        <div className="text-xl font-semibold">Jüri Paneli</div>
        <div className="flex gap-2">
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700"
          >
            Çıkış
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <Stat title="TOPLAM" value={counts.total} />
        <Stat title="RESİM" value={counts.resim} />
        <Stat title="ŞİİR" value={counts.siir} />
        <Stat title="KOMP." value={counts.komp} />
      </div>

      <div className="mt-4">
        <input
          className="w-full border rounded-xl px-4 py-3"
          placeholder="Ara..."
          value={qText}
          onChange={(e) => setQText(e.target.value)}
        />
      </div>

      <div className="mt-4 bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="p-3">ID</th>
              <th className="p-3">Öğrenci</th>
              <th className="p-3">Kategori</th>
              <th className="p-3">Okul</th>
              <th className="p-3">Tel</th>
              <th className="p-3">Dosya</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 text-slate-600">{r.id}</td>
                <td className="p-3 font-medium">{r.studentName}</td>
                <td className="p-3">{r.category}</td>
                <td className="p-3">{r.school}</td>
                <td className="p-3">{r.phone}</td>
                <td className="p-3">
                  <FileCell
                    fileName={r.fileName}
                    downloadUrl={r.storagePath ? urlMap[r.storagePath] : ""}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-6 text-slate-500" colSpan={6}>
                  Kayıt yok.
                </td>
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
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
