// ====================================================================
// NovaMind AI V4 - Premium Stable Core Script Engine (Absolute Master)
// ====================================================================

let imageBase64 = null;
let uploadedFileData = null;
let uploadedFileName = null;
let uploadedFileType = null;
let isVoiceReplyEnabled = false;
let authMode = "signin"; 
let activeGenerationMode = "chat"; 

let currentUserEmail = localStorage.getItem("novaUserEmail") || "guest_user";
let currentUserName = localStorage.getItem("novaUserName") || "Guest Account";

function renderMathFormulasSafely(element) {
    if (typeof renderMathInElement !== "undefined") {
        renderMathInElement(element, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
        });
    }
}

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

// 🎙️ WALKIETALKIE GUARD ENGINE
let isWalkieTalkieActive = false;
let speechRecognitionAgent = null;

function executeMicPipelineLifecycle() {
    if (isWalkieTalkieActive !== true) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!speechRecognitionAgent) {
        speechRecognitionAgent = new SpeechRecognition();
        speechRecognitionAgent.continuous = false;
        speechRecognitionAgent.interimResults = false;
        speechRecognitionAgent.lang = "hi-IN";

        speechRecognitionAgent.onresult = (event) => {
            const text = event.results[0][0].transcript;
            if (text && text.trim() !== "") sendMessage(text.trim());
        };

        speechRecognitionAgent.onend = () => {
            if (isWalkieTalkieActive === true && !window.speechSynthesis.speaking) {
                try { speechRecognitionAgent.start(); } catch(e){}
            }
        };
    }
    try { speechRecognitionAgent.start(); } catch(e){}
}

window.stopWalkieTalkieMode = function() {
    isWalkieTalkieActive = false;
    const walkieBtn = document.getElementById("walkieTalkieToggle");
    if(walkieBtn) walkieBtn.style.background = "transparent";
    const statusPanel = document.getElementById('voiceStatusPanel');
    if(statusPanel) statusPanel.style.setProperty('display', 'none', 'important');
    if (speechRecognitionAgent) { try { speechRecognitionAgent.stop(); } catch(e){} }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
};

window.triggerManualWalkieTalkie = function(e) {
    if (!e || !e.isTrusted || e.detail === 0) return; 
    if (isWalkieTalkieActive === true) {
        stopWalkieTalkieMode();
    } else {
        isWalkieTalkieActive = true;
        isVoiceReplyEnabled = true;
        if(voiceToggle) voiceToggle.innerText = "🔊";
        const walkieBtn = document.getElementById("walkieTalkieToggle");
        if(walkieBtn) walkieBtn.style.background = "#10b981";
        const statusPanel = document.getElementById('voiceStatusPanel');
        if(statusPanel) statusPanel.style.setProperty('display', 'flex', 'important');
        executeMicPipelineLifecycle();
    }
};

window.switchGenerationMode = function(targetMode) {
    activeGenerationMode = targetMode;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetTabBtn = document.getElementById(`mode-${targetMode}`);
    if (targetTabBtn) targetTabBtn.classList.add('active');

    const mainInput = document.getElementById("message");
    const ratioSelect = document.getElementById("aspectRatio");

    if(targetMode === "chat") {
        if(mainInput) mainInput.placeholder = "Ask NovaMind AI...";
        if(ratioSelect) ratioSelect.style.display = "none";
    } else {
        if(mainInput) mainInput.placeholder = `Describe prompt to generate ${targetMode}...`;
        if(ratioSelect) ratioSelect.style.display = "block";
    }
};

// 🗂️ Sidebar LocalDB Modules
const sidebar = document.getElementById('sidebar');
const sidebarOpenBtn = document.getElementById('sidebarOpenBtn');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const chatHistoryList = document.getElementById('chatHistoryList');
const footerUserLabel = document.getElementById('footerUserLabel');
const newChatBtn = document.getElementById('newChatBtn');

if (sidebarOpenBtn) sidebarOpenBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.add('active'); });
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', () => sidebar.classList.remove('active'));

document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== sidebarOpenBtn) {
        sidebar.classList.remove('active');
    }
});

function getLocalMemoryDB() {
    let db = localStorage.getItem("nova_memory_vault");
    if (!db) { db = JSON.stringify({ users: [], chats: [] }); localStorage.setItem("nova_memory_vault", db); }
    try { return JSON.parse(db); } catch(e) { return { users: [], chats: [] }; }
}
function writeLocalMemoryDB(data) { localStorage.setItem("nova_memory_vault", JSON.stringify(data)); }

function loadCloudChatHistory() {
    if (!chatHistoryList) return;
    const db = getLocalMemoryDB();
    const history = (db.chats || []).filter(c => c.userEmail === currentUserEmail).slice(-15).reverse();
    chatHistoryList.innerHTML = history.length === 0 ? `<div style="font-size:12px; opacity:0.4; padding:10px;">No recent sessions</div>` : "";
    history.forEach(log => {
        const btn = document.createElement('button'); btn.className = "history-item-node"; btn.innerText = `💬 ${log.title}`;
        btn.addEventListener('click', () => {
            const chatBox = document.getElementById('chat');
            chatBox.innerHTML = `<div class="message user"><div class="msg-text">${log.prompt}</div></div><div class="message ai"><div class="msg-text">${log.response}</div></div>`;
            renderMathFormulasSafely(chatBox); sidebar.classList.remove('active');
            if (typeof hljs !== 'undefined') chatBox.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
        });
        chatHistoryList.appendChild(btn);
    });
}

