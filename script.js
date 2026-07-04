// ==========================================
// NovaMind AI V3 - Global Master Controller
// ==========================================

const attachBtn = document.getElementById("attach");
const attachMenu = document.getElementById("attachMenu");
const input = document.getElementById("message");
const chat = document.getElementById("chat");
const button = document.getElementById("send");
const micButton = document.getElementById("mic");
const themeToggle = document.getElementById("themeToggle");
const voiceReplyToggle = document.getElementById("voiceReplyToggle");
const searchChatInput = document.getElementById("searchChatInput");
const userProfile = document.getElementById("userProfile");

// Auth Bindings
const authOverlay = document.getElementById("authOverlay");
const primaryAuthBtn = document.getElementById("primaryAuthBtn");
const authToggleText = document.getElementById("authToggleText");
const googleAuthBtn = document.getElementById("googleAuthBtn");

// Standard IO Hooks
const fileInputs = {
    image: document.getElementById("image"),
    pdf: document.getElementById("pdf"),
    docx: document.getElementById("docx"),
    txt: document.getElementById("txt"),
    xlsx: document.getElementById("xlsx"),
    pptx: document.getElementById("pptx")
};

const previewContainer = document.getElementById("previewContainer");
const previewName = document.getElementById("previewName");
const cancelPreview = document.getElementById("cancelPreview");

// Session Matrix Tracking
let imageBase64 = "";
let uploadedFileData = ""; 
let uploadedFileName = "";
let uploadedFileType = ""; 
let isVoiceReplyEnabled = false;
let userSessionToken = localStorage.getItem("novamind_auth_token") || null;
let currentAuthMode = "login";

// Setup Highlight Engine Configurations
marked.setOptions({
    highlight: function(code, lang) {
        return hljs.highlightAuto(code).value;
    },
    breaks: true
});

function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

// Persistent Storage Layer (Supabase Fallback Pattern via LocalStorage Engine)
function getSavedHistory() {
    return JSON.parse(localStorage.getItem("novamind_db_history")) || [];
}
function saveToPersistentMemory(role, content, files = null) {
    let internalDB = getSavedHistory();
    internalDB.push({ id: Date.now(), role, content, timestamp: getCurrentTime(), files });
    localStorage.setItem("novamind_db_history", JSON.stringify(internalDB));
}

// Speech Systems Engine
function speakText(text) {
    if (!isVoiceReplyEnabled) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\#\*`_\-]/g, "");
    const speech = new SpeechSynthesisUtterance(cleanText);
    speech.lang = "hi-IN";
    window.speechSynthesis.speak(speech);
}

// Global Core Message Render Router
function injectMessageIntoDOM(id, role, text, timestamp = getCurrentTime()) {
    const isAi = role === "ai";
    const bubbleClass = isAi ? "ai" : "user";
    const parsedText = isAi ? marked.parse(text) : text;
    
    const metaControls = isAi ? `
        <span class="action-icon" onclick="navigator.clipboard.writeText(\`${text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">📋 Copy</span>
        <span class="action-icon" onclick="speakText(\`${text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">🔊 Speak</span>
        <span class="action-icon" onclick="feedbackResponse('${id}', 'like')">👍</span>
        <span class="action-icon" onclick="feedbackResponse('${id}', 'dislike')">👎</span>
        <span class="action-icon" onclick="triggerRegenerate('${id}')">🔄 Re</span>
    ` : `
        <span class="action-icon" onclick="triggerMessageEdit(this, '${id}')">✏️ Edit</span>
        <span class="action-icon" onclick="triggerMessageDelete('${id}')">🗑️ Del</span>
    `;

    const messageHtml = `
        <div class="message ${bubbleClass}" data-id="${id}" id="msg-${id}">
            <div class="msg-text">${parsedText}</div>
            <div class="msg-meta-bar">
                <span>${timestamp}</span>
                ${metaControls}
            </div>
        </div>
    `;
    chat.innerHTML += messageHtml;
    chat.scrollTop = chat.scrollHeight;
    document.querySelectorAll('pre code').forEach((el) => hljs.highlightElement(el));
}

