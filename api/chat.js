// ====================================================================
// NovaMind AI V3 - Ultimate Multi-Engine Backend Node (Dynamic Media)
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
    let originalUserMessage = requestBody.message || "creative asset";
    let computedUserPrompt = originalUserMessage;
    const currentMode = requestBody.generationMode || "chat";
    
    let systemContextLayer = "";
    const payloadParts = [];

    if (requestBody.fileType === "video" && requestBody.fileData) {
        const match = requestBody.fileData.match(/^data:(video\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
        if (match) payloadParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    } else if (requestBody.fileType && requestBody.fileData) {
        const type = requestBody.fileType;
        if (type === "txt") {
            systemContextLayer = `[Source File Code Context: ${requestBody.fileName}]\n${requestBody.fileData}`;
        } else {
            const contentPayload = extractStructuralDocumentData(requestBody.fileData, type);
            systemContextLayer = `[Processed Data Context Structure: ${requestBody.fileName}]\n${contentPayload}`;
        }
    }

    if (systemContextLayer !== "") {
        computedUserPrompt = `${systemContextLayer}\n\nInstruction: ${computedUserPrompt}`;
    }

    if (currentMode === "image") {
        computedUserPrompt = `[CRITICAL DIRECTIVE: The user wants to generate an IMAGE for the prompt: "${originalUserMessage}". Briefly describe the visual layout of this specific request in 2 sentences in English/Hindi and confirm it below.]`;
    } else if (currentMode === "video") {
        computedUserPrompt = `[CRITICAL DIRECTIVE: The user wants to generate a VIDEO for the prompt: "${originalUserMessage}". Briefly describe the cinematic clip in 2 sentences in English/Hindi and confirm it below.]`;
    }

    if (computedUserPrompt.trim() !== "") payloadParts.push({ text: computedUserPrompt });

    if (requestBody.image) {
        const processingMatch = requestBody.image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
        if (processingMatch) payloadParts.push({ inlineData: { mimeType: processingMatch[1], data: processingMatch[2] } });
    }

    const structuralInstructions = [
        {
            role: "user",
            parts: [{ text: `You are NovaMind AI Ultra Enterprise running in 2026. Always respond naturally in English or Hindi (or mix).` }]
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
                body: JSON.stringify({ contents: structuralInstructions, generationConfig: { temperature: 0.5, maxOutputTokens: 500 } })
            }
        );

        const internalJson = await cloudGatewayResponse.json();
        let modelOutputText = internalJson.candidates?.[0]?.content?.parts?.[0]?.text || "Processing completed.";

        let finalMediaUrl = null;
        let finalMediaType = null;

        if (currentMode === "image") {
            finalMediaType = "image";
            // FIXED: Clean keywords filter to match user prompt directly with Unsplash Live Source Engine
            const keywords = originalUserMessage.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, ",");
            finalMediaUrl = `https://images.unsplash.com/featured/?${keywords || "nature"}`; 
        } else if (currentMode === "video") {
            finalMediaType = "video";
            finalMediaUrl = `https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-42358-large.mp4`; 
        }

        if (requestBody.message && requestBody.message.trim() !== "") {
            chatMemory[clientInstanceToken].push({ role: "user", parts: [{ text: requestBody.message }] });
        }
        chatMemory[clientInstanceToken].push({ role: "model", parts: [{ text: modelOutputText }] });

        if (chatMemory[clientInstanceToken].length > 10) chatMemory[clientInstanceToken] = chatMemory[clientInstanceToken].slice(-10);

        return res.status(200).json({ 
            reply: modelOutputText, 
            mediaUrl: finalMediaUrl, 
            mediaType: finalMediaType 
        });

    } catch (crashErr) {
        return res.status(500).json({ reply: "Engine Gateway Exception Error." });
    }
}
