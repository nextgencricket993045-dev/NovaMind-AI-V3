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

  if (req.body.message && req.body.message.trim() !== "") {
    userParts.push({
      text: req.body.message
    });
  }

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

  // Image memory में save नहीं होगी
  const systemInstruction = {
  role: "user",
  parts: [
    {
      text: `You are NovaMind AI.

If the uploaded image contains:
- Maths questions → solve step by step.
- Physics questions → explain formula and solve.
- Chemistry questions → explain and answer.
- Biology questions → explain clearly.
- Notes → summarize and explain.
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

    // सिर्फ Text memory में save होगी
    if (req.body.message && req.body.message.trim() !== "") {
      chatMemory[userId].push({
        role: "user",
        parts: [
          {
            text: req.body.message
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

    // सिर्फ आखिरी 20 messages रखो
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