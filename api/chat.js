// ====================================================================
// NovaMind AI V4 - Fixed Multimodal Backend Engine (Auto Cloud Sync Fallback)
// ====================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Serverless fallback storage configuration for automatic database compliance
const LOCAL_DB_PATH = path.join('/tmp', 'local_nova_db.json');

function initLocalDB() {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
        fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({ users: [], chats: [] }));
    }
}

function readDB() {
    initLocalDB();
    return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

export default async function handler(req, res) {
    const { message, generationMode, aspectRatio, image, fileData, fileType, userEmail, password, name } = req.body;

    // 👤 Handle Zero-Key Serverless Auth Endpoints Automatically
    if (req.query.action === "signup") {
        const db = readDB();
        const existing = db.users.find(u => u.email === userEmail);
        if (existing) return res.status(200).json({ success: false, msg: "Account already exists!" });
        
        const hashedPassword = crypto.createHash('sha256').update(password || "").digest('hex');
        const newUser = { email: userEmail, password: hashedPassword, name: name || "User" };
        db.users.push(newUser);
        writeDB(db);
        return res.status(200).json({ success: true, name: newUser.name, email: newUser.email });
    }

    if (req.query.action === "login") {
        const db = readDB();
        const hashedPassword = crypto.createHash('sha256').update(password || "").digest('hex');
        const user = db.users.find(u => u.email === userEmail && u.password === hashedPassword);
        if (user) return res.status(200).json({ success: true, name: user.name, email: user.email });
        return res.status(200).json({ success: false, msg: "Invalid credentials!" });
    }

    if (req.query.action === "getHistory") {
        const db = readDB();
        const history = db.chats.filter(c => c.userEmail === userEmail).slice(-15).reverse();
        return res.status(200).json({ success: true, history });
    }

    // 🤖 Core Student-Friendly AI Engine Configuration
    if (req.method !== "POST") return res.status(405).json({ reply: "Method Not Allowed" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(200).json({ reply: "⚠️ Gemini API Key missing from Vercel env." });

    let finalMediaUrl = null; let finalMediaType = null;
    let resWidth = 1280; let resHeight = 720;
    if (aspectRatio === "1:1") { resWidth = 1024; resHeight = 1024; }

    const cleanPrompt = encodeURIComponent((message || "masterpiece study").replace(/[^a-zA-Z0-9 ]/g, "").trim());
    const randomSeed = Math.floor(Math.random() * 8888888);

    if (generationMode === "image") {
        finalMediaType = "image";
        finalMediaUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=${resWidth}&height=${resHeight}&seed=${randomSeed}&enhance=true`;
    } else if (generationMode === "video") {
        finalMediaType = "video";
        finalMediaUrl = `https://video.pollinations.ai/p/${cleanPrompt}%204k%20motion?width=${resWidth}&height=${resHeight}&seed=${randomSeed}`;
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
    partsArray.push({ text: message || "Explain this query in pure student-friendly terms." });

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: partsArray }],
                tools: [{ googleSearch: {} }],
                systemInstruction: { parts: [{ text: "You are NovaMind AI V4. You are an expert school teacher. Explain concepts from input images, PDFs, or text in an EXTREMELY SIMPLE, easy-to-understand student-friendly manner using standard Hindi-English (Hinglish). Keep definitions very basic, clean, and interactive. Always add '📊 DISCOVERABILITY & SEO METRICS' at the bottom." }] }
            })
        });

        const data = await response.json();
        let reply = "Processing complete.";
        if (data.candidates && data.candidates.length > 0) {
            const parts = data.candidates[0].content?.parts;
            if (parts && parts.length > 0) reply = parts[0].text;
        }

        // 💾 Auto Save Chat to Memory Storage Layer
        if (userEmail && generationMode === "chat" && message) {
            const db = readDB();
            const logTitle = message.length > 20 ? message.substring(0, 20) + "..." : message;
            db.chats.push({ userEmail, title: logTitle, prompt: message, response: reply, createdAt: new Date() });
            writeDB(db);
        }

        return res.status(200).json({ reply, mediaUrl: finalMediaUrl, mediaType: finalMediaType });
    } catch (error) {
        return res.status(200).json({ reply: `⚠️ Server Pipeline Fault: ${error.message}` });
    }
}
