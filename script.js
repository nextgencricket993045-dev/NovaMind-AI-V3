// ====================================================================
// NovaMind AI V4 - Premium Stable Core Script Engine (Zero Glitch Control)
// ====================================================================

let imageBase64 = null;
let uploadedFileData = null;
let uploadedFileName = null;
let uploadedFileType = null;
let isVoiceReplyEnabled = false;
let authMode = "signin"; 

let currentUserEmail = localStorage.getItem("novaUserEmail") || null;
let currentUserName = localStorage.getItem("novaUserName") || null;

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

// Sidebar Setup
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

// High Stability Memory Vault Engine
function getLocalMemoryDB() {
    let db = localStorage.getItem("nova_memory_vault");
    if (!db) {
        db = JSON.stringify({ users: [], chats: [] });
        localStorage.setItem("nova_memory_vault", db);
    }
    return JSON.parse(db);
}

function writeLocalMemoryDB(data) {
    localStorage.setItem("nova_memory_vault", JSON.stringify(data));
}

function loadCloudChatHistory() {
    if (!currentUserEmail || !chatHistoryList) return;
    const db = getLocalMemoryDB();
    const history = db.chats.filter(c => c.userEmail === currentUserEmail).slice(-15).reverse();
    
    chatHistoryList.innerHTML = "";
    history.forEach(log => {
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

if(newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        document.getElementById('chat').innerHTML = `<div class="message ai"><div class="msg-text">New operational layer started.</div></div>`;
        sidebar.classList.remove('active');
    });
}

if (currentUserName && footerUserLabel) {
    footerUserLabel.innerText = currentUserName;
    loadCloudChatHistory();
}

// File Attachment Handler
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

// Messaging Core Hub
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

    appendMessage('user', text || `Uploaded File asset: [${uploadedFileName}]`);
    if(messageInput) messageInput.value = '';
    
    const loadingId = appendLoading();
    
    const payload = {
        message: text, generationMode: mode, aspectRatio: ratio,
        image: imageBase64, fileData: uploadedFileData, fileName: uploadedFileName, 
        fileType: uploadedFileType
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
            
            if (mode === "chat" && currentUserEmail && text && data.reply) {
                const db = getLocalMemoryDB();
                const logTitle = text.length > 20 ? text.substring(0, 20) + "..." : text;
                db.chats.push({ userEmail: currentUserEmail, title: logTitle, prompt: text, response: data.reply });
                writeLocalMemoryDB(db);
                loadCloudChatHistory();
            }
        }
    } catch (error) {
        removeLoading(loadingId);
        appendMessage('ai', `⚠️ Connection Log Sync Interrupted: ${error.message}`);
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
    div.innerHTML = `<div class="msg-text">Analyzing file element and preparing simple answer... ⏳</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}
function removeLoading(id) { const el = document.getElementById(id); if (el) el.remove(); }

window.speakText = speakText;
window.triggerDelete = function(id) { document.getElementById(`msg-${id}`)?.remove(); };
window.triggerRegenerate = function() { if (lastUserPrompt) sendMessage(lastUserPrompt); };

// UI Controls
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

// 👤 Safe Cryptic Internal Authenticators Hub
const userProfile = document.getElementById('userProfile');
const authOverlay = document.getElementById('authOverlay');
if(userProfile && authOverlay) userProfile.addEventListener('click', () => authOverlay.style.display = 'flex');

if (authOverlay) {
    authOverlay.addEventListener('click', async (e) => {
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
                titleText.innerText = "Create account";
                subtitleText.innerText = "Setup private local keys safely";
                if(nameField) nameField.style.display = "block";
                submitBtn.innerText = "Sign Up";
                promptText.innerText = "Already registered?";
                switchLink.innerText = "Log in";
            } else {
                authMode = "signin";
                titleText.innerText = "Welcome back";
                subtitleText.innerText = "Provide password parameters";
                if(nameField) nameField.style.display = "none";
                submitBtn.innerText = "Continue";
                promptText.innerText = "Don't have an account?";
                switchLink.innerText = "Sign up";
            }
        }

        if (e.target.id === 'googleAuthBtn' || e.target.closest('#googleAuthBtn')) {
            localStorage.setItem("novaUserEmail", "ayush@novamind.com");
            localStorage.setItem("novaUserName", "Ayush Vercel");
            currentUserEmail = "ayush@novamind.com";
            currentUserName = "Ayush Vercel";
            if(footerUserLabel) footerUserLabel.innerText = "Ayush Vercel";
            authOverlay.style.display = 'none';
            loadCloudChatHistory();
        }

        if (e.target.id === 'authSubmitBtn') {
            const email = document.getElementById('authUsername')?.value.trim();
            const pass = document.getElementById('authPassword')?.value.trim();
            const name = nameField?.value.trim() || "User Node";

            if (!email || !pass) return alert("Fields missing.");
            
            const db = getLocalMemoryDB();
            if (authMode === "signup") {
                const check = db.users.find(u => u.email === email);
                if (check) return alert("User already active!");
                db.users.push({ email, pass, name });
                writeLocalMemoryDB(db);
                alert("Account deployed! Please sign in.");
                authMode = "signup"; switchLink.click();
            } else {
                const check = db.users.find(u => u.email === email && u.pass === pass);
                if (!check) return alert("Wrong email or password.");
                localStorage.setItem("novaUserEmail", check.email);
                localStorage.setItem("novaUserName", check.name);
                currentUserEmail = check.email;
                currentUserName = check.name;
                if(footerUserLabel) footerUserLabel.innerText = check.name;
                authOverlay.style.display = 'none';
                loadCloudChatHistory();
            }
        }
    });
}