if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        const chatContainer = document.getElementById('chat');
        if (chatContainer) chatContainer.innerHTML = `<div class="message ai" id="msg-welcome-init"><div class="msg-text">Workspace Active. Chat and Video Matrix Studio is deployed successfully. 👍</div></div>`;
        imageBase64 = null; uploadedFileData = null; uploadedFileName = null; uploadedFileType = null;
        const preview = document.getElementById('previewContainer');
        if (preview) preview.style.display = 'none';
        const msgInput = document.getElementById('message');
        if (msgInput) msgInput.value = '';
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (sidebar) sidebar.classList.remove('active');
    });
}

if (footerUserLabel) footerUserLabel.innerText = currentUserName;
loadCloudChatHistory();

// 🎥 FILE & MASSIVE VIDEO LOADER INTEGRATION
const masterFileInput = document.getElementById('masterFileInput');
if (masterFileInput) {
    masterFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        const targetType = this.getAttribute('data-target-type');
        
        document.getElementById('previewName').textContent = `⏳ Processing massive file...`;
        document.getElementById('previewContainer').style.display = 'flex';
        
        const reader = new FileReader();
        reader.onload = function(evt) {
            const rawBase64 = evt.target.result.split(',')[1];
            if (targetType === 'image') {
                imageBase64 = rawBase64;
            } else {
                uploadedFileData = rawBase64; // Handles massive MB base64 seamlessly
            }
            uploadedFileName = file.name; 
            uploadedFileType = targetType;
            document.getElementById('previewName').textContent = `📎 Ready (${targetType.toUpperCase()}): ${file.name}`;
        };
        reader.readAsDataURL(file);
    });
}
document.getElementById('cancelPreview').addEventListener('click', () => { imageBase64 = null; uploadedFileData = null; uploadedFileName = null; uploadedFileType = null; document.getElementById('previewContainer').style.display = 'none'; });

// Messages Matrix Pipeline
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
    const mode = activeGenerationMode; 
    const ratio = document.getElementById("aspectRatio") ? document.getElementById("aspectRatio").value : "16:9";
    const displayPrompt = text || `Analyzed Uploaded ${uploadedFileType || 'Asset'} Block: ${uploadedFileName || ''}`;
    
    appendMessage('user', displayPrompt, null, null, "user-" + Date.now());
    if(messageInput) messageInput.value = '';
    const loadingId = appendLoading();

    const payload = { message: text, generationMode: mode, aspectRatio: ratio, image: imageBase64, fileData: uploadedFileData, fileType: uploadedFileType };
    imageBase64 = null; uploadedFileData = null; document.getElementById('previewContainer').style.display = 'none';

    try {
        const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await response.json();
        removeLoading(loadingId);

        if (data) {
            appendMessage('ai', data.reply || "", data.mediaUrl, data.mediaType, "ai-" + Date.now());
            if (isVoiceReplyEnabled && data.reply) speakText(data.reply);
            
            if (mode === "chat" && data.reply) {
                const db = getLocalMemoryDB();
                const logTitle = displayPrompt.length > 20 ? displayPrompt.substring(0, 20) + "..." : displayPrompt;
                if(!db.chats) db.chats = [];
                db.chats.push({ userEmail: currentUserEmail, title: logTitle, prompt: displayPrompt, response: data.reply });
                writeLocalMemoryDB(db); loadCloudChatHistory();
            }
        }
    } catch (error) {
        removeLoading(loadingId);
        appendMessage('ai', `⚠️ Sync Error: ${error.message}`);
    }
}

