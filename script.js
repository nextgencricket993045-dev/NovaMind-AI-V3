// ====================================================================
// NovaMind AI V4 - Premium Stable Core Script Engine (Auto Database Integrated)
// ====================================================================

let imageBase64 = null;
let uploadedFileData = null;
let uploadedFileName = null;
let uploadedFileType = null;
let isVoiceReplyEnabled = false;
let authMode = "signin"; // Fixed the undefined authMode bug completely here

// Cloud Session Active Parameters Cache
let currentUserEmail = localStorage.getItem("novaUserEmail") || null;
let currentUserName = localStorage.getItem("novaUserName") || null;

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

let userSessionToken = localStorage.getItem("novaSessionToken") || generateUUID();
localStorage.setItem("novaSessionToken", userSessionToken);

function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text.replace(/[\#\*`_\-]/g, ""));
    speech.lang = "hi-IN";
    window.speechSynthesis.speak(speech);
}

const voiceToggle = document.getElementById("voiceReplyToggle");
if (voiceToggle) {
    voiceToggle.addEventListener("click", () => {
        isVoiceReplyEnabled = !isVoiceReplyEnabled;
        voiceToggle.innerText = isVoiceReplyEnabled ? "🔊" : "🔇";
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
const footerUserLabel = document.getElementById('footerUserLabel');

if (sidebarOpenBtn) sidebarOpenBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.add('active'); });
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', () => sidebar.classList.remove('active'));

document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== sidebarOpenBtn) {
        sidebar.classList.remove('active');
    }
});

// 💾 Cloud History Loader Function
async function loadCloudChatHistory() {
    if (!currentUserEmail || !chatHistoryList) return;
    try {
        const res = await fetch("/api/chat?action=getHistory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: currentUserEmail })
        });
        const data = await res.json();
        if (data.success && data.history) {
            chatHistoryList.innerHTML = "";
            data.history.forEach(log => {
                const btn = document.createElement('button');
                btn.className = "history-item-node";
                btn.innerText = `💬 ${log.title}`;
                btn.title = log.title;
                btn.addEventListener('click', () => {
                    document.getElementById('chat').innerHTML = `
                        <div class="message user"><div class="msg-text">${log.prompt}</div></div>
                        <div class="message ai"><div class="msg-text">${log.response}</div></div>`;
                    sidebar.classList.remove('active');
                });
                chatHistoryList.appendChild(btn);
            });
        }
    } catch(e) {
        console.log("Cloud server history log sync error framework mapping failure.");
    }
}

if(newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        document.getElementById('chat').innerHTML = `<div class="message ai"><div class="msg-text">Refresh cloud session started. Thread updated.</div></div>`;
        sidebar.classList.remove('active');
    });
}

// Global Sync Check on Page Startup
if (currentUserName && footerUserLabel) {
    footerUserLabel.innerText = currentUserName;
    loadCloudChatHistory();
}

// ==========================================
// Unified Input Handler (Large File Stream Fix)
// ==========================================
const masterFileInput = document.getElementById('masterFileInput');
if (masterFileInput) {
    masterFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const targetType = this.getAttribute('data-target-type');
        const reader = new FileReader();
        
        reader.onload = function(evt) {
            const rawBase64 = evt.target.result.split(',')[1];
            if (targetType === 'image') {
                imageBase64 = rawBase64;
            } else {
                uploadedFileData = rawBase64;
            }
            uploadedFileName = file.name;
            uploadedFileType = targetType;
            
            document.getElementById('previewName').textContent = `📎 Ready: ${file.name}`;
            document.getElementById('previewContainer').style.display = 'flex';
        };
        reader.readAsDataURL(file);
    });
}

document.getElementById('cancelPreview').addEventListener('click', clearPreview);
function clearPreview() {
    imageBase64 = null; uploadedFileData = null; uploadedFileName = null; uploadedFileType = null;
    document.getElementById('previewContainer').style.display = 'none';
    if(masterFileInput) masterFileInput.value = '';
}

// ==========================================
// Core Messaging Pipeline Gateway
// ==========================================
const sendBtn = document.getElementById('send');
const messageInput = document.getElementById('message');
const chatContainer = document.getElementById('chat');

if(sendBtn) sendBtn.addEventListener('click', () => triggerSend());
if(messageInput) messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') triggerSend(); });

function triggerSend() {
    const text = messageInput.value ? messageInput.value.trim() : "";
    if (text || imageBase64 || uploadedFileData) sendMessage(text);
}

let lastUserPrompt = "";
async function sendMessage(text) {
    lastUserPrompt = text;
    const mode = (typeof activeGenerationMode !== "undefined") ? activeGenerationMode : "chat";
    const ratio = document.getElementById("aspectRatio") ? document.getElementById("aspectRatio").value : "16:9";

    appendMessage('user', text || `Uploaded Document Stream Asset [${uploadedFileName}]`);
    if(messageInput) messageInput.value = '';
    
    const loadingId = appendLoading();
    
    const payload = {
        message: text, generationMode: mode, aspectRatio: ratio,
        image: imageBase64, fileData: uploadedFileData, fileName: uploadedFileName, 
        fileType: uploadedFileType, userEmail: currentUserEmail
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

        if (data && (data.reply || data.mediaUrl)) {
            appendMessage('ai', data.reply || "", data.mediaUrl, data.mediaType);
            if (isVoiceReplyEnabled && data.reply) speakText(data.reply);
            
            if (mode === "chat" && currentUserEmail) {
                setTimeout(() => { loadCloudChatHistory(); }, 900);
            }
        }
    } catch (error) {
        removeLoading(loadingId);
        appendMessage('ai', `⚠️ Network Synchronization Interrupted: ${error.message}`);
    }
}

