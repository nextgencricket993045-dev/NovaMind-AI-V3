const chatMemory = {};

function decodeBase64ToText(base64Data) {
    try {
        const cleanBase64 = base64Data.split(',')[1] || base64Data;
        return Buffer.from(cleanBase64, 'base64').toString('utf-8').replace(/[^\x20-\x7E\t\r\n]/g, ''); 
    } catch (e) { return ""; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

  const userId = req.headers["x-forwarded-for"] || "default";
  if (!chatMemory[userId]) chatMemory[userId] = [];

  const userParts = [];
  let userPrompt = req.body.message || "";
  let extractedContext = "";

  if (req.body.fileType === "txt" && req.body.fileData) {
    extractedContext = `[File Content: ${req.body.fileName}]\n${req.body.fileData}`;
  } else if ((req.body.fileType === "pdf" || req.body.fileType === "docx") && req.body.fileData) {
    const rawText = decodeBase64ToText(req.body.fileData);
    extractedContext = `[Document Content: ${req.body.fileName}]\n${rawText.substring(0, 9000)}`;
  }

  if (extractedContext !== "") {
    userPrompt = `${extractedContext}\n\nUser Question: ${userPrompt || "Summarize the document."}`;
  }

  if (userPrompt.trim() !== "") userParts.push({ text: userPrompt });

  if (req.body.image) {
    const match = req.body.image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (match) userParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }

  // System Prompt instructing model to utilize deep web knowledge structure
  const contents = [
    {
      role: "user",
      parts: [{ text: "You are NovaMind AI running with real-time Google Web Search access. Use live internet patterns or news data up to the current year 2026 to answer any modern events, queries, or coding structures accurately in the user's language." }]
    },
    ...chatMemory[userId],
    { role: "user", parts: userParts }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } })
      }
    );

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ reply: "Gemini API Error" });

    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";

    if (req.body.message && req.body.message.trim() !== "") {
      chatMemory[userId].push({ role: "user", parts: [{ text: req.body.message }] });
    }
    chatMemory[userId].push({ role: "model", parts: [{ text: aiReply }] });

    if (chatMemory[userId].length > 14) chatMemory[userId] = chatMemory[userId].slice(-14);

    return res.status(200).json({ reply: aiReply });
  } catch (error) {
    return res.status(500).json({ reply: "Internal Server Crash." });
  }
}
