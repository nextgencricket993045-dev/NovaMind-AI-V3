// ====================================================================
// NovaMind AI V4 - Master Production Backend (Internet Search Agent)
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const { message, generationMode, aspectRatio } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ reply: "⚠️ API Key Missing: Vercel par 'GEMINI_API_KEY' set karein." });
    }

    let finalMediaUrl = null;
    let finalMediaType = null;
    
    // Dynamic Resolution Parameters Logic
    let resWidth = 1024;
    let resHeight = 1024;
    if (aspectRatio === "16:9") { resWidth = 1280; resHeight = 720; } 
    else if (aspectRatio === "9:16") { resWidth = 720; resHeight = 1280; }

    const cleanPrompt = encodeURIComponent((message || "creative design").replace(/[^a-zA-Z0-9 ]/g, "").trim());
    const randomSeed = Math.floor(Math.random() * 1000000);

    // Multiformat Asset Pipeline (Pollinations AI)
    if (generationMode === "image") {
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=${resWidth}&height=${resHeight}&seed=${randomSeed}&enhance=true`;
    } 
    else if (generationMode === "video") {
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}%20cinematic%20motion%20sequence%20animation?width=${resWidth}&height=${resHeight}&seed=${randomSeed}`;
    } 
    else if (generationMode === "audio") {
        finalMediaType = "audio";
        finalMediaUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${cleanPrompt}%20music%20segment`;
    }

    // System Orchestration & Growth Context Blueprint
    let requestBody = {
        contents: [{ parts: [{ text: message || "Hello" }] }]
    };

    if (generationMode === "chat") {
        // Advanced Content Creator Prompt with Tools Config
        requestBody = {
            contents: [{ parts: [{ text: message || "Hello" }] }],
            // 🌐 CRITICAL: Enable Live Google Search Grounding Tool
            tools: [{ googleSearch: {} }],
            systemInstruction: {
                parts: [{
                    text: "You are NovaMind AI V4, an elite AI Agent and content developer expert. If the user mentions any video concept, story idea, script request, current news, or channel strategy, use the google search tool to fetch real-time fresh facts. ALWAYS append a structured '📊 DISCOVERABILITY & SEO METRICS' block at the bottom containing: 3 High-CTR Titles, 10 optimized search tags comma-separated, and 5 viral hashtags. Keep your tone direct, in English/Hindi mix."
                }]
            }
        };
    }

    try {
        // Using stable v1beta API endpoint for advanced tools configuration
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

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
        }

        return res.status(200).json({ 
            reply: reply, 
            mediaUrl: finalMediaUrl, 
            mediaType: finalMediaType 
        });

    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Server Connection Crash: ${error.message}` });
    }
}
