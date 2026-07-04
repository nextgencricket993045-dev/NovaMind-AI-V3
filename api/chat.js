// ===================================================
// NovaMind AI V3 - Backend Serverless Function
// ===================================================

const chatMemory = {};

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      reply: "Method Not Allowed"
    });
  }

  const userId = req.headers["x-forwarded-for"] || "default";

  if (!chatMemory[userId]) {
    chatMemory[userId] = [];
  }

  const userParts = [];
  let userPrompt = req.body.message || "";

  // 📝 Agar TXT file upload hui hai, toh uska text context me jodein
  if (req.body.fileType === "txt" && req.body.fileData) {
    userPrompt = `[Attached File: ${req.body.fileName}]\nContent:\n${req.body.fileData}\n\n${userPrompt}`;
  }
  
  // 📄 Note: PDF aur DOCX ke liye hum frontend se text/base64 bhej rahe hain, unhe direct string context me handle kar rahe hain abhi ke liye
  if ((req.body.fileType === "pdf" || req.body.fileType === "docx") && req.body.fileData) {
    userPrompt = `[Uploaded ${req.body.fileType.toUpperCase()} Document: ${req.body.fileName}]\nUser wants you to analyze this document context.\n\n${userPrompt}`;
  }

  // Final User Text Part add karein
  if (userPrompt.trim() !== "") {
    userParts.push({
      text: userPrompt
    });
  }

  // 📷 Image handling (Gemini Vision)
  if (req.body.image) {
    const match = req.body.image.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/
    );

    if (match) {
      userParts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  // System instructions for Gemini
  const systemInstruction = {
    role: "user",
    parts: [
      {
        text: `You are NovaMind AI.

If the user uploads an image or a text file/document context, handle it accordingly:
- Maths questions → solve step by step.
- Physics questions → explain formula and solve.
- Chemistry questions → explain and answer.
- Biology questions → explain clearly.
- Notes / TXT Files → summarize, explain, and answer based on the file content.
- Graphs/Tables → analyze them.
- Normal photos → describe them.

Always reply in the same language as the user.`
      }
    ]
  };

  const contents = [
    systemInstruction,
    ...chatMemory[userId],
    {
      role: "user",
      parts: userParts
    }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
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

    const aiReply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini.";

    // Memory me clean user prompt save karein (bina lambe file data ke taaki tokens waste na hon)
    if (req.body.message && req.body.message.trim() !== "") {
      chatMemory[userId].push({
        role: "user",
        parts: [
          {
            text: req.body.message
          }
        ]
      });
    } else if (req.body.fileName) {
      chatMemory[userId].push({
        role: "user",
        parts: [
          {
            text: `[Analyzed File: ${req.body.fileName}]`
          }
        ]
      });
    }

    chatMemory[userId].push({
      role: "model",
      parts: [
        {
          text: aiReply
        }
      ]
    });

    // Sirf aakhri 20 messages memory me rakhein
    if (chatMemory[userId].length > 20) {
      chatMemory[userId] = chatMemory[userId].slice(-20);
    }

    return res.status(200).json({
      reply: aiReply
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      reply: error.message || "Internal Server Error"
    });
  }
}