function appendMessage(sender, text, mediaUrl = null, mediaType = null, id = "") {
    const div = document.createElement('div'); div.className = `message ${sender}`; div.id = `msg-${id}`;
    let html = `<div class="msg-text">`;
    if (sender === 'ai' && typeof marked !== 'undefined' && text) html += marked.parse(text);
    else html += (text || "").replace(/\n/g, '<br>');
    html += `</div>`;

    if (mediaUrl) {
        html += `<div class="media-container" style="margin-top:12px;">`;
        if (mediaType === 'image') html += `<img src="${mediaUrl}" style="max-width:100%; border-radius:12px;">`;
        html += `</div>`;
    }

    const safe = (text || "").replace(/`/g, '\\`').replace(/\$/g, '\\$');
    let controls = sender === 'ai' ? `
        <span class="action-icon" onclick="if(event.isTrusted) navigator.clipboard.writeText(\`${safe}\`)">📋 Copy</span>
        <span class="action-icon" style="margin-left:8px;" onclick="if(event.isTrusted) speakText(\`${safe}\`)">🔊 Speak</span>
        <span class="action-icon" style="margin-left:8px;" onclick="if(event.isTrusted) window.triggerRegenerate()">🔄 Re-gen</span>` : `
        <span class="action-icon" onclick="if(event.isTrusted) window.triggerMessageEdit(this, '${id}')">✏️ Edit</span>
        <span class="action-icon" style="margin-left:8px;" onclick="if(event.isTrusted) window.triggerDelete('${id}')">🗑️ Del</span>`;

    html += `<div class="msg-meta-bar">${controls}</div>`; div.innerHTML = html;
    chatContainer.appendChild(div); chatContainer.scrollTop = chatContainer.scrollHeight;
    renderMathFormulasSafely(div);
    if (sender === 'ai' && typeof hljs !== 'undefined') div.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
}

function appendLoading() {
    const id = 'load-' + Date.now(); const div = document.createElement('div'); div.className = 'message ai'; div.id = id;
    div.innerHTML = `<div class="msg-text">Processing matrix parameters... ⏳</div>`;
    chatContainer.appendChild(div); chatContainer.scrollTop = chatContainer.scrollHeight; return id;
}
function removeLoading(id) { const el = document.getElementById(id); if (el) el.remove(); }

window.triggerDelete = function(id) { document.getElementById(`msg-${id}`)?.remove(); };
window.triggerRegenerate = function() { if (lastUserPrompt) sendMessage(lastUserPrompt); };
window.triggerMessageEdit = function(el, id) {
    const node = el.parentElement.previousElementSibling;
    const text = prompt("Edit message:", node.innerText.trim());
    if (text) sendMessage(text.trim());
};

const themeToggle = document.getElementById('themeToggle');
if(themeToggle) {
    document.body.classList.add('dark-theme'); themeToggle.innerText = "🌙";
    themeToggle.addEventListener('click', () => {
        const isDarkNow = document.body.classList.toggle('dark-theme');
        themeToggle.innerText = isDarkNow ? "🌙" : "☀️";
    });
}

const attach = document.getElementById('attach'); const attachMenu = document.getElementById('attachMenu');
if(attach) attach.addEventListener('click', (e) => { e.stopPropagation(); attachMenu.classList.toggle('active'); });
document.addEventListener('click', () => { if(attachMenu) attachMenu.classList.remove('active'); });

const userProfile = document.getElementById('userProfile'); const authOverlay = document.getElementById('authOverlay');
if(userProfile && authOverlay) userProfile.addEventListener('click', () => { authOverlay.style.display = 'flex'; authMode = "signin"; document.getElementById('authTitle').innerText = "Welcome back"; document.getElementById('authName').style.display = "none"; });

if (authOverlay) {
    authOverlay.addEventListener('click', async (e) => {
        const nameField = document.getElementById('authName'); const titleText = document.getElementById('authTitle');
        const submitBtn = document.getElementById('authSubmitBtn'); const switchLink = document.getElementById('authSwitchModeBtn');
        if (e.target.id === 'authCloseBtn') { authOverlay.style.display = 'none'; return; }
        if (e.target.id === 'authSwitchModeBtn') {
            e.preventDefault();
            if (authMode === "signin") {
                authMode = "signup"; titleText.innerText = "Create account"; nameField.style.display = "block"; submitBtn.innerText = "Sign Up"; switchLink.innerText = "Sign in";
            } else {
                authMode = "signin"; titleText.innerText = "Welcome back"; nameField.style.display = "none"; submitBtn.innerText = "Continue"; switchLink.innerText = "Sign up";
            }
        }
        if (e.target.id === 'googleAuthBtn' || e.target.closest('#googleAuthBtn')) {
            localStorage.setItem("novaUserEmail", "ayush@novamind.com"); localStorage.setItem("novaUserName", "Ayush Vercel");
            currentUserEmail = "ayush@novamind.com"; currentUserName = "Ayush Vercel"; if(footerUserLabel) footerUserLabel.innerText = "Ayush Vercel"; authOverlay.style.display = 'none'; loadCloudChatHistory(); return;
        }
        if (e.target.id === 'authSubmitBtn') {
            const email = document.getElementById('authUsername')?.value.trim(); const pass = document.getElementById('authPassword')?.value.trim(); const name = nameField?.value.trim() || "User Node";
            if (!email || !pass) return alert("Fields missing.");
            const db = getLocalMemoryDB();
            if (authMode === "signup") {
                if(!db.users) db.users = []; if (db.users.find(u => u.email === email)) return alert("User already active!");
                db.users.push({ email, pass, name }); writeLocalMemoryDB(db); alert("Account deployed!"); authMode = "signup"; switchLink.click();
            } else {
                const check = db.users.find(u => u.email === email && u.pass === pass); if (!check) return alert("Wrong credentials.");
                localStorage.setItem("novaUserEmail", check.email); localStorage.setItem("novaUserName", check.name);
                currentUserEmail = check.email; currentUserName = check.name; if(footerUserLabel) footerUserLabel.innerText = check.name; authOverlay.style.display = 'none'; loadCloudChatHistory();
            }
        }
    });
}
