// ====================================================================
// NovaMind AI V4 - Master Production Frontend Engine (100% Fixed Code)
// ====================================================================

let imageBase64 = null;
let uploadedFileData = null;
let uploadedFileName = null;
let uploadedFileType = null;
let isVoiceReplyEnabled = false;
let userSessionToken = localStorage.getItem("novaSessionToken") || generateUUID();
localStorage.setItem("novaSessionToken", userSessionToken);

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\#\*`_\-]/g, "");
    const speech = new SpeechSynthesisUtterance(cleanText);
    speech.lang = "hi-IN";
    window.speechSynthesis.speak(speech);
}

const voiceToggleEl = document.getElementById("voiceReplyToggle");
if (voiceToggleEl) {
    voiceToggleEl.addEventListener("click", () => {
        isVoiceReplyEnabled = !isVoiceReplyEnabled;
        voiceToggleEl.innerText = isVoiceReplyEnabled ? "🔊" : "🔇";
    });
}

// ==========================================
// 🗂️ Sidebar Control Actions
// ==========================================
const sidebar = document.getElementById('sidebar');
const sidebarOpenBtn = document.getElementById('sidebarOpenBtn');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const newChatBtn = document.getElementById('newChatBtn');
const chatHistoryList = document.getElementById('chatHistoryList');

if (sidebarOpenBtn) {
    sidebarOpenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.add('active');
    });
}
if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });
}

document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && e.target !== sidebarOpenBtn) {
            sidebar.classList.remove('active');
        }
    }
});

let activeChatHistory = JSON.parse(localStorage.getItem("nova_chat_logs")) || [];

function updateSidebarHistoryUI() {
    if (!chatHistoryList) return;
    chatHistoryList.innerHTML = "";
    
    activeChatHistory.forEach((log) => {
        const historyBtn = document.createElement('button');
        historyBtn.className = "history-item-node";
        historyBtn.innerText = `💬 ${log.title}`;
        historyBtn.title = log.title;
        historyBtn.addEventListener('click', () => {
            const chatContainer = document.getElementById('chat');
            chatContainer.innerHTML = `
                <div class="message user"><div class="msg-text">${log.prompt}</div></div>
                <div class="message ai"><div class="msg-text">${log.response}</div></div>`;
            sidebar.classList.remove('active');
        });
        chatHistoryList.appendChild(historyBtn);
    });
}

if(newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        const chatContainer = document.getElementById('chat');
        chatContainer.innerHTML = `
            <div class="message ai" id="msg-welcome-init">
                <div class="msg-text">Workspace refreshed. Started a new chat thread session.</div>
            </div>`;
        sidebar.classList.remove('active');
    });
}
updateSidebarHistoryUI();

// ==========================================
// File Input Binary Mapping Layers
// ==========================================
const inputs = ['imageInput', 'pdfInput', 'docxInput', 'txtInput'];
inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', (e) => handleFileUpload(e, id));
});

function handleFileUpload(event, id) {
    const file = event.target.files[0];
    if (!file) return;

    let parsedType = "txt";
    if (id === "imageInput") parsedType = "image";
    else if (id === "pdfInput") parsedType = "pdf";
    else if (id === "docxInput") parsedType = "docx";

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Raw = e.target.result.split(',')[1];
        if (parsedType === 'image') imageBase64 = base64Raw;
        else uploadedFileData = base64Raw;
        
        uploadedFileName = file.name;
        uploadedFileType = parsedType;
        
        document.getElementById('previewName').textContent = `📎 Loaded: ${file.name}`;
        document.getElementById('previewContainer').style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

document.getElementById('cancelPreview').addEventListener('click', clearPreview);
function clearPreview() {
    imageBase64 = null; uploadedFileData = null; uploadedFileName = null; uploadedFileType = null;
    document.getElementById('previewContainer').style.display = 'none';
    inputs.forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = ''; });
}

// ==========================================
// Core Messaging Pipeline
// ==========================================
const sendBtn = document.getElementById('send');
const messageInput = document.getElementById('message');
const chatContainer = document.getElementById('chat');

if(sendBtn) sendBtn.addEventListener('click', () => { fireMessageTrigger(); });
if(messageInput) messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') fireMessageTrigger(); });

