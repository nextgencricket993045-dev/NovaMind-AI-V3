// ====================================================================
// NovaMind AI V3 - Optimized Response Handler
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const { message, generationMode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Media Logic (Only active for image/video mode)
    let finalMediaUrl = null;
    let finalMediaType = null;
    if (generationMode === "image" || generationMode === "video") {
        const cleanPrompt = encodeURIComponent(message.replace(/[^a-zA-Z0-9 ]/g, "").trim());
        const randomSeed = Math.floor(Math.random() * 1000000);
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=1024&height=1024&seed=${randomSeed}&enhance=true`;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message }] }]
            })
        });

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Mujhe aapka message mila, par AI ne koi jawab nahi diya. Phir se try karein?";

        return res.status(200).json({ 
            reply: reply, 
            mediaUrl: finalMediaUrl, 
            mediaType: finalMediaType 
        });

    } catch (error) {
        return res.status(500).json({ reply: "Connection Error: API key ya server down hai." });
    }
}
