// ====================================================================
// NovaMind AI V4 - Ultimate Stable Production Backend Engine (Final)
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(200).json({ reply: "⚠️ Method Not Allowed." });
    }

    const { message, generationMode, aspectRatio, image, fileData, fileType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ reply: "⚠️ Gemini API key missing from environment configuration." });
    }

    let finalMediaUrl = null; 
    let finalMediaType = null;
    let resWidth = 1280; 
    let resHeight = 720;
    if (aspectRatio === "1:1") { resWidth = 1024; resHeight = 1024; }

    // Dynamic prompt cleansing for absolute direct asset injection
    const targetQuery = (message && message.trim() !== "") ? message.trim() : "masterpiece generation asset";
    const cleanPrompt = encodeURIComponent(targetQuery.replace(/[^a-zA-Z0-9 ]/g, "").trim());
    const randomSeed = Math.floor(Math.random() * 9999999);

    // ⚡ FULL INTERLOCKED MULTIMEDIA ENGINE ROUTING
    if (generationMode === "image") {
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=${resWidth}&height=${resHeight}&seed=${randomSeed}&enhance=true&nologo=true`;
    } else if (generationMode === "video") {
        finalMediaType = "video";
        finalMediaUrl = `https://video.pollinations.ai/p/${cleanPrompt}%20cinematic%20motion%20ultra%20hd?width=${resWidth}&height=${resHeight}&seed=${randomSeed}`;
    } else if (generationMode === "audio") {
        finalMediaType = "audio";
        finalMediaUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${cleanPrompt}`;
    }

    // Prepare content tracking arrays for text queries or analysis models
    let partsArray = [];
    if (image) partsArray.push({ inlineData: { mimeType: "image/jpeg", data: image } });
    if (fileData) {
        let mime = "application/pdf";
        if (fileType === "txt") mime = "text/plain";
        else if (fileType === "video") mime = "video/mp4";
        partsArray.push({ inlineData: { mimeType: mime, data: fileData } });
    }
    
    partsArray.push({ text: targetQuery });

    const systemRules = "You are NovaMind AI V4, an outstanding online school teacher. Explain everything in an EXTREMELY SIMPLE, structural step-by-step manner using clean Hindi-English (Hinglish). Use clear bullet points and bold headers. Formulate math using inline delimiters like $a_n$ or blocks like $$\\frac{1}{3}$$. ALWAYS append a beautiful '📊 DISCOVERABILITY & SEO METRICS' block with 3 High-CTR Titles, 10 tags, and 5 hashtags at the bottom.";

    const requestBody = {
        contents: [{ parts: partsArray }],
        tools: [{ googleSearch: {} }],
        systemInstruction: { parts: [{ text: systemRules }] }
    };

    try {
        // If it's a direct generation asset, we can instantly return vectors or process alongside description texts
        let textReply = "";
        
        if (generationMode === "chat") {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });
            const data = await response.json();
            
            if (data.error) return res.status(200).json({ reply: `⚠️ Google API limit reached: ${data.error.message}` });
            textReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Processing complete.";
        } else {
            // Instant absolute creation feedback loops for non-chat modes
            textReply = `✨ **NovaMind Premium Engine Output Ready!**\n\n**Mode:** ${generationMode.toUpperCase()} Asset Generation\n**Prompt Matrix:** ${targetQuery}\n\nYour creative file stream node is processed successfully. You can stream or use the media control element below.`;
        }

        return res.status(200).json({ reply: textReply, mediaUrl: finalMediaUrl, mediaType: finalMediaType });
    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Server Pipeline Fault: ${error.message}` });
    }
}