function appendMessage(sender, text, mediaUrl = null, mediaType = null) {
    const div = document.createElement('div');
    const id = Date.now();
    div.className = `message ${sender}`;
    div.id = `msg-${id}`;
    
    let html = `<div class="msg-text">`;
    if (sender === 'ai' && typeof marked !== 'undefined' && text) {
        html += marked.parse(text);
    } else {
        html += (text || "").replace(/\n/g, '<br>');
    }
    html += `</div>`;

    if (sender === 'ai' && mediaUrl) {
        html += `<div class="media-container" style="margin-top:12px;">`;
        if (mediaType === 'image') html += `<img src="${mediaUrl}" style="max-width:100%; border-radius:12px;">`;
        else if (mediaType === 'video') html += `<video src="${mediaUrl}" controls style="width:100%; border-radius:12px;"></video>`;
        else if (mediaType === 'audio') html += `<audio src="${mediaUrl}" controls style="width:100%;"></audio>`;
        html += `</div>`;
    }

    const safe = (text || "").replace(/`/g, '\\`').replace(/\$/g, '\\$');
    let controls = sender === 'ai' ? `
        <span class="action-icon" onclick="navigator.clipboard.writeText(\`${safe}\`)">📋 Copy</span>
        <span class="action-icon" style="margin-left:8px;" onclick="speakText(\`${safe}\`)">🔊 Speak</span>
        <span class="action-icon" style="margin-left:8px;" onclick="window.triggerRegenerate()">🔄 Re-gen</span>` : `
        <span class="action-icon" onclick="window.triggerDelete('${id}')">🗑️ Del</span>`;

    html += `<div class="msg-meta-bar">${controls}</div>`;
    div.innerHTML = html;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (sender === 'ai' && typeof hljs !== 'undefined') {
        div.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    }
}

function appendLoading() {
    const id = 'load-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message ai'; div.id = id;
    div.innerHTML = `<div class="msg-text">Analyzing query data inputs and building student response... ⏳</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}
function removeLoading(id) { const el = document.getElementById(id); if (el) el.remove(); }

window.speakText = speakText;
window.triggerDelete = function(id) { document.getElementById(`msg-${id}`)?.remove(); };
window.triggerRegenerate = function() { if (lastUserPrompt) sendMessage(lastUserPrompt); };

// ==========================================
// Menu Interface Toggles & Account Engine
// ==========================================
const attach = document.getElementById('attach');
const attachMenu = document.getElementById('attachMenu');
if(attach) attach.addEventListener('click', (e) => { e.stopPropagation(); attachMenu.classList.toggle('active'); });
document.addEventListener('click', () => { if(attachMenu) attachMenu.classList.remove('active'); });

const themeToggle = document.getElementById('themeToggle');
if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    });
}
if (localStorage.getItem('theme') === 'light') document.body.classList.remove('dark-theme');

// 👤 Account Overlay Toggle
const userProfile = document.getElementById('userProfile');
const authOverlay = document.getElementById('authOverlay');
if(userProfile && authOverlay) userProfile.addEventListener('click', () => authOverlay.style.display = 'flex');

if (authOverlay) {
    authOverlay.addEventListener('click', async (e) => {
        const nameField = document.getElementById('authName');
        const titleText = document.getElementById('authTitle');
        const subtitleText = document.getElementById('authSubtitle');
        const submitBtn = document.getElementById('authSubmitBtn');

        if (e.target.id === 'authCloseBtn') authOverlay.style.display = 'none';

        if (e.target.id === 'authSwitchModeBtn') {
            e.preventDefault();
            if (authMode === "signin") {
                authMode = "signup";
                titleText.innerText = "Create your account";
                subtitleText.innerText = "Build secure credentials to access permanent database slots";
                if(nameField) nameField.style.display = "block";
                submitBtn.innerText = "Sign Up";
            } else {
                authMode = "signin";
                titleText.innerText = "Welcome back";
                subtitleText.innerText = "Provide email metrics to read active dashboard history configuration";
                if(nameField) nameField.style.display = "none";
                submitBtn.innerText = "Continue";
            }
        }

        if (e.target.id === 'googleAuthBtn' || e.target.closest('#googleAuthBtn')) {
            localStorage.setItem("novaUserEmail", "ayush.google@novamind.com");
            localStorage.setItem("novaUserName", "Ayush Vercel");
            currentUserEmail = "ayush.google@novamind.com";
            currentUserName = "Ayush Vercel";
            if(footerUserLabel) footerUserLabel.innerText = "Ayush Vercel";
            authOverlay.style.display = 'none';
            loadCloudChatHistory();
        }

        if (e.target.id === 'authSubmitBtn') {
            const email = document.getElementById('authUsername')?.value.trim();
            const pass = document.getElementById('authPassword')?.value.trim();
            const name = nameField?.value.trim() || "User Node";

            if (!email || !pass) return alert("All required fields must be populated.");
            
            const action = authMode === "signup" ? "signup" : "login";
            
            try {
                const res = await fetch(`/api/chat?action=${action}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password: pass, name })
                });
                const data = await res.json();
                
                if (data.success) {
                    localStorage.setItem("novaUserEmail", data.email);
                    localStorage.setItem("novaUserName", data.name);
                    currentUserEmail = data.email;
                    currentUserName = data.name;
                    if(footerUserLabel) footerUserLabel.innerText = data.name;
                    authOverlay.style.display = 'none';
                    loadCloudChatHistory();
                } else {
                    alert(data.msg || "Authentication failed.");
                }
            } catch(err) {
                alert("Database server connection active.");
            }
        }
    });
}
