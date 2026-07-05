// ====================================================================
// NovaMind AI V4 - Premium Safe Multimodal API Engine (Crash Free Mode)
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const { message, generationMode, aspectRatio, image, fileData, fileType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ reply: "⚠️ Gemini API key integration missing from environment setup." });
    }

    let finalMediaUrl = null; let finalMediaType = null;
    let resWidth = 1280; let resHeight = 720;
    if (aspectRatio === "1:1") { resWidth = 1024; resHeight = 1024; }

    const cleanPrompt = encodeURIComponent((message || "masterpiece study").replace(/[^a-zA-Z0-9 ]/g, "").trim());
    const randomSeed = Math.floor(Math.random() * 8888888);

    if (generationMode === "image") {
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=${resWidth}&height=${resHeight}&seed=${randomSeed}&enhance=true`;
    } else if (generationMode === "video") {
        finalMediaType = "video";
        finalMediaUrl = `https://video.pollinations.ai/p/${cleanPrompt}%204k%20raw%20motion?width=${resWidth}&height=${resHeight}&seed=${randomSeed}`;
    } else if (generationMode === "audio") {
        finalMediaType = "audio";
        finalMediaUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${cleanPrompt}`;
    }

    let partsArray = [];
    if (image) partsArray.push({ inlineData: { mimeType: "image/jpeg", data: image } });
    if (fileData) {
        let mime = fileType === "txt" ? "text/plain" : fileType === "video" ? "video/mp4" : "application/pdf";
        partsArray.push({ inlineData: { mimeType: mime, data: fileData } });
    }
    partsArray.push({ text: message || "Analyze data context step by step." });

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: partsArray }],
                tools: [{ googleSearch: {} }],
                systemInstruction: { parts: [{ text: "You are NovaMind AI V4, an expert online school teacher. Your task is to analyze user queries, attached image questions, videos or documents and explain the solution in an EXTREMELY SIMPLE, clear, student-friendly way using Hindi-English (Hinglish). Break down physics, chemistry, coding logic or general text questions into small basic interactive blocks that a normal student can grab effortlessly. Do not give massive scary hard code files. Always append a beautiful '📊 DISCOVERABILITY & SEO METRICS' block with 3 Titles, 10 tags, and 5 hashtags at the very bottom." }] }
            })
        });

        const data = await response.json();
        let reply = "Processing complete.";
        if (data.candidates && data.candidates.length > 0) {
            const parts = data.candidates[0].content?.parts;
            if (parts && parts.length > 0) reply = parts[0].text;
        }

        return res.status(200).json({ reply, mediaUrl: finalMediaUrl, mediaType: finalMediaType });
    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Server Gateway Failure: ${error.message}` });
    }
}
