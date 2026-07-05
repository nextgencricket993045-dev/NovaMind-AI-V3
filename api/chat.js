// ====================================================================
// NovaMind AI V4 - Master Production Backend (Multi-Format File Engine)
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const { message, generationMode, aspectRatio, image, fileData, fileName, fileType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ reply: "⚠️ API Key Missing: Vercel Dashboard par check karein." });
    }

    let finalMediaUrl = null;
    let finalMediaType = null;
    
    let resWidth = 1280;
    let resHeight = 720;
    if (aspectRatio === "1:1") { resWidth = 1024; resHeight = 1024; }
    else if (aspectRatio === "9:16") { resWidth = 720; resHeight = 1280; }

    const cleanPrompt = encodeURIComponent((message || "creative design cinematics").replace(/[^a-zA-Z0-9 ]/g, "").trim());
    const randomSeed = Math.floor(Math.random() * 9999999);

    // 🎬 HIGH-QUALITY MULTI-FORMAT MEDIA PIPELINE
    if (generationMode === "image") {
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=${resWidth}&height=${resHeight}&seed=${randomSeed}&enhance=true`;
    } 
    else if (generationMode === "video") {
        finalMediaType = "video";
        finalMediaUrl = `https://video.pollinations.ai/p/${cleanPrompt}%204k%20cinematic%20motion%20sequence%20masterpiece?width=${resWidth}&height=${resHeight}&seed=${randomSeed}`;
    } 
    else if (generationMode === "audio") {
        finalMediaType = "audio";
        finalMediaUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${cleanPrompt}`;
    }

    // 📄 MULTI-PART CONTEXT ASSEMBLE (Images + Documents)
    let partsArray = [];

    if (image) {
        partsArray.push({ inlineData: { mimeType: "image/jpeg", data: image } });
    }

    if (fileData) {
        let detectedMime = "application/pdf";
        if (fileType === "txt") detectedMime = "text/plain";
        else if (fileType === "docx") detectedMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        partsArray.push({ inlineData: { mimeType: detectedMime, data: fileData } });
    }

    partsArray.push({ text: message || "Analyze the attached multi-part document structure parameters thoroughly." });

    const requestBody = {
        contents: [{ parts: partsArray }],
        tools: [{ googleSearch: {} }], // Live Internet Grounding Enabled
        systemInstruction: {
            parts: [{
                text: "You are NovaMind AI V4, an elite expert content strategist. If data or file parameters are given, read them contextually. ALWAYS append an automated '📊 DISCOVERABILITY & SEO METRICS' block at the bottom with: 3 High-CTR Titles, 10 tags comma-separated, and 5 hashtags."
            }]
        }
    };

    try {
        // High Quota limits model implementation to completely avoid 429 quota exhaustion bugs
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.error) {
            return res.status(200).json({ reply: `⚠️ Google Engine Error: ${data.error.message}` });
        }

        let reply = "Processing complete. Workspace updated.";
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                reply = candidate.content.parts[0].text;
            }
        }

        return res.status(200).json({ reply: reply, mediaUrl: finalMediaUrl, mediaType: finalMediaType });

    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Server Gateway Interruption: ${error.message}` });
    }
}
