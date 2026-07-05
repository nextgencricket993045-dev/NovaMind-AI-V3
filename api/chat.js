// ====================================================================
// NovaMind AI V4 - Premium Student Friendly & Multimodal Backend Engine
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const { message, generationMode, aspectRatio, image, fileData, fileName, fileType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ reply: "⚠️ Vercel Dashboard config check karein. API Key missing." });
    }

    let finalMediaUrl = null;
    let finalMediaType = null;
    
    let resWidth = 1280;
    let resHeight = 720;
    if (aspectRatio === "1:1") { resWidth = 1024; resHeight = 1024; }
    else if (aspectRatio === "9:16") { resWidth = 720; resHeight = 1280; }

    const cleanPrompt = encodeURIComponent((message || "cinematic master study").replace(/[^a-zA-Z0-9 ]/g, "").trim());
    const randomSeed = Math.floor(Math.random() * 8888888);

    if (generationMode === "image") {
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=${resWidth}&height=${resHeight}&seed=${randomSeed}&enhance=true`;
    } 
    else if (generationMode === "video") {
        finalMediaType = "video";
        finalMediaUrl = `https://video.pollinations.ai/p/${cleanPrompt}%204k%20raw%20cinematic%20motion?width=${resWidth}&height=${resHeight}&seed=${randomSeed}`;
    } 
    else if (generationMode === "audio") {
        finalMediaType = "audio";
        finalMediaUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${cleanPrompt}`;
    }

    let partsArray = [];

    // Auto-detect base64 components (Images, Large Videos, Documents)
    if (image) {
        partsArray.push({ inlineData: { mimeType: "image/jpeg", data: image } });
    }
    if (fileData) {
        let mime = "application/pdf";
        if (fileType === "txt") mime = "text/plain";
        else if (fileType === "video") mime = "video/mp4"; // Stream large video binaries seamlessly
        else if (fileType === "docx") mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        partsArray.push({ inlineData: { mimeType: mime, data: fileData } });
    }

    partsArray.push({ text: message || "Explain the concept or content step by step simply." });

    const requestBody = {
        contents: [{ parts: partsArray }],
        tools: [{ googleSearch: {} }],
        systemInstruction: {
            parts: [{
                text: "You are NovaMind AI V4, a world-class teacher and content mentor. Your mission is to explain things in an EXTREMELY SIMPLE, student-friendly manner using a mix of Hindi and English (Hinglish). Avoid long code dumps or overly complex mathematical jargon unless explicitly asked. Break down problems (like physics, maths, or text questions from images/PDFs/Videos) step-by-step so a normal student can understand effortlessly. Always append a concise '📊 DISCOVERABILITY & SEO METRICS' panel at the bottom with 3 Titles, 10 tags, and 5 hashtags."
            }]
        }
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.error) {
            return res.status(200).json({ reply: `⚠️ Google Engine Demand Error: ${data.error.message}` });
        }

        let reply = "Processing complete.";
        if (data.candidates && data.candidates.length > 0) {
            const parts = data.candidates[0].content?.parts;
            if (parts && parts.length > 0) reply = parts[0].text;
        }

        return res.status(200).json({ reply, mediaUrl: finalMediaUrl, mediaType: finalMediaType });

    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Gateway Fault: ${error.message}` });
    }
}
