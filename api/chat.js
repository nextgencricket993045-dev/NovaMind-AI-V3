// ====================================================================
// NovaMind AI V4 - Master Production Backend (Multi-Search API Engine)
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const { message, generationMode, aspectRatio, image, fileData, fileType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ reply: "⚠️ Gemini API key integration missing from Vercel config." });
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
    
    // 🌐 Multi-Search API Aggregator Emulation
    let searchContext = "";
    const lowerMessage = (message || "").toLowerCase();
    
    if (lowerMessage.includes("news") || lowerMessage.includes("latest") || lowerMessage.includes("aaj ki")) {
        searchContext = "\n[Live News System Context: Fetching current ongoing viral media events, global technology transformations, and digital video updates of 2026.]";
    }
    if (lowerMessage.includes("youtube") || lowerMessage.includes("video trend") || lowerMessage.includes("shorts trend")) {
        searchContext = "\n[YouTube API Search Hub Context: Extracting high retention patterns, trending creator frameworks, high CTR metadata analysis, and viral tags ranking high right now.]";
    }

    partsArray.push({ text: (message || "") + searchContext + "\nExplain beautifully and simply." });

    const requestBody = {
        contents: [{ parts: partsArray }],
        tools: [{ googleSearch: {} }], // Real-time continuous web grounding matrix active
        systemInstruction: { 
            parts: [{ 
                text: "You are NovaMind AI V4, an elite educational mentor and content development expert. Your task is to analyze inputs, live news markers, or YouTube search queries and present them in an EXTREMELY SIMPLE, student-friendly way using Hindi-English (Hinglish). Use bullet points, clear steps, and very clean explanations so an average student can understand everything easily. Do not drop long scary code scripts. ALWAYS append a structured '📊 DISCOVERABILITY & SEO METRICS' block at the bottom with 3 High-CTR Titles, 10 tags comma-separated, and 5 hashtags." 
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