function fireMessageTrigger() {
    const text = messageInput.value ? messageInput.value.trim() : "";
    if (text || imageBase64 || uploadedFileData) sendMessage(text);
}

let lastUserPrompt = ""; 

async function sendMessage(text) {
    lastUserPrompt = text;
    const mode = (typeof activeGenerationMode !== "undefined") ? activeGenerationMode : "chat";
    const ratio = document.getElementById("aspectRatio") ? document.getElementById("aspectRatio").value : "16:9";

    const msgId = "msg-" + Date.now();
    appendMessage('user', text || `Analyzed Document Resource Node [${uploadedFileName}]`, (imageBase64 || uploadedFileData) ? true : false, null, msgId);
    
    if(messageInput) messageInput.value = '';
    const loadingId = appendLoading();
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const payload = {
        message: text, generationMode: mode, aspectRatio: ratio,
        image: imageBase64, fileData: uploadedFileData, fileName: uploadedFileName, fileType: uploadedFileType
    };
    clearPreview();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        removeLoading(loadingId);

        const aiMsgId = "ai-" + Date.now();
        if (data && (data.reply || data.mediaUrl)) {
            appendMessage('ai', data.reply || "", data.mediaUrl, data.mediaType, aiMsgId);
            if (isVoiceReplyEnabled && data.reply) speakText(data.reply);
            
            if (mode === "chat" && text && data.reply) {
                const logTitle = text.length > 22 ? text.substring(0, 22) + "..." : text;
                activeChatHistory.unshift({ title: logTitle, prompt: text, response: data.reply });
                if(activeChatHistory.length > 15) activeChatHistory.pop();
                localStorage.setItem("nova_chat_logs", JSON.stringify(activeChatHistory));
                updateSidebarHistoryUI();
            }
        }
    } catch (error) {
        removeLoading(loadingId);
        appendMessage('ai', `⚠️ Core Sync Interrupted: ${error.message}`, null, null, "err-" + Date.now());
    }
}

// ==========================================
// DOM Renderer Pipeline
// ==========================================
function appendMessage(sender, text, mediaUrl = null, mediaType = null, id = "") {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.id = `msg-${id}`;
    
    let contentHtml = `<div class="msg-text">`;
    if (sender === 'ai' && typeof marked !== 'undefined' && text) {
        contentHtml += marked.parse(text);
    } else if (text) {
        contentHtml += text.replace(/\n/g, '<br>');
    }
    contentHtml += `</div>`;

    if (sender === 'ai' && mediaUrl && typeof mediaUrl === 'string') {
        contentHtml += `<div class="media-container" style="margin-top: 15px; text-align: center;">`;
        if (mediaType === 'image') {
            contentHtml += `<img src="${mediaUrl}" alt="Asset" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">`;
        } else if (mediaType === 'video') {
            contentHtml += `
                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 12px;">
                    <video src="${mediaUrl}" controls style="width: 100%; max-height:400px; border-radius:8px;"></video>
                </div>`;
        } else if (mediaType === 'audio') {
            contentHtml += `<audio src="${mediaUrl}" controls style="width: 100%;"></audio>`;
        }
        contentHtml += `</div>`;
    }

    const safeText = (text || "").replace(/`/g, '\\`').replace(/\$/g, '\\$');
    let metaControls = sender === 'ai' ? `
        <span class="action-icon" onclick="navigator.clipboard.writeText(\`${safeText}\`)">📋 Copy</span>
        <span class="action-icon" style="margin-left:8px;" onclick="speakText(\`${safeText}\`)">🔊 Speak</span>
        <span class="action-icon" style="margin-left:8px;" onclick="triggerRegenerate()">🔄 Re-gen</span>` : `
        <span class="action-icon" onclick="triggerMessageEdit(this, '${id}')">✏️ Edit</span>
        <span class="action-icon" style="margin-left:8px;" onclick="triggerMessageDelete('${id}')">🗑️ Del</span>`;

    contentHtml += `<div class="msg-meta-bar">${metaControls}</div>`;
    msgDiv.innerHTML = contentHtml;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    if (sender === 'ai' && typeof hljs !== 'undefined') {
        msgDiv.querySelectorAll('pre code').forEach((block) => { hljs.highlightElement(block); });
    }
}

function appendLoading() {
    const id = 'loading-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai'; msgDiv.id = id;
    msgDiv.innerHTML = `<div class="msg-text">Processing engine parameters... ⏳</div>`;
    chatContainer.appendChild(msgDiv);
    return id;
}
function removeLoading(id) { const el = document.getElementById(id); if (el) el.remove(); }

window.speakText = speakText;
window.triggerMessageDelete = function(id) { document.getElementById(`msg-${id}`)?.remove(); };
window.triggerRegenerate = function() { if (lastUserPrompt) sendMessage(lastUserPrompt); };
window.triggerMessageEdit = function(el, id) {
    const txtNode = el.parentElement.previousElementSibling;
    const update = prompt("Refactor message:", txtNode.innerText.trim());
    if (update && update.trim() !== "") {
        txtNode.innerHTML = update;
        sendMessage(update);
    }
};

// ==========================================
// Menu Interfaces Toggles
// ==========================================
const attachBtn = document.getElementById('attach');
const attachMenu = document.getElementById('attachMenu');
if(attachBtn) attachBtn.addEventListener('click', (e) => { e.stopPropagation(); attachMenu.classList.toggle('active'); });
document.addEventListener('click', () => { if(attachMenu) attachMenu.classList.remove('active'); });

const themeToggle = document.getElementById('themeToggle');
if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    });
}
if (localStorage.getItem('theme') === 'light') document.body.classList.remove('dark-theme');

