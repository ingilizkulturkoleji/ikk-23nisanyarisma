export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const { mimeType, base64 } = req.body || {};
    if (!mimeType || !base64) return res.status(400).send("Bad Request");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).send("GEMINI_API_KEY missing");

    const prompt =
      "Sen bir resim yarışması jürisisin. Bu görselin bir ilkokul/ortaokul öğrencisi tarafından geleneksel yöntemlerle (boya, kalem vs.) mi yapıldığını yoksa Yapay Zeka (AI) tarafından mı üretildiğini analiz et. Yanıtını KESİNLİKLE sadece şu formatta ver: '%[0-100 ARASI RAKAM] ([DURUM])'. Durumlar: 'Temiz', 'Şüpheli', 'AI Üretimi'.";

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      "gemini-2.5-flash-preview-09-2025:generateContent?key=" +
      apiKey;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64 } }] }],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(500).send(t || "Gemini error");
    }

    const data = await r.json();
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Analiz Edilemedi";
    return res.status(200).json({ result });
  } catch (e) {
    return res.status(500).send(String(e?.message || e));
  }
}
