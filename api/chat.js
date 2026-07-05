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

    const targetQuery = (message && message.trim() !== "") ? message.trim() : "Explain the uploaded file data structures completely.";
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
        else if (fileType === "video") mime = "video/mp4";
        else if (fileType === "docx") mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        
        // Safety Barrier: If base64 payload length exceeds 20MB (~27,000,000 chars), handle gracefully
        if (fileData.length > 27000000 && fileType === "video") {
            partsArray.push({ text: `[User attached a massive video file chunk metadata named payload. Analyze query context with maximum priority.]` });
        } else {
            partsArray.push({ inlineData: { mimeType: mime, data: fileData } });
        }
    }
    partsArray.push({ text: targetQuery });

    const systemRules = "You are NovaMind AI V4, an outstanding online school teacher and media data analyst. Explain everything in clean Hindi-English (Hinglish) using bold headers and bullets. Formulate math using delimiters like $a_n$ or blocks like $$\\frac{1}{3}$$. ALWAYS append '📊 DISCOVERABILITY & SEO METRICS' with 3 High-CTR Titles, 10 tags, and 5 hashtags at the bottom.";

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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });
        
        // Check if response is valid json or text error page
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            return res.status(200).json({ reply: "⚠️ **File Size Limit Exceeded**: Yeh video server limits ke hisab se bohot badi hai. Kripya 20MB se choti video clip use karein taaki data pipeline crash na ho." });
        }

        const data = await response.json();
        
        if (data.error) {
            return res.status(200).json({ reply: `⚠️ **API Error**: ${data.error.message}` });
        }
        
        textReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Processing and analysis complete.";
        return res.status(200).json({ reply: textReply, mediaUrl: null, mediaType: null });

    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Server Pipeline Fault: ${error.message}` });
    }
}
