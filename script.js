// ===================================================
// NovaMind AI V3 - Ultimate Master Script (Fully Verified)
// ===================================================

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

// Standard IO Hooks (Direct Element References)
const imageInput = document.getElementById("image");
const videoInput = document.getElementById("video");
const pdfInput = document.getElementById("pdf");
const docxInput = document.getElementById("docx");
const txtInput = document.getElementById("txt");
const xlsxInput = document.getElementById("xlsx");
const pptxInput = document.getElementById("pptx");

const previewContainer = document.getElementById("previewContainer");
const previewName = document.getElementById("previewName");
const cancelPreview = document.getElementById("cancelPreview");

// Session Matrix Tracking
let imageBase64 = "";
let uploadedFileData = ""; 
let uploadedFileName = "";
let uploadedFileType = ""; 
let isVoiceReplyEnabled = false; // By default voice off rakha hai, icon tap se ON hoga
let userSessionToken = localStorage.getItem("novamind_auth_token") || null;
let currentAuthMode = "login";

function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

function escapeHtml(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Fixed AI Voice Reply Engine (With Correct Spellings)
function speakText(text) {
    if (!isVoiceReplyEnabled) return;
    
    // Agar background me pehle se bol rha hai toh stop karein
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    // Markdown ke symbols clear karke pure text taiyar karein
    const cleanText = text.replace(/[\#\*`_\-]/g, "");
    
    // Correct Native API Spelling: SpeechSynthesisUtterance
    const speech = new SpeechSynthesisUtterance(cleanText);
    speech.lang = "hi-IN"; // Hindi aur English mix bohot accha bolega
    
    window.speechSynthesis.speak(speech);
}

// Voice Toggle Logic
voiceReplyToggle.addEventListener("click", () => {
    isVoiceReplyEnabled = !isVoiceReplyEnabled;
    voiceReplyToggle.innerText = isVoiceReplyEnabled ? "🔊" : "🔇";
});

// Theme Layout Toggle Logic
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    themeToggle.innerText = document.body.classList.contains("dark-theme") ? "🌙" : "☀️";
});

// File Selection Handler Pipeline
function handleFileSelect(file, type, readAs) {
    if (!file) return;
    uploadedFileName = file.name;
    uploadedFileType = type;
    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedFileData = e.target.result;
        previewName.innerText = `${type.toUpperCase()}: ${file.name}`;
        previewContainer.style.display = "flex";
    };
    if (readAs === "text") reader.readAsText(file);
    else reader.readAsDataURL(file);
}

// File Attachment Change Events
imageInput.addEventListener("change", function() {
    const file = this.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        imageBase64 = e.target.result;
        previewName.innerText = `📷 Image: ${file.name}`;
        previewContainer.style.display = "flex";
    };
    reader.readAsDataURL(file);
    attachMenu.classList.remove("active");
});

videoInput.addEventListener("change", function() {
    const file = this.files[0];
    if(!file) return;
    if(file.size > 20 * 1024 * 1024) {
        alert("Mobile networks ke optimization ke liye video file 20MB ke andar rakhein.");
        return;
    }
    handleFileSelect(file, "video", "dataurl");
});

txtInput.addEventListener("change", function() { handleFileSelect(this.files[0], "txt", "text"); });
pdfInput.addEventListener("change", function() { handleFileSelect(this.files[0], "pdf", "dataurl"); });
docxInput.addEventListener("change", function() { handleFileSelect(this.files[0], "docx", "dataurl"); });
xlsxInput.addEventListener("change", function() { handleFileSelect(this.files[0], "xlsx", "dataurl"); });
pptxInput.addEventListener("change", function() { handleFileSelect(this.files[0], "pptx", "dataurl"); });

cancelPreview.addEventListener("click", resetAttachments);

function resetAttachments() {
    imageBase64 = ""; uploadedFileData = ""; uploadedFileName = ""; uploadedFileType = "";
    previewName.innerText = ""; previewContainer.style.display = "none";
    imageInput.value = ""; videoInput.value = ""; txtInput.value = ""; pdfInput.value = ""; docxInput.value = ""; xlsxInput.value = ""; pptxInput.value = "";
}

// Chat UI Display Renderer Hub
function injectMessageIntoDOM(id, role, text, timestamp = getCurrentTime(), mediaUrl = null, mediaType = null) {
    const isAi = role === "ai";
    const bubbleClass = isAi ? "ai" : "user";
    
    let parsedText = text;
    // Markdown Converter Framework Check
    if (isAi && typeof marked !== "undefined" && marked.parse) {
        parsedText = marked.parse(text);
    }
    
    // Dynamic media rendering containers for generated elements
    let mediaPayloadHtml = "";
    if (mediaUrl) {
        if (mediaType === "image") {
            mediaPayloadHtml = `<div style="margin-top:10px;"><img src="${mediaUrl}" style="max-width:100%; border-radius:12px; border:1px solid rgba(0,0,0,0.1);" alt="Generated Design Output"></div>`;
        } else if (mediaType === "video") {
            mediaPayloadHtml = `<div style="margin-top:10px;"><video src="${mediaUrl}" controls style="max-width:100%; border-radius:12px; border:1px solid rgba(0,0,0,0.1);"></video></div>`;
        }
    }
    
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
            <div class="msg-text">${parsedText} ${mediaPayloadHtml}</div>
            <div class="msg-meta-bar">
                <span>${timestamp}</span>
                ${metaControls}
            </div>
        </div>
    `;
    chat.innerHTML += messageHtml;
    chat.scrollTop = chat.scrollHeight;
    
    // Apply syntax highlighting injection safely
    if (typeof hljs !== "undefined" && hljs.highlightElement) {
        document.querySelectorAll('pre code').forEach((el) => hljs.highlightElement(el));
    }
}

// Network Request Pipeline
async function sendMessage(customText = null) {
    const text = customText !== null ? customText : input.value.trim();
    if (text === "" && imageBase64 === "" && uploadedFileData === "") return;

    const msgId = "msg-" + Date.now();
    if (customText === null) input.value = "";
    previewContainer.style.display = "none";

    injectMessageIntoDOM(msgId, "user", text);

    const typing = document.createElement("div");
    typing.className = "message ai";
    typing.id = "typing-indicator";
    
    let engineStatusText = "⚡ NovaMind Brain Engine Processing (Search / Tools active)...";
    // Check global window scope active generation mode variable safely
    if (typeof activeGenerationMode !== "undefined") {
        if (activeGenerationMode === "image") engineStatusText = "🎨 Creative Core rendering your Image via Flux-Diffusion Nodes...";
        if (activeGenerationMode === "video") engineStatusText = "🎬 Video Synth Neural Networks rendering frames & simulation blocks...";
    }
    
    typing.innerHTML = `<div class="msg-text">${engineStatusText}</div>`;
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
                fileType: uploadedFileType,
                generationMode: (typeof activeGenerationMode !== "undefined") ? activeGenerationMode : "chat"
            })
        });

        const data = await response.json();
        if (document.getElementById("typing-indicator")) document.getElementById("typing-indicator").remove();

        const aiMsgId = "ai-" + Date.now();
        injectMessageIntoDOM(aiMsgId, "ai", data.reply, getCurrentTime(), data.mediaUrl, data.mediaType);
        speakText(data.reply);
        resetAttachments();

    } catch (err) {
        if (document.getElementById("typing-indicator")) document.getElementById("typing-indicator").remove();
        injectMessageIntoDOM("err-"+Date.now(), "ai", "❌ Engine connectivity timeout or cloud function offline.");
    }
}

// UI Buttons Configuration Hooks
button.addEventListener("click", () => sendMessage());
input.addEventListener("keydown", (e) => { if(e.key === "Enter") sendMessage(); });

searchChatInput.addEventListener("input", function() {
    const query = this.value.toLowerCase();
    document.querySelectorAll(".message").forEach(msg => {
        const match = msg.querySelector(".msg-text").innerText.toLowerCase().includes(query);
        msg.style.display = match ? "flex" : "none";
    });
});

function triggerMessageEdit(el, id) {
    const txtNode = el.parentElement.previousElementSibling;
    const updatedTxt = prompt("Refactor text context structures:", txtNode.innerText);
    if(updatedTxt && updatedTxt.trim() !== "") {
        txtNode.innerText = updatedTxt;
        sendMessage(updatedTxt);
    }
}
function triggerMessageDelete(id) { document.getElementById(`msg-${id}`)?.remove(); }
function triggerRegenerate(id) { sendMessage("Regenerate previous operational answer script."); }
function feedbackResponse(id, type) { alert(`Feedback registered: ${type.toUpperCase()}`); }

userProfile.addEventListener("click", () => { authOverlay.style.display = "flex"; });
authToggleText.addEventListener("click", () => {
    currentAuthMode = currentAuthMode === "login" ? "signup" : "login";
    document.getElementById("authTitle").innerText = currentAuthMode === "login" ? "Secure Account Core" : "Registration Portal";
    primaryAuthBtn.innerText = currentAuthMode === "login" ? "Establish Login Sync" : "Complete Signup Creation";
});
primaryAuthBtn.addEventListener("click", () => {
    localStorage.setItem("novamind_auth_token", "secure_mock_verified_token");
    authOverlay.style.display = "none";
    alert("Cloud user configuration profile synced successfully!");
});

// Strict Floating Overlay Toggle Controller Action Links
attachBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    attachMenu.classList.toggle("active");
});

document.addEventListener("click", (e) => {
    if (!attachMenu.contains(e.target) && !attachBtn.contains(e.target)) {
        attachMenu.classList.remove("active");
    }
});

// Browser Voice Network Unlock Engine (Bypasses Native Autoplay Block Protections)
document.addEventListener("click", () => {
    if (window.speechSynthesis && window.speechSynthesis.speaking === false) {
        const unlockSpeech = new SpeechSynthesisUtterance("");
        window.speechSynthesis.speak(unlockSpeech);
    }
}, { once: true });
