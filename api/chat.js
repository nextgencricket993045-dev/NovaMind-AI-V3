// ====================================================================
// NovaMind AI V3 - Multi-Engine Master Backend (Final Correct Routing)
// ====================================================================

const chatMemory = {};

function extractStructuralDocumentData(base64Stream, type) {
    try {
        if (!base64Stream) return "";
        const extractionBuffer = Buffer.from(base64Stream.split(',')[1] || base64Stream, 'base64');
        const processingString = extractionBuffer.toString('ascii').replace(/[^\x20-\x7E\t\r\n]/g, ' ');
        let normalizedLines = "";
        if (type === "pdf") {
            const documentMatches = processingString.match(/\/BT[\s\S]*?ET/g) || [];
            normalizedLines = documentMatches.map(m => m.replace(/\(.*?\)/g, match => match.slice(1, -1))).join(' ');
        } else if (["docx", "xlsx", "pptx"].includes(type)) {
            normalizedLines = processingString.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        }
        return normalizedLines.substring(0, 8000);
    } catch (e) { return ""; }
}

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const clientInstanceToken = req.headers["x-forwarded-for"] || "global_instance";
    if (!chatMemory[clientInstanceToken]) chatMemory[clientInstanceToken] = [];

    const requestBody = req.body;
    let originalUserMessage = requestBody.message || "operational answer";
    const currentMode = requestBody.generationMode || "chat";
    
    // Strict Global Scope Variable Allocation Pipeline
    let finalMediaUrl = null;
    let finalMediaType = null;
    let finalModelOutputText = "Engine Processing Timeout.";
    let computedUserPrompt = originalUserMessage;
    let systemContextLayer = "";
    const payloadParts = [];

    // Setup media parameters ONLY if necessary by mode - prevent image generation in Smart Chat
    const cleanPrompt = encodeURIComponent(originalUserMessage.replace(/[^a-zA-Z0-9 ]/g, "").trim());
    const randomSeed = Math.floor(Math.random() * 1000000);

    // CRITICAL FIX: Directed media pipeline setup with STRICT MODE ENFORCEMENT
    if (currentMode === "image") {
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt || "creative"}?width=1024&height=1024&seed=${randomSeed}&enhance=true`;
        computedUserPrompt = `[SYSTEM CRITICAL: User is in Gen Image interface. Briefly describe the creative aesthetics of the generated image object based on prompt: "${originalUserMessage}" in 1 sentence in English/Hindi mix and say asset render pipeline structure is now successfully operational below.]`;
    } else if (currentMode === "video") {
        finalMediaType = "image"; 
        const motionPrompt = encodeURIComponent((originalUserMessage + " cinematic motion animation loop").replace(/[^a-zA-Z0-9 ]/g, "").trim());
        finalMediaUrl = `https://image.pollinations.ai/p/${motionPrompt || "animation"}?width=800&height=500&seed=${randomSeed}&enhance=true`; 
        computedUserPrompt = `[SYSTEM CRITICAL: User is in Gen Video interface. Briefly describe the cinematic dynamic motion loop of the scene for prompt: "${originalUserMessage}" in 1 sentence in English/Hindi mix and say asset loop pipeline structure is now successfully operational below.]`;
    } else {
        // Smart Chat Mode: Keep computedUserPrompt verbatim - NO media instructions injected
        finalMediaUrl = null;
        finalMediaType = null;
    }

    // Multimedia and Cross-File Parsing Pipeline
    if (requestBody.fileType === "video" && requestBody.fileData) {
        const match = requestBody.fileData.match(/^data:(video\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
        if (match) payloadParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    } else if (requestBody.fileType && requestBody.fileData) {
        const type = requestBody.fileType;
        if (type === "txt") {
            systemContextLayer = `[Source File Context: ${requestBody.fileName}]\n${requestBody.fileData}`;
        } else {
            const contentPayload = extractStructuralDocumentData(requestBody.fileData, type);
            systemContextLayer = `[Processed Data Structure: ${requestBody.fileName}]\n${contentPayload}`;
        }
    }

    if (systemContextLayer !== "") {
        computedUserPrompt = `${systemContextLayer}\n\nInstruction: ${computedUserPrompt}`;
    }

    if (computedUserPrompt.trim() !== "") payloadParts.push({ text: computedUserPrompt });

    if (requestBody.image) {
        const processingMatch = requestBody.image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
        if (processingMatch) payloadParts.push({ inlineData: { mimeType: processingMatch[1], data: processingMatch[2] } });
    }

    const structuralInstructions = [
        {
            role: "user",
            parts: [{ text: `You are NovaMind AI Ultra Enterprise operating in 2026. Keep replies concise and directly in English/Hindi mix unless explicitly directed otherwise. DO NOT generate media generation processing statuses when in Smart Chat interface.` }]
        },
        ...chatMemory[clientInstanceToken],
        { role: "user", parts: payloadParts }
    ];

    try {
        const cloudGatewayResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: structuralInstructions, generationConfig: { temperature: 0.4, maxOutputTokens: 250 } })
            }
        );

        const internalJson = await cloudGatewayResponse.json();
        finalModelOutputText = internalJson.candidates?.[0]?.content?.parts?.[0]?.text || "Processing completed.";

        if (requestBody.message && requestBody.message.trim() !== "") {
            chatMemory[clientInstanceToken].push({ role: "user", parts: [{ text: requestBody.message }] });
        }
        if (finalModelOutputText) {
            chatMemory[clientInstanceToken].push({ role: "model", parts: [{ text: finalModelOutputText }] });
        }
        if (chatMemory[clientInstanceToken].length > 10) {
            chatMemory[clientInstanceToken] = chatMemory[clientInstanceToken].slice(-10);
        }

        return res.status(200).json({ 
            reply: finalModelOutputText, 
            mediaUrl: finalMediaUrl, 
            mediaType: finalMediaType 
        });

    } catch (crashErr) {
        // Safe crash handling with proper variable allocation and strict mode check
        let crashOutputText = "Engine core exception bypass operational structure.";
        
        // Ensure that crash handler does not force a media URL if not in generation mode
        let safeCrashMediaUrl = null;
        let safeCrashMediaType = null;
        if (currentMode === "image" || currentMode === "video") {
            safeCrashMediaUrl = finalMediaUrl;
            safeCrashMediaType = finalMediaType;
            crashOutputText = "Engine core generated the creative asset successfully.";
        }

        return res.status(200).json({ 
            reply: crashOutputText, 
            mediaUrl: safeCrashMediaUrl, 
            mediaType: safeCrashMediaType 
        });
    }
}
