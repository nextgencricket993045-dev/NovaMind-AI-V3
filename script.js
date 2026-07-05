// ====================================================================
// NovaMind AI V4 - Premium Stable Core Script Engine (Voice Mode Live)
// ====================================================================

let imageBase64 = null;
let uploadedFileData = null;
let uploadedFileName = null;
let uploadedFileType = null;
let isVoiceReplyEnabled = false;
let authMode = "signin"; 

// 🔊 Walkie-Talkie Fluid Architecture Core Parameters
let isWalkieTalkieActive = false;
let speechRecognitionAgent = null;
let currentVoiceUtteranceInstance = null;

let currentUserEmail = localStorage.getItem("novaUserEmail") || null;
let currentUserName = localStorage.getItem("novaUserName") || null;

// Clean Speech Synthesis Module
function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Clear heavy Markdown structures from plain text synthesis payload
    const plainText = text.replace(/[\#\*`_\-]/g, "").trim();
    currentVoiceUtteranceInstance = new SpeechSynthesisUtterance(plainText);
    currentVoiceUtteranceInstance.lang = "hi-IN";

    // Loopback Hooks: If Walkie Talkie is active, pause listener while speaking
    currentVoiceUtteranceInstance.onstart = () => {
        if (isWalkieTalkieActive && speechRecognitionAgent) {
            document.getElementById('voiceStatusText').innerText = "Walkie-Talkie: NovaMind AI is speaking...";
            try { speechRecognitionAgent.stop(); } catch(e){}
        }
    };

    currentVoiceUtteranceInstance.onend = () => {
        currentVoiceUtteranceInstance = null;
        if (isWalkieTalkieActive && speechRecognitionAgent) {
            document.getElementById('voiceStatusText').innerText = "Walkie-Talkie: Listening to you...";
            try { speechRecognitionAgent.start(); } catch(e){}
        }
    };

    window.speechSynthesis.speak(currentVoiceUtteranceInstance);
}

// Setup Standard Voice Synthesizer Button Triggers
const voiceToggle = document.getElementById("voiceReplyToggle");
if (voiceToggle) {
    voiceToggle.addEventListener("click", () => {
        isVoiceReplyEnabled = !isVoiceReplyEnabled;
        voiceToggle.innerText = isVoiceReplyEnabled ? "🔊" : "🔇";
    });
}

// ==========================================
// 🎙️ Walkie Talkie Recognition Core Setup
// ==========================================
function initSpeechRecognitionPipeline() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Web Speech API is not supported in this browser engine.");
        return;
    }
    
    speechRecognitionAgent = new SpeechRecognition();
    speechRecognitionAgent.continuous = false; // Process individual fluid sentences cleanly
    speechRecognitionAgent.interimResults = false;
    speechRecognitionAgent.lang = "hi-IN"; // Dynamic bilingual interpretation matrix

    speechRecognitionAgent.onresult = (event) => {
        const voiceCapturedText = event.results[0][0].transcript;
        if (voiceCapturedText.trim() !== "") {
            document.getElementById('voiceStatusText').innerText = "Processing your message... ⏳";
            sendMessage(voiceCapturedText);
        }
    };

    speechRecognitionAgent.onerror = (e) => {
        if (e.error === 'no-speech' && isWalkieTalkieActive) {
            // Auto restart loop if silence timeouts
            try { speechRecognitionAgent.start(); } catch(err){}
        }
    };

    speechRecognitionAgent.onend = () => {
        // Safe check to maintain continuous background listening matrix loop
        if (isWalkieTalkieActive && !window.speechSynthesis.speaking && !currentVoiceUtteranceInstance) {
            try { speechRecognitionAgent.start(); } catch(err){}
        }
    };
}

window.stopWalkieTalkieMode = function() {
    isWalkieTalkieActive = false;
    document.getElementById("walkieTalkieToggle").style.background = "transparent";
    document.getElementById('voiceStatusPanel').style.setProperty('display', 'none', 'important');
    if (speechRecognitionAgent) { try { speechRecognitionAgent.stop(); } catch(e){} }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
};

