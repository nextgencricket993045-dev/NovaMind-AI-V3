// ====================================================================
// NovaMind AI V3 - Ultimate Error Detector & Response Handler
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const { message, generationMode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Sabse pehle check karte hain ki Vercel me API key daali gayi hai ya nahi
    if (!apiKey) {
        return res.status(200).json({ reply: "⚠️ API Key Missing: Vercel ke Environment Variables me 'GEMINI_API_KEY' set nahi hai!" });
    }

    let finalMediaUrl = null;
    let finalMediaType = null;

    if (generationMode === "image" || generationMode === "video") {
        const cleanPrompt = encodeURIComponent((message || "").replace(/[^a-zA-Z0-9 ]/g, "").trim());
        const randomSeed = Math.floor(Math.random() * 1000000);
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=1024&height=1024&seed=${randomSeed}&enhance=true`;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message || "Hello" }] }]
            })
        });

        const data = await response.json();

        // Agar Google Gemini API error de raha hai (jaise Invalid API Key), toh seedha screen par dikhao
        if (data.error) {
            return res.status(200).json({ reply: `⚠️ Google API Error: ${data.error.message}` });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI ne output generate nahi kiya. (Khali response)";

        return res.status(200).json({ 
            reply: reply, 
            mediaUrl: finalMediaUrl, 
            mediaType: finalMediaType 
        });

    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Server Crash Error: ${error.message}` });
    }
}