// ==========================================
// 👤 Authentic ChatGPT Style Authentication
// ==========================================
const userProfileBtn = document.getElementById('userProfile');
let authOverlay = document.getElementById('authOverlay');
const footerUserLabel = document.getElementById('footerUserLabel');

let authMode = "signin";
const savedUser = localStorage.getItem("currentUser");
if (savedUser && footerUserLabel) footerUserLabel.innerText = savedUser;

if (userProfileBtn && authOverlay) userProfileBtn.addEventListener('click', () => authOverlay.style.display = 'flex');

if (authOverlay) {
    authOverlay.addEventListener('click', (e) => {
        const nameField = document.getElementById('authName');
        const titleText = document.getElementById('authTitle');
        const subtitleText = document.getElementById('authSubtitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const promptText = document.getElementById('authSwitchPrompt');
        const switchLink = document.getElementById('authSwitchModeBtn');

        if (e.target.id === 'authCloseBtn') authOverlay.style.display = 'none';

        if (e.target.id === 'authSwitchModeBtn') {
            e.preventDefault();
            if (authMode === "signin") {
                authMode = "signup";
                titleText.innerText = "Create your account";
                subtitleText.innerText = "Build an authorized access key to save parameters";
                if(nameField) nameField.style.display = "block";
                submitBtn.innerText = "Sign Up";
                promptText.innerText = "Already have an account?";
                switchLink.innerText = "Log in";
            } else {
                authMode = "signin";
                titleText.innerText = "Welcome back";
                subtitleText.innerText = "Log in with your account parameters to continue";
                if(nameField) nameField.style.display = "none";
                submitBtn.innerText = "Continue";
                promptText.innerText = "Don't have an account?";
                switchLink.innerText = "Sign up";
            }
        }

        if (e.target.id === 'googleAuthBtn' || e.target.closest('#googleAuthBtn')) {
            localStorage.setItem("currentUser", "Ayush (Google)");
            if(footerUserLabel) footerUserLabel.innerText = "Ayush (Google)";
            authOverlay.style.display = 'none';
        }

        if (e.target.id === 'authSubmitBtn') {
            const email = document.getElementById('authUsername')?.value.trim();
            const pass = document.getElementById('authPassword')?.value.trim();
            const name = nameField?.value.trim() || "User";

            if (!email || !pass) return alert("Required fields missing.");
            localStorage.setItem("currentUser", authMode === "signup" ? name : email.split('@')[0]);
            if(footerUserLabel) footerUserLabel.innerText = localStorage.getItem("currentUser");
            authOverlay.style.display = 'none';
        }
    });
}
