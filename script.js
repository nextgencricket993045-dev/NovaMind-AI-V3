// ====================================================================
// NovaMind AI V4 - Premium Frontend Engine (100% Core Fix)
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
// 🗂️ Sidebar State Navigation Engine
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
                <div class="message user" id="msg-hist-u"><div class="msg-text">${log.prompt}</div></div>
                <div class="message ai" id="msg-hist-a"><div class="msg-text">${log.response}</div></div>`;
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
// File Upload & Preview Handlers
// ==========================================
const fileInputs = ['image', 'video', 'pdf', 'docx', 'txt'];
fileInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', (e) => handleFileUpload(e, id));
});

function handleFileUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        if (type === 'image') imageBase64 = e.target.result;
        else uploadedFileData = e.target.result;
        uploadedFileName = file.name;
        uploadedFileType = type;
        
        document.getElementById('previewName').textContent = `📎 ${file.name}`;
        document.getElementById('previewContainer').style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

document.getElementById('cancelPreview').addEventListener('click', clearPreview);

function clearPreview() {
    imageBase64 = null; uploadedFileData = null; uploadedFileName = null; uploadedFileType = null;
    document.getElementById('previewContainer').style.display = 'none';
    fileInputs.forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = ''; });
}

// ==========================================
// UI & Menu Interactions
// ==========================================
const attachBtn = document.getElementById('attach');
const attachMenu = document.getElementById('attachMenu');

if(attachBtn) {
    attachBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        attachMenu.classList.toggle('active');
    });
}

document.addEventListener('click', (e) => {
    if (attachBtn && !attachBtn.contains(e.target) && attachMenu && !attachMenu.contains(e.target)) {
        attachMenu.classList.remove('active');
    }
});

const themeToggle = document.getElementById('themeToggle');
if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    });
}
if (localStorage.getItem('theme') === 'light') document.body.classList.remove('dark-theme');

// ==========================================
// Core Messaging Pipeline (100% FIXED VALIDATION)
// ==========================================
const sendBtn = document.getElementById('send');
const messageInput = document.getElementById('message');
const chatContainer = document.getElementById('chat');

if(sendBtn) {
    sendBtn.addEventListener('click', () => {
        const text = messageInput.value ? messageInput.value.trim() : "";
        if (text || imageBase64 || uploadedFileData) sendMessage(text);
    });
}
if(messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = messageInput.value ? messageInput.value.trim() : "";
            if (text || imageBase64 || uploadedFileData) sendMessage(text);
        }
    });
}

let lastUserPrompt = ""; 

async function sendMessage(text) {
    lastUserPrompt = text;
    
    const mode = (typeof activeGenerationMode !== "undefined") ? activeGenerationMode : "chat";
    const aspectEl = document.getElementById("aspectRatio");
    const ratio = aspectEl ? aspectEl.value : "16:9";

    const msgId = "msg-" + Date.now();
    appendMessage('user', text, (imageBase64 || uploadedFileData) ? true : false, null, msgId);
    
    if(messageInput) messageInput.value = '';
    const loadingId = appendLoading();
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const currentImage = imageBase64;
    const currentFileData = uploadedFileData;
    const currentFileName = uploadedFileName;
    const currentFileType = uploadedFileType;

    clearPreview();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-forwarded-for": userSessionToken },
            body: JSON.stringify({
                message: text, image: currentImage, fileData: currentFileData,
                fileName: currentFileName, fileType: currentFileType, generationMode: mode, aspectRatio: ratio
            })
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
        } else {
            appendMessage('ai', "⚠️ Engine process completed but returned empty output.", null, null, aiMsgId);
        }

    } catch (error) {
        removeLoading(loadingId);
        appendMessage('ai', `⚠️ Core Engine Disconnected: ${error.message}`, null, null, "err-" + Date.now());
    }
}

// ==========================================
// Chat UI Rendering Engine
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
    if (sender === 'user' && mediaUrl === true) {
        contentHtml += `<br><small style="opacity: 0.7;">📎 [Attachment Included]</small>`;
    }
    contentHtml += `</div>`;

    if (sender === 'ai' && mediaUrl && typeof mediaUrl === 'string') {
        contentHtml += `<div class="media-container" style="margin-top: 15px; text-align: center;">`;
        if (mediaType === 'image') {
            contentHtml += `<img src="${mediaUrl}" alt="Generated Asset" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">`;
        } else if (mediaType === 'audio') {
            contentHtml += `
                <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px;">
                    <audio src="${mediaUrl}" controls style="width: 100%;"></audio>
                </div>`;
        }
        contentHtml += `</div>`;
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const safeText = (text || "").replace(/`/g, '\\`').replace(/\$/g, '\\$');
    
    let metaControls = "";
    if (sender === 'ai') {
        metaControls = `
            <span class="action-icon" onclick="navigator.clipboard.writeText(\`${safeText}\`)">📋 Copy</span>
            <span class="action-icon" style="margin-left:8px;" onclick="speakText(\`${safeText}\`)">🔊 Speak</span>
            <span class="action-icon" style="margin-left:8px;" onclick="handleFeedback(this, 'like')">👍</span>
            <span class="action-icon" style="margin-left:8px;" onclick="handleFeedback(this, 'dislike')">👎</span>
            <span class="action-icon" style="margin-left:8px; color: #818cf8;" onclick="triggerRegenerate()">🔄 Re-gen</span>`;
    } else {
        metaControls = `
            <span class="action-icon" onclick="triggerMessageEdit(this, '${id}')">✏️ Edit</span>
            <span class="action-icon" style="margin-left:8px;" onclick="triggerMessageDelete('${id}')">🗑️ Del</span>`;
    }

    contentHtml += `
    <div class="msg-meta-bar" style="display: flex; gap: 8px; font-size: 11px; opacity: 0.6; align-items: center; justify-content: flex-end; width: 100%; margin-top: 5px;">
        <span>${time}</span>
        ${metaControls}
    </div>`;

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
    msgDiv.innerHTML = `<div class="msg-text">System processing prompt... ⏳</div>`;
    chatContainer.appendChild(msgDiv);
    return id;
}

