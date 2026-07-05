// ====================================================================
// NovaMind AI V4 - Premium Backend Engine (Database & Auth Integrated)
// ====================================================================

import mongoose from 'mongoose';
import crypto from 'crypto';

// MongoDB Cloud Connection Setup
const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    const dbUri = process.env.MONGODB_URI || "mongodb+srv://admin:novamind2026@cluster.mongodb.net/novamind";
    await mongoose.connect(dbUri);
};

// 💾 Database Schemas
const UserSchema = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, default: 'User' },
    createdAt: { type: Date, default: Date.now }
}));

const ChatSchema = mongoose.models.Chat || mongoose.model('Chat', new mongoose.Schema({
    userEmail: { type: String, required: true },
    title: { type: String, required: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}));

export default async function handler(req, res) {
    await connectDB();

    // 👤 Handle Authentication & History Load Endpoints
    if (req.query.action === "signup") {
        try {
            const { email, password, name } = req.body;
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            const newUser = await UserSchema.create({ email, password: hashedPassword, name });
            return res.status(200).json({ success: true, name: newUser.name, email: newUser.email });
        } catch (e) { return res.status(200).json({ success: false, msg: "Account already exists!" }); }
    }

    if (req.query.action === "login") {
        const { email, password } = req.body;
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        const user = await UserSchema.findOne({ email, password: hashedPassword });
        if (user) return res.status(200).json({ success: true, name: user.name, email: user.email });
        return res.status(200).json({ success: false, msg: "Invalid credentials!" });
    }

    if (req.query.action === "getHistory") {
        const { email } = req.body;
        const history = await ChatSchema.find({ userEmail: email }).sort({ createdAt: -1 }).limit(15);
        return res.status(200).json({ success: true, history });
    }

    // 🤖 Core AI Messaging Pipeline
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const { message, generationMode, aspectRatio, image, fileData, fileType, userEmail } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(200).json({ reply: "⚠️ API Key missing from Vercel config." });

    let finalMediaUrl = null; let finalMediaType = null;
    let resWidth = 1280; let resHeight = 720;
    if (aspectRatio === "1:1") { resWidth = 1024; resHeight = 1024; }

    const cleanPrompt = encodeURIComponent((message || "masterpiece").replace(/[^a-zA-Z0-9 ]/g, "").trim());
    const randomSeed = Math.floor(Math.random() * 8888888);

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

    let partsArray = [];
    if (image) partsArray.push({ inlineData: { mimeType: "image/jpeg", data: image } });
    if (fileData) {
        let mime = fileType === "txt" ? "text/plain" : fileType === "video" ? "video/mp4" : "application/pdf";
        partsArray.push({ inlineData: { mimeType: mime, data: fileData } });
    }
    partsArray.push({ text: message || "Analyze context step by step." });

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: partsArray }],
                tools: [{ googleSearch: {} }],
                systemInstruction: { parts: [{ text: "You are NovaMind AI V4. Explain things in a simple, student-friendly way using Hindi-English mix. Always add '📊 DISCOVERABILITY & SEO METRICS' at the bottom." }] }
            })
        });

        const data = await response.json();
        let reply = "Processing complete.";
        if (data.candidates && data.candidates.length > 0) {
            const parts = data.candidates[0].content?.parts;
            if (parts && parts.length > 0) reply = parts[0].text;
        }

        // 💾 Save Chat to Cloud Database permanently if User is logged in
        if (userEmail && generationMode === "chat" && message) {
            const logTitle = message.length > 20 ? message.substring(0, 20) + "..." : message;
            await ChatSchema.create({ userEmail, title: logTitle, prompt: message, response: reply });
        }

        return res.status(200).json({ reply, mediaUrl: finalMediaUrl, mediaType: finalMediaType });
    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Gateway Fault: ${error.message}` });
    }
}
