// ====================================================================
// NovaMind AI V4 - Master Frontend Engine
// ====================================================================

let imageBase64 = null;
let uploadedFileData = null;
let uploadedFileName = null;
let uploadedFileType = null;
let userSessionToken = localStorage.getItem("novaSessionToken") || generateUUID();
localStorage.setItem("novaSessionToken", userSessionToken);

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ==========================================
// File Upload & Preview Handlers
// ==========================================
const fileInputs = ['image', 'video', 'pdf', 'docx', 'txt', 'xlsx', 'pptx'];
fileInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', (e) => handleFileUpload(e, id));
    }
});

function handleFileUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        if (type === 'image') {
            imageBase64 = e.target.result;
        } else {
            uploadedFileData = e.target.result;
        }
        uploadedFileName = file.name;
        uploadedFileType = type;
        
        document.getElementById('previewName').textContent = `📎 ${file.name}`;
        document.getElementById('previewContainer').style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

document.getElementById('cancelPreview').addEventListener('click', clearPreview);

function clearPreview() {
    imageBase64 = null;
    uploadedFileData = null;
    uploadedFileName = null;
    uploadedFileType = null;
    document.getElementById('previewContainer').style.display = 'none';
    fileInputs.forEach(id => {
        if (document.getElementById(id)) document.getElementById(id).value = '';
    });
}

// ==========================================
// UI & Menu Interactions
// ==========================================
const attachBtn = document.getElementById('attach');
const attachMenu = document.getElementById('attachMenu');

attachBtn.addEventListener('click', () => {
    attachMenu.classList.toggle('active');
    attachMenu.style.display = attachMenu.classList.contains('active') ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
    if (!attachBtn.contains(e.target) && !attachMenu.contains(e.target)) {
        attachMenu.classList.remove('active');
        attachMenu.style.display = 'none';
    }
});

const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});

if (localStorage.getItem('theme') === 'light') {
    document.body.classList.remove('dark-theme');
}

// ==========================================
// Core Messaging Pipeline
// ==========================================
const sendBtn = document.getElementById('send');
const messageInput = document.getElementById('message');
const chatContainer = document.getElementById('chat');

sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (text || imageBase64 || uploadedFileData) sendMessage(text);
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const text = messageInput.value.trim();
        if (text || imageBase64 || uploadedFileData) sendMessage(text);
    }
});

async function sendMessage(text) {
    messageInput.value = '';
    
    // Capturing Mode and UI states
    const mode = (typeof activeGenerationMode !== "undefined") ? activeGenerationMode : "chat";
    const aspectEl = document.getElementById("aspectRatio");
    const ratio = aspectEl ? aspectEl.value : "16:9"; // 16:9 Default for media

    appendMessage('user', text, imageBase64 || uploadedFileData ? true : false);
    
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
            headers: { 
                "Content-Type": "application/json",
                "x-forwarded-for": userSessionToken 
            },
            body: JSON.stringify({
                message: text,
                image: currentImage,
                fileData: currentFileData,
                fileName: currentFileName,
                fileType: currentFileType,
                generationMode: mode,
                aspectRatio: ratio
            })
        });

        const data = await response.json();
        removeLoading(loadingId);

        if (data.reply || data.mediaUrl) {
            appendMessage('ai', data.reply, data.mediaUrl, data.mediaType);
        } else {
            appendMessage('ai', "⚠️ Engine process completed but returned empty output.");
        }

    } catch (error) {
        removeLoading(loadingId);
        appendMessage('ai', `⚠️ Core Engine Disconnected: ${error.message}`);
    }
}

// ==========================================
// Chat UI Rendering Engine
// ==========================================
function appendMessage(sender, text, mediaUrl = null, mediaType = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    
    let contentHtml = `<div class="msg-text">`;
    
    // Parse Markdown text output if available
    if (sender === 'ai' && typeof marked !== 'undefined' && text) {
        contentHtml += marked.parse(text);
    } else if (text) {
        contentHtml += text.replace(/\n/g, '<br>');
    }
    
    // User attachment indicator
    if (sender === 'user' && mediaUrl === true) {
        contentHtml += `<br><small style="opacity: 0.7;">📎 [Attachment Included in Request]</small>`;
    }
    
    contentHtml += `</div>`;

    // Dynamic Media Container Renderer
    if (sender === 'ai' && mediaUrl && typeof mediaUrl === 'string') {
        contentHtml += `<div class="media-container" style="margin-top: 15px; text-align: center;">`;
        if (mediaType === 'image') {
            contentHtml += `<img src="${mediaUrl}" alt="Generated Asset" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">`;
        } else if (mediaType === 'audio') {
            contentHtml += `
                <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 12px; margin-bottom: 8px; opacity: 0.8;">🎵 Generated Audio Segment</div>
                    <audio src="${mediaUrl}" controls style="width: 100%; outline: none;"></audio>
                </div>`;
        }
        contentHtml += `</div>`;
    }

    if (sender === 'ai') {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        contentHtml += `
        <div class="msg-meta-bar">
            <span>${time}</span>
            <span class="action-icon" onclick="navigator.clipboard.writeText(this.parentElement.parentElement.innerText)">📋 Copy Text</span>
        </div>`;
    }

    msgDiv.innerHTML = contentHtml;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Developer code blocks highligter
    if (sender === 'ai' && typeof hljs !== 'undefined') {
        msgDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
}

function appendLoading() {
    const id = 'loading-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai';
    msgDiv.id = id;
    msgDiv.innerHTML = `<div class="msg-text">System processing prompt... ⏳</div>`;
    chatContainer.appendChild(msgDiv);
    return id;
}

function removeLoading(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}
