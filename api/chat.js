// ===================================================
// NovaMind AI V3 - Backend (With File Parsers)
// ===================================================

const chatMemory = {};

// Simple Base64 Decoder helper for Text extraction
function decodeBase64ToText(base64Data) {
    try {
        const cleanBase64 = base64Data.split(',')[1] || base64Data;
        const buffer = Buffer.from(cleanBase64, 'base64');
        // Pure text extraction format
        return buffer.toString('utf-8').replace(/[^\x20-\x7E\t\r\n]/g, ''); 
    } catch (e) {
        return "";
    }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method Not Allowed" });
  }

  const userId = req.headers["x-forwarded-for"] || "default";

  if (!chatMemory[userId]) {
    chatMemory[userId] = [];
  }

  const userParts = [];
  let userPrompt = req.body.message || "";
  let extractedContext = "";

  // 📝 1. Handling TXT Files
  if (req.body.fileType === "txt" && req.body.fileData) {
    extractedContext = `[Attached TXT File: ${req.body.fileName}]\nContent:\n${req.body.fileData}`;
  }
  
  // 📄 2. Handling PDF Files
  if (req.body.fileType === "pdf" && req.body.fileData) {
    const rawText = decodeBase64ToText(req.body.fileData);
    // PDF files contain raw strings, extracting readable parts
    const cleanText = rawText.substring(0, 8000); // Limit to 8k chars for stability
    extractedContext = `[Attached PDF Document: ${req.body.fileName}]\nExtracted Content Placeholder:\n${cleanText}`;
  }

  // 📁 3. Handling DOCX Files
  if (req.body.fileType === "docx" && req.body.fileData) {
    const rawText = decodeBase64ToText(req.body.fileData);
    const cleanText = rawText.substring(0, 8000);
    extractedContext = `[Attached Word Document: ${req.body.fileName}]\nExtracted Content Placeholder:\n${cleanText}`;
  }

  // Inject Context into Prompt if available
  if (extractedContext !== "") {
    userPrompt = `${extractedContext}\n\nUser Question/Instruction: ${userPrompt || "Analyze this file content and summarize it."}`;
  }

  // Final User Text Part
  if (userPrompt.trim() !== "") {
    userParts.push({ text: userPrompt });
  }

  // 📷 Image handling (Gemini Vision)
  if (req.body.image) {
    const match = req.body.image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (match) {
      userParts.push({
        inlineData: { mimeType: match[1], data: match[2] }
      });
    }
  }

  // System instructions for Gemini
  const systemInstruction = {
    role: "user",
    parts: [
      {
        text: `You are NovaMind AI.
You have advanced capabilities to read documents. If the user attaches a PDF, DOCX, or TXT file, look at the extracted content provided in the prompt structure.
- Analyze documents, summarize them, or answer specific user queries from them.
- If it's a code file or mathematical question inside the document, extract and solve it step-by-step.
Always reply in the same language as the user.`
      }
    ]
  };

  const contents = [
    systemInstruction,
    ...chatMemory[userId],
    { role: "user", parts: userParts }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(response.status).json({
        reply: data.error?.message || "Gemini API Error"
      });
    }

    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";

    // Memory Management (Clean storage)
    if (req.body.message && req.body.message.trim() !== "") {
      chatMemory[userId].push({
        role: "user",
        parts: [{ text: req.body.message }]
      });
    } else if (req.body.fileName) {
      chatMemory[userId].push({
        role: "user",
        parts: [{ text: `[Analyzed Document: ${req.body.fileName}]` }]
      });
    }

    chatMemory[userId].push({
      role: "model",
      parts: [{ text: aiReply }]
    });

    if (chatMemory[userId].length > 20) {
      chatMemory[userId] = chatMemory[userId].slice(-20);
    }

    return res.status(200).json({ reply: aiReply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ reply: error.message || "Internal Server Error" });
  }
}
