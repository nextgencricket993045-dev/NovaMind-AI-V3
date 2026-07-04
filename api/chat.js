// ====================================================================
// NovaMind AI V3 - Gemini 2.5 Flash Stable Engine
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const { message, generationMode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. API Key Check
    if (!apiKey) {
        return res.status(200).json({ reply: "⚠️ API Key Missing: Vercel par 'GEMINI_API_KEY' set karein." });
    }

    let finalMediaUrl = null;
    let finalMediaType = null;

    // 2. Free Media Generation Pipeline
    if (generationMode === "image" || generationMode === "video") {
        const cleanPrompt = encodeURIComponent((message || "creative design").replace(/[^a-zA-Z0-9 ]/g, "").trim());
        const randomSeed = Math.floor(Math.random() * 1000000);
        finalMediaType = "image";
        
        if (generationMode === "image") {
            finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=1024&height=1024&seed=${randomSeed}&enhance=true`;
        } else {
            finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}%20motion%20animation%20loop?width=800&height=500&seed=${randomSeed}`;
        }
    }

    // 3. Google Gemini 2.5 Flash Pipeline
    try {
        // FIXED: Using gemini-2.5-flash with v1beta as supported by your API key
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message || "Hello" }] }]
            })
        });

        const data = await response.json();

        // 4. Strict Error & Safety Handling
        if (data.error) {
            return res.status(200).json({ reply: `⚠️ Google API Error: ${data.error.message}` });
        }

        let reply = "Processing complete, par AI ne kuch nahi likha.";
        
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                reply = candidate.content.parts[0].text;
            } else if (candidate.finishReason) {
                reply = `⚠️ Blocked by Google Safety Filter. Reason: ${candidate.finishReason}`;
            }
        } else if (data.promptFeedback) {
            reply = `⚠️ Prompt Blocked. Reason: ${data.promptFeedback.blockReason}`;
        }

        // Return output to frontend
        return res.status(200).json({ 
            reply: reply, 
            mediaUrl: finalMediaUrl, 
            mediaType: finalMediaType 
        });

    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Server Connection Crash: ${error.message}` });
    }
}