// Messaging Operations Pipeline
async function sendMessage(customText = null) {
    const text = customText !== null ? customText : input.value.trim();
    if (text === "" && imageBase64 === "" && uploadedFileData === "") return;

    const msgId = "msg-" + Date.now();
    if (customText === null) input.value = "";
    previewContainer.style.display = "none";

    // Show on Viewport
    injectMessageIntoDOM(msgId, "user", text);
    saveToPersistentMemory("user", text, { name: uploadedFileName, type: uploadedFileType });

    // Show Typing State
    const typing = document.createElement("div");
    typing.className = "message ai";
    typing.id = "typing-indicator";
    typing.innerHTML = `<div class="msg-text">⚡ NovaMind Engine Processing (Search / Document / Tools active)...</div>`;
    chat.appendChild(typing);
    chat.scrollTop = chat.scrollHeight;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userSessionToken}` },
            body: JSON.stringify({
                message: text,
                image: imageBase64,
                fileData: uploadedFileData,
                fileName: uploadedFileName,
                fileType: uploadedFileType
            })
        });

        const data = await response.json();
        if (document.getElementById("typing-indicator")) document.getElementById("typing-indicator").remove();

        const aiMsgId = "ai-" + Date.now();
        injectMessageIntoDOM(aiMsgId, "ai", data.reply);
        saveToPersistentMemory("ai", data.reply);
        speakText(data.reply);
        resetAttachments();

    } catch (err) {
        if (document.getElementById("typing-indicator")) document.getElementById("typing-indicator").remove();
        injectMessageIntoDOM("err-"+Date.now(), "ai", "❌ Operation failed. Engine connection timeout.");
    }
}

// Document Bindings Framework
function trackFileInput(element, type, processMethod) {
    element.addEventListener("change", function() {
        const file = this.files[0];
        if(!file) return;
        uploadedFileName = file.name;
        uploadedFileType = type;
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedFileData = e.target.result;
            previewName.innerText = `${type.toUpperCase()}: ${file.name}`;
            previewContainer.style.display = "flex";
        };
        if(processMethod === "text") reader.readAsText(file);
        else reader.readAsDataURL(file);
    });
}

trackFileInput(fileInputs.txt, "txt", "text");
trackFileInput(fileInputs.pdf, "pdf", "dataurl");
trackFileInput(fileInputs.docx, "docx", "dataurl");
trackFileInput(fileInputs.xlsx, "xlsx", "dataurl");
trackFileInput(fileInputs.pptx, "pptx", "dataurl");

fileInputs.image.addEventListener("change", function() {
    const file = this.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { imageBase64 = e.target.result; previewName.innerText = `📷 Image: ${file.name}`; previewContainer.style.display = "flex"; };
    reader.readAsDataURL(file);
});

cancelPreview.addEventListener("click", resetAttachments);
function resetAttachments() {
    imageBase64 = ""; uploadedFileData = ""; uploadedFileName = ""; uploadedFileType = "";
    previewName.innerText = ""; previewContainer.style.display = "none";
    Object.keys(fileInputs).forEach(k => fileInputs[k].value = "");
}

// Client Features Event Binds
button.addEventListener("click", () => sendMessage());
input.addEventListener("keydown", (e) => { if(e.key === "Enter") sendMessage(); });
voiceReplyToggle.addEventListener("click", () => { isVoiceReplyEnabled = !isVoiceReplyEnabled; voiceReplyToggle.innerText = isVoiceReplyEnabled ? "🔊" : "🔇"; });
themeToggle.addEventListener("click", () => { document.body.classList.toggle("dark-theme"); themeToggle.innerText = document.body.classList.contains("dark-theme") ? "🌙" : "☀️"; });

// Chat History Real-time Search Engine
searchChatInput.addEventListener("input", function() {
    const query = this.value.toLowerCase();
    document.querySelectorAll(".message").forEach(msg => {
        const match = msg.querySelector(".msg-text").innerText.toLowerCase().includes(query);
        msg.style.display = match ? "flex" : "none";
    });
});

// Edit / Delete Interactivity Implementations
function triggerMessageEdit(el, id) {
    const txtNode = el.parentElement.previousElementSibling;
    const updatedTxt = prompt("Refactor message structural contents:", txtNode.innerText);
    if(updatedTxt && updatedTxt.trim() !== "") {
        txtNode.innerText = updatedTxt;
        sendMessage(updatedTxt);
    }
}
function triggerMessageDelete(id) {
    document.getElementById(`msg-${id}`)?.remove();
}
function triggerRegenerate(id) {
    sendMessage("Regenerate response for previous processing cycle.");
}
function feedbackResponse(id, type) {
    alert(`Feedback registered: ${type.toUpperCase()}`);
}

// User Gate Access Handling
userProfile.addEventListener("click", () => { authOverlay.style.display = "flex"; });
authToggleText.addEventListener("click", () => {
    currentAuthMode = currentAuthMode === "login" ? "signup" : "login";
    document.getElementById("authTitle").innerText = currentAuthMode === "login" ? "Login System Portal" : "Registration System Portal";
    primaryAuthBtn.innerText = currentAuthMode === "login" ? "Proceed Configuration" : "Complete Registration";
});
primaryAuthBtn.addEventListener("click", () => {
    localStorage.setItem("novamind_auth_token", "session_mock_secure_verified");
    alert("Authentication Process Simulated and Synced to cloud pipeline structure.");
    authOverlay.style.display = "none";
});

// PWA System Engine Initializer Setup
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); const pwaBtn = document.getElementById("pwaInstall"); pwaBtn.style.display = "block";
    pwaBtn.addEventListener('click', () => { e.prompt(); pwaBtn.style.display = "none"; });
});