const walkieToggleBtn = document.getElementById("walkieTalkieToggle");
if (walkieToggleBtn) {
    walkieToggleBtn.addEventListener("click", () => {
        if (isWalkieTalkieActive) {
            stopWalkieTalkieMode();
        } else {
            isWalkieTalkieActive = true;
            isVoiceReplyEnabled = true; // Force-enable audio synthesis output
            if(voiceToggle) voiceToggle.innerText = "🔊";
            
            walkieToggleBtn.style.background = "#10b981";
            document.getElementById('voiceStatusPanel').style.setProperty('display', 'flex', 'important');
            document.getElementById('voiceStatusText').innerText = "Walkie-Talkie Active: Listening...";
            
            if (!speechRecognitionAgent) initSpeechRecognitionPipeline();
            try { speechRecognitionAgent.start(); } catch(err){}
        }
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

// File Input Binder
const masterFileInput = document.getElementById('masterFileInput');
if (masterFileInput) {
    masterFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const targetType = this.getAttribute('data-target-type');
        const reader = new FileReader();
        
        reader.onload = function(evt) {
            const rawBase64 = evt.target.result.split(',')[1];
            if (targetType === 'image') imageBase64 = rawBase64;
            else uploadedFileData = rawBase64;
            
            uploadedFileName = file.name; uploadedFileType = targetType;
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

// Messaging Logic Hub
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

        if (data && (data.reply || data.mediaUrl)) {
            appendMessage('ai', data.reply || "", data.mediaUrl, data.mediaType);
            
            // Core Audio Loop Trigger
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
    div.className = `message ${sender}`; div.id = `msg-${id}`;
    
    let html = `<div class="msg-text">`;
    if (sender === 'ai' && typeof marked !== 'undefined' && text) html += marked.parse(text);
    else html += (text || "").replace(/\n/g, '<br>');
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
    div.innerHTML = html; chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (sender === 'ai' && typeof hljs !== 'undefined') {
        div.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    }
}

function appendLoading() {
    const id = 'load-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message ai'; div.id = id;
    div.innerHTML = `<div class="msg-text">Analyzing sound matrices and building simple answer... ⏳</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}
function removeLoading(id) { const el = document.getElementById(id); if (el) el.remove(); }

window.speakText = speakText;
window.triggerDelete = function(id) { document.getElementById(`msg-${id}`)?.remove(); };
window.triggerRegenerate = function() { if (lastUserPrompt) sendMessage(lastUserPrompt); };

// Menu Interfaces
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

// User Profiles Authentication Mapping Layer
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
                authMode = "signup"; titleText.innerText = "Create account";
                subtitleText.innerText = "Setup private local keys safely";
                if(nameField) nameField.style.display = "block";
                submitBtn.innerText = "Sign Up";
            } else {
                authMode = "signin"; titleText.innerText = "Welcome back";
                subtitleText.innerText = "Provide password parameters";
                if(nameField) nameField.style.display = "none";
                submitBtn.innerText = "Continue";
            }
        }

        if (e.target.id === 'googleAuthBtn' || e.target.closest('#googleAuthBtn')) {
            localStorage.setItem("novaUserEmail", "ayush@novamind.com");
            localStorage.setItem("novaUserName", "Ayush Vercel");
            currentUserEmail = "ayush@novamind.com"; currentUserName = "Ayush Vercel";
            if(footerUserLabel) footerUserLabel.innerText = "Ayush Vercel";
            authOverlay.style.display = 'none'; loadCloudChatHistory();
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
                if (!check) return alert("Wrong credentials.");
                localStorage.setItem("novaUserEmail", check.email);
                localStorage.setItem("novaUserName", check.name);
                currentUserEmail = check.email; currentUserName = check.name;
                if(footerUserLabel) footerUserLabel.innerText = check.name;
                authOverlay.style.display = 'none'; loadCloudChatHistory();
            }
        }
    });
}
