// ====================================================================
// NovaMind AI V4 - Ultimate Stable Production Backend Engine
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(200).json({ reply: "⚠️ Method Not Allowed." });
    }

    const { message, generationMode, aspectRatio, image, fileData, fileType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ reply: "⚠️ Gemini API key missing from configuration." });
    }

    let finalMediaUrl = null; 
    let finalMediaType = null;
    let resWidth = 1280; 
    let resHeight = 720;
    if (aspectRatio === "1:1") { resWidth = 1024; resHeight = 1024; }

    const targetQuery = (message && message.trim() !== "") ? message.trim() : "Explain or extract details from the uploaded matrix file structure completely.";
    const cleanPrompt = encodeURIComponent(targetQuery.replace(/[^a-zA-Z0-9 ]/g, "").trim());
    const randomSeed = Math.floor(Math.random() * 9999999);

    if (generationMode === "image") {
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=${resWidth}&height=${resHeight}&seed=${randomSeed}&enhance=true&nologo=true`;
    }

    // Dynamic Multi-Modal Parts Array Constructor
    let partsArray = [];
    if (image) {
        partsArray.push({ inlineData: { mimeType: "image/jpeg", data: image } });
    }
    
    if (fileData) {
        let mime = "application/pdf";
        if (fileType === "txt") mime = "text/plain";
        else if (fileType === "video") mime = "video/mp4"; // 🎥 Native Multi-modal Stream Map
        else if (fileType === "docx") mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        
        partsArray.push({ inlineData: { mimeType: mime, data: fileData } });
    }
    partsArray.push({ text: targetQuery });

    const systemRules = "You are NovaMind AI V4, an outstanding online school teacher and deep multimedia video analyst. If a video/file is provided, extract its key timeline frames details precisely. Explain everything in clean Hindi-English (Hinglish) using bold headers and bullets. Formulate math using delimiters like $a_n$ or blocks like $$\\frac{1}{3}$$. ALWAYS append '📊 DISCOVERABILITY & SEO METRICS' with 3 High-CTR Titles, 10 tags, and 5 hashtags at the bottom.";

    const requestBody = {
        contents: [{ parts: partsArray }],
        tools: [{ googleSearch: {} }],
        systemInstruction: { parts: [{ text: systemRules }] }
    };

    try {
        let textReply = "";
        if (generationMode === "image") {
            textReply = `✨ **NovaMind Premium Image Ready!**\n\nAapki creative HD image niche live render ho chuki hai. Right click karke save karein.`;
            return res.status(200).json({ reply: textReply, mediaUrl: finalMediaUrl, mediaType: finalMediaType });
        }

        // Using high-speed token lite layer for handling deep video analytics contexts
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        textReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Processing and analysis complete.";

        return res.status(200).json({ reply: textReply, mediaUrl: null, mediaType: null });
    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Server Pipeline Fault: ${error.message}` });
    }
}
