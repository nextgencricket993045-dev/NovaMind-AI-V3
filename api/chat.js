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

if (req.body.message) {
  userParts.push({
    text: req.body.message
  });
}

if (req.body.image) {

  userParts.push({

    inlineData: {

      mimeType: "image/jpeg",

      data: req.body.image.replace(
        /^data:image\/[a-zA-Z]+;base64,/,
        ""
      )

    }

  });

}

chatMemory[userId].push({

  role: "user",

  parts: userParts

});

  try {
const contents = chatMemory[userId];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
    contents: contents,
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
         }
       })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({
        reply: data.error.message
      });
    }

    const aiReply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini.";

    chatMemory[userId].push({
      role: "model",
      parts: [
        {
          text: aiReply
        }
      ]
    });

    return res.status(200).json({
      reply: aiReply
    });

  } catch (error) {

    return res.status(500).json({
      reply: error.message
    });

  }

}