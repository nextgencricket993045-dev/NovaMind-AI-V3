// ====================================================================
// NovaMind AI V4 - Premium Master Production Backend Engine (Fixed Content Payload)
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(200).json({ reply: "⚠️ Method Not Allowed." });
    }

    const { message, generationMode, aspectRatio, image, fileData, fileType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ reply: "⚠️ Gemini API key missing from Vercel environment variables." });
    }

    let finalMediaUrl = null; 
    let finalMediaType = null;
    let resWidth = 1280; 
    let resHeight = 720;
    if (aspectRatio === "1:1") { resWidth = 1024; resHeight = 1024; }

    const cleanPrompt = encodeURIComponent((message || "masterpiece").replace(/[^a-zA-Z0-9 ]/g, "").trim());
    const randomSeed = Math.floor(Math.random() * 8888888);

    // Multimedia Asset Generation Routing
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

    // 📄 Build Multi-Part Payload Structure correctly
    let partsArray = [];
    
    if (image) {
        partsArray.push({ inlineData: { mimeType: "image/jpeg", data: image } });
    }
    
    if (fileData) {
        let mime = "application/pdf";
        if (fileType === "txt") mime = "text/plain";
        else if (fileType === "video") mime = "video/mp4";
        partsArray.push({ inlineData: { mimeType: mime, data: fileData } });
    }
    
    // Safety Fallback
    const textQuery = (message && message.trim() !== "") ? message.trim() : "Explain the attached file content contextually.";
    partsArray.push({ text: textQuery });

    // 🎓 Super strict educational formatting module injected here:
    const systemRules = "You are NovaMind AI V4, an outstanding online school teacher. " +
        "Your absolute goal is to explain complex topics (Maths, Physics, Chemistry, etc.) in a crystal-clear, structural manner using highly simplified Hindi-English (Hinglish). " +
        "NEVER write long, ugly paragraphs or mixed sentences. " +
        "FOLLOW THIS EXACT STRUCTURE FOR EVERY ANSWER:\n" +
        "1. 📌 SUMMARY/DEFINITION: Explain the core concept in just 2 simple lines.\n" +
        "2. 🔍 STEP-BY-STEP BREAKDOWN: Use bold numbered lists or bullet points. Keep each step separate and clean.\n" +
        "3. 🧪 FORMULA / EQUATIONS: Always format mathematical formulations with standard inline delimiters like $a_n$ or standalone blocks like $$\\frac{1}{3}$$ so they render beautifully.\n" +
        "4. 💡 REAL-LIFE EXAMPLE: Give a practical example that an average student can easily visualize.\n" +
        "At the very bottom, always append a beautiful '📊 DISCOVERABILITY & SEO METRICS' block with 3 High-CTR Titles, 10 comma-separated tags, and 5 hashtags.";

    const requestBody = {
        contents: [{ parts: partsArray }],
        tools: [{ googleSearch: {} }],
        systemInstruction: { 
            parts: [{ text: systemRules }] 
        }
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const rawText = await response.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch(parseErr) {
            return res.status(200).json({ reply: `⚠️ Server Error: ${rawText.substring(0, 80)}` });
        }

        if (data.error) {
            return res.status(200).json({ reply: `⚠️ Google API Quota Exception: ${data.error.message}` });
        }

        let reply = "Processing complete, but model returned an empty string format.";
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            reply = data.candidates[0].content.parts[0].text;
        }

        return res.status(200).json({ reply, mediaUrl: finalMediaUrl, mediaType: finalMediaType });
    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Server Gateway Interruption: ${error.message}` });
    }
}