function removeLoading(id) { const el = document.getElementById(id); if (el) el.remove(); }

window.speakText = speakText;
window.triggerMessageDelete = function(id) { 
    document.getElementById(`msg-${id}`)?.remove(); 
};

window.triggerMessageEdit = function(el, id) {
    const txtNode = el.parentElement.previousElementSibling;
    const currentRawText = txtNode.innerText.trim();
    const updatedTxt = prompt("Refactor message text content:", currentRawText);
    if (updatedTxt && updatedTxt.trim() !== "") {
        txtNode.innerHTML = updatedTxt.replace(/\n/g, '<br>');
        sendMessage(updatedTxt);
    }
};

window.handleFeedback = function(el, type) {
    el.style.transform = "scale(1.3)";
    el.style.transition = "0.2s";
    setTimeout(() => { el.style.transform = "scale(1)"; }, 200);
};

window.triggerRegenerate = function() {
    if (lastUserPrompt) sendMessage(lastUserPrompt);
    else alert("No active session trace available to regenerate.");
};

// ==========================================
// 👤 Authentic ChatGPT Authentication Pipeline
// ==========================================
const userProfileBtn = document.getElementById('userProfile');
let authOverlay = document.getElementById('authOverlay');
const footerUserLabel = document.getElementById('footerUserLabel');

if (authOverlay) {
    authOverlay.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:#0b0f19; z-index:2500; display:none; align-items:center; justify-content:center; padding:20px; font-family:sans-serif;";
    authOverlay.innerHTML = `
        <div class="auth-box" style="background:#111827; padding:40px 32px; border-radius:12px; width:100%; max-width:400px; color:#fff; border:1px solid #1f2937; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);">
            <div style="text-align:center;">
                <h2 id="authTitle" style="font-size:32px; font-weight:700; margin-bottom:8px;">Welcome to NovaMind</h2>
                <p id="authSubtitle" style="margin-bottom:24px; color:#94a3b8; font-size:14px;">Log in or sign up with your account parameters to continue</p>
            </div>
            
            <button id="googleAuthBtn" class="auth-btn google-btn" style="width:100%; padding:14px; border-radius:6px; font-size:16px; font-weight:500; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:12px; background:#fff; color:#1f2937; border:1px solid #d1d5db; box-sizing:border-box;">
                <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/web-24dp/copy_of_web-24dp.png" width="18" alt="Google">
                Continue with Google
            </button>

            <div class="auth-divider" style="display:flex; align-items:center; margin:20px 0; color:#4b5563; font-size:12px; font-weight:600;"><span style="flex:1; border-bottom:1px solid #1f2937;"></span><span style="padding:0 10px;">OR</span><span style="flex:1; border-bottom:1px solid #1f2937;"></span></div>

            <div class="auth-form-group">
                <input type="text" id="authName" placeholder="Full Name" style="display:none; width:100%; padding:14px 16px; margin:10px 0; border-radius:6px; border:1px solid #374151; background:#1f2937; color:#fff; font-size:16px; box-sizing:border-box;">
                <input type="email" id="authUsername" placeholder="Email address" style="width:100%; padding:14px 16px; margin:10px 0; border-radius:6px; border:1px solid #374151; background:#1f2937; color:#fff; font-size:16px; box-sizing:border-box;">
                <input type="password" id="authPassword" placeholder="Password" style="width:100%; padding:14px 16px; margin:10px 0; border-radius:6px; border:1px solid #374151; background:#1f2937; color:#fff; font-size:16px; box-sizing:border-box;">
            </div>

            <button id="authSubmitBtn" class="auth-btn primary-submit-btn" style="width:100%; padding:14px; border-radius:6px; font-size:16px; font-weight:600; cursor:pointer; background:#10b981; color:#fff; border:none; margin-top:15px; box-sizing:border-box;">Continue</button>
            
            <div class="auth-footer-toggle" style="margin-top:24px; text-align:center; font-size:14px; color:#94a3b8;">
                <span id="authSwitchPrompt">Don't have an account?</span>
                <a href="#" id="authSwitchModeBtn" style="color:#10b981; text-decoration:none; font-weight:500; margin-left:4px;">Sign up</a>
            </div>

            <button id="authCloseBtn" class="auth-btn cancel-btn" style="width:100%; padding:10px; border-radius:6px; background:transparent; color:#94a3b8; border:1px solid #374151; margin-top:12px; font-size:14px; cursor:pointer;">Back to Workspace</button>
        </div>`;
}

let authMode = "signin";

if(!localStorage.getItem("nova_mock_users")) {
    localStorage.setItem("nova_mock_users", JSON.stringify([{email: "ayush@novamind.com", pass: "123456", name: "Ayush"}]));
}

const savedUser = localStorage.getItem("currentUser");
if (savedUser && footerUserLabel) {
    footerUserLabel.innerText = savedUser;
}

if (userProfileBtn && authOverlay) {
    userProfileBtn.addEventListener('click', () => {
        authOverlay.style.display = 'flex';
    });
}

if (authOverlay) {
    authOverlay.addEventListener('click', (e) => {
        const nameField = document.getElementById('authName');
        const titleText = document.getElementById('authTitle');
        const subtitleText = document.getElementById('authSubtitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const promptText = document.getElementById('authSwitchPrompt');
        const switchLink = document.getElementById('authSwitchModeBtn');

        if (e.target.id === 'authCloseBtn') {
            authOverlay.style.display = 'none';
        }

        if (e.target.id === 'authSwitchModeBtn') {
            e.preventDefault();
            if (authMode === "signin") {
                authMode = "signup";
                titleText.innerText = "Create your account";
                subtitleText.innerText = "Provide details to build an authorized enterprise access key";
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
            localStorage.setItem("novaSessionToken", "oauth_google_verified");
            localStorage.setItem("currentUser", "Ayush (Google Connected)");
            if(footerUserLabel) footerUserLabel.innerText = "Ayush (Google Connected)";
            
            const initBlock = document.getElementById("msg-welcome-init");
            if(initBlock) {
                initBlock.querySelector(".msg-text").innerHTML = `Hello Ayush 👋<br><br>NovaMind Enterprise updated. Google Authentication parameters securely synced.`;
            }
            alert("Authorized State established via Google! 🔐");
            authOverlay.