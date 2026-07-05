// ====================================================================
// NovaMind AI V4 - Premium Stable Script Engine (Video Restored & Optimised)
// ====================================================================

let imageBase64 = null;
let uploadedFileData = null;
let uploadedFileName = null;
let uploadedFileType = null;
let isVoiceReplyEnabled = false;

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

if (sidebarOpenBtn) sidebarOpenBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.add('active'); });
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', () => sidebar.classList.remove('active'));

document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== sidebarOpenBtn) {
        sidebar.classList.remove('active');
    }
});

let activeChatHistory = JSON.parse(localStorage.getItem("nova_chat_logs")) || [];
function updateSidebarHistoryUI() {
    if (!chatHistoryList) return;
    chatHistoryList.innerHTML = "";
    activeChatHistory.forEach((log) => {
        const btn = document.createElement('button');
        btn.className = "history-item-node";
        btn.innerText = `💬 ${log.title}`;
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
        document.getElementById('chat').innerHTML = `<div class="message ai"><div class="msg-text">Refresh session started.</div></div>`;
        sidebar.classList.remove('active');
    });
}
updateSidebarHistoryUI();

// Unified Input Handler (Optimised for Large Video File Buffering sizes)
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

// Messages Hub
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

    appendMessage('user', text || `Uploaded Asset File Reference [${uploadedFileName}]`);
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
            if (isVoiceReplyEnabled && data.reply) speakText(data.reply);
            
            if (mode === "chat" && text && data.reply) {
                const title = text.length > 20 ? text.substring(0, 20) + "..." : text;
                activeChatHistory.unshift({ title, prompt: text, response: data.reply });
                localStorage.setItem("nova_chat_logs", JSON.stringify(activeChatHistory));
                updateSidebarHistoryUI();
            }
        }
    } catch (error) {
        removeLoading(loadingId);
        appendMessage('ai', `⚠️ Connection Crash: ${error.message}`);
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
    div.innerHTML = `<div class="msg-text">Analyzing file elements and processing simple explanation... ⏳</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}
function removeLoading(id) { const el = document.getElementById(id); if (el) el.remove(); }

window.speakText = speakText;
window.triggerDelete = function(id) { document.getElementById(`msg-${id}`)?.remove(); };
window.triggerRegenerate = function() { if (lastUserPrompt) sendMessage(lastUserPrompt); };

// Menu and Theme Controls
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

// Profiles Modal Mock Matrix
const userProfile = document.getElementById('userProfile');
const authOverlay = document.getElementById('authOverlay');
if(userProfile && authOverlay) userProfile.addEventListener('click', () => authOverlay.style.display = 'flex');
if(authOverlay) {
    authOverlay.addEventListener('click', (e) => {
        if(e.target.id === 'authCloseBtn' || e.target.id === 'googleAuthBtn' || e.target.id === 'authSubmitBtn') {
            authOverlay.style.display = 'none';
            if(e.target.id !== 'authCloseBtn') {
                document.getElementById('footerUserLabel').innerText = "Ayush (Active)";
            }
        }
    });
}
