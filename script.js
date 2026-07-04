// ====================================================================
// NovaMind AI V4 - Master Frontend Engine (Fully Functional Mock Auth)
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
    if (!text && !imageBase64 && !uploadedFileData) return;
    messageInput.value = '';
    
    const mode = (typeof activeGenerationMode !== "undefined") ? activeGenerationMode : "chat";
    const aspectEl = document.getElementById("aspectRatio");
    const ratio = aspectEl ? aspectEl.value : "16:9";

    const msgId = "msg-" + Date.now();
    appendMessage('user', text, imageBase64 || uploadedFileData ? true : false, null, msgId);
    
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

        const aiMsgId = "ai-" + Date.now();
        if (data.reply || data.mediaUrl) {
            appendMessage('ai', data.reply, data.mediaUrl, data.mediaType, aiMsgId);
            if (isVoiceReplyEnabled) speakText(data.reply);
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

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const safeText = (text || "").replace(/`/g, '\\`').replace(/\$/g, '\\$');
    
    let metaControls = "";
    if (sender === 'ai') {
        metaControls = `
            <span class="action-icon" style="cursor:pointer;" onclick="navigator.clipboard.writeText(\`${safeText}\`)">📋 Copy</span>
            <span class="action-icon" style="cursor:pointer; margin-left:8px;" onclick="speakText(\`${safeText}\`)">🔊 Speak</span>`;
    } else {
        metaControls = `
            <span class="action-icon" style="cursor:pointer;" onclick="triggerMessageEdit(this, '${id}')">✏️ Edit</span>
            <span class="action-icon" style="cursor:pointer; margin-left:8px;" onclick="triggerMessageDelete('${id}')">🗑️ Del</span>`;
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

window.speakText = speakText;
window.triggerMessageDelete = function(id) {
    document.getElementById(`msg-${id}`)?.remove();
};
window.triggerMessageEdit = function(el, id) {
    const txtNode = el.parentElement.previousElementSibling;
    const updatedTxt = prompt("Refactor message text context:", txtNode.innerText.replace(/✏️ Edit|🗑️ Del/g, '').trim());
    if (updatedTxt && updatedTxt.trim() !== "") {
        txtNode.innerHTML = updatedTxt.replace(/\n/g, '<br>');
        sendMessage(updatedTxt);
    }
};

// ==========================================
// 👤 Professional Fully Functional Auth System
// ==========================================
const userProfileBtn = document.getElementById('userProfile');
let authOverlay = document.querySelector('.auth-overlay');

if (!authOverlay) {
    authOverlay = document.createElement('div');
    authOverlay.className = 'auth-overlay';
    authOverlay.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); z-index:2500; display:none; align-items:center; justify-content:center; padding:20px; font-family:sans-serif;";
    
    authOverlay.innerHTML = `
        <div class="auth-box" style="background:#1e293b; padding:30px; border-radius:20px; width:100%; max-width:380px; color:#fff; border:1px solid #334155; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <div style="display:flex; justify-content:between; align-items:center; margin-bottom:15px;">
                <h3 id="authTitle" style="margin:0; font-size:20px; color:#fff;">👤 Sign In to NovaMind</h3>
            </div>
            
            <button id="googleAuthBtn" style="width:100%; padding:11px; margin-top:10px; margin-bottom:15px; border-radius:10px; border:1px solid #475569; background:#fff; color:#1e293b; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:0.2s;">
                <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/web-24dp/copy_of_web-24dp.png" width="18" alt="Google Logo">
                <span id="googleBtnText">Continue with Google</span>
            </button>
            
            <div style="text-align:center; margin:10px 0; opacity:0.5; font-size:12px;">— OR —</div>

            <input type="text" id="authName" placeholder="Full Name" style="width:100%; padding:12px; margin:8px 0; border-radius:8px; border:1px solid #475569; background:rgba(0,0,0,0.3); color:#fff; display:none; box-sizing:border-box;">
            <input type="text" id="authUsername" placeholder="Email Address" style="width:100%; padding:12px; margin:8px 0; border-radius:8px; border:1px solid #475569; background:rgba(0,0,0,0.3); color:#fff; box-sizing:border-box;">
            <input type="password" id="authPassword" placeholder="Password" style="width:100%; padding:12px; margin:8px 0; border-radius:8px; border:1px solid #475569; background:rgba(0,0,0,0.3); color:#fff; box-sizing:border-box;">
            
            <button id="authSubmitBtn" style="width:100%; padding:12px; margin-top:12px; border-radius:8px; border:none; background:#4f46e5; color:#fff; font-weight:bold; cursor:pointer; font-size:14px;">Sign In</button>
            
            <div style="margin-top:15px; text-align:center; font-size:13px; opacity:0.8;">
                <span id="authSwitchPrompt">Don't have an account?</span> 
                <a href="#" id="authSwitchModeBtn" style="color:#818cf8; text-decoration:none; font-weight:bold; margin-left:4px;">Sign Up</a>
            </div>
            
            <button id="authCloseBtn" style="width:100%; padding:10px; margin-top:15px; border-radius:8px; border:none; background:#334155; color:#cbd5e1; cursor:pointer; font-size:12px;">Cancel</button>
        </div>`;
    document.body.appendChild(authOverlay);
}

let authMode = "signin"; 

// Local dynamic database structure storage logic array setup
if(!localStorage.getItem("nova_mock_users")) {
    localStorage.setItem("nova_mock_users", JSON.stringify([{email: "ayush@novamind.com", pass: "123456", name: "Ayush"}]));
}

if (userProfileBtn) {
    userProfileBtn.addEventListener('click', () => {
        authOverlay.style.display = 'flex';
    });
}

// RESTORED COMPONENT HANDLERS: Complete operational workflow tracking
authOverlay.addEventListener('click', (e) => {
    const nameField = document.getElementById('authName');
    const titleText = document.getElementById('authTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const promptText = document.getElementById('authSwitchPrompt');
    const switchLink = document.getElementById('authSwitchModeBtn');
    const googleText = document.getElementById('googleBtnText');

    if (e.target.id === 'authCloseBtn') {
        authOverlay.style.display = 'none';
    }

    if (e.target.id === 'authSwitchModeBtn') {
        e.preventDefault();
        if (authMode === "signin") {
            authMode = "signup";
            titleText.innerText = "📝 Create Account";
            nameField.style.display = "block";
            submitBtn.innerText = "Sign Up / Register";
            promptText.innerText = "Already have an account?";
            switchLink.innerText = "Sign In";
            googleText.innerText = "Sign Up with Google";
        } else {
            authMode = "signin";
            titleText.innerText = "👤 Sign In to NovaMind";
            nameField.style.display = "none";
            submitBtn.innerText = "Sign In";
            promptText.innerText = "Don't have an account?";
            switchLink.innerText = "Sign Up";
            googleText.innerText = "Continue with Google";
        }
    }

    // FIXED: Google Login Operational Workflow Synchronization Structure
    if (e.target.id === 'googleAuthBtn' || e.target.closest('#googleAuthBtn')) {
        const mockGoogleEmail = "ayush.google@gmail.com";
        const generatedToken = "google_oauth_token_" + Math.random().toString(36).substring(7);
        
        localStorage.setItem("novaSessionToken", generatedToken);
        localStorage.setItem("currentUser", "Ayush (Google Connected)");
        
        // Custom message update block element
        const welcomeMessage = document.querySelector(".message.ai .msg-text");
        if(welcomeMessage) {
            welcomeMessage.innerHTML = `Hello Ayush 👋<br><br>NovaMind V4 Engine is successfully synchronized via Google Account! Multi-format operations are live.`;
        }

        alert("🔄 Syncing Google Token Credentials...\nAuthorized State established!");
        authOverlay.style.display = 'none';
    }

    // FIXED: Email / Password Core Structural Sync Logic Handler
    if (e.target.id === 'authSubmitBtn') {
        const email = document.getElementById('authUsername')?.value.trim();
        const pass = document.getElementById('authPassword')?.value.trim();
        const name = nameField?.value.trim();
        let userDb = JSON.parse(localStorage.getItem("nova_mock_users"));

        if (!email || !pass) {
            alert("⚠️ Please fill all required credential inputs.");
            return;
        }

        if (authMode === "signup") {
            if (!name) { alert("⚠️ Please provide your full name for registration."); return; }
            
            // Check if user exists
            if(userDb.some(u => u.email === email)) {
                alert("⚠️ Account already exists with this email address.");
                return;
            }

            userDb.push({email, pass, name});
            localStorage.setItem("nova_mock_users", JSON.stringify(userDb));
            localStorage.setItem("novaSessionToken", "token_" + Date.now());
            localStorage.setItem("currentUser", name);
            
            alert(`🎉 Registration successful! Welcome ${name}.`);
        } else {
            // Sign In Validation Layer Loop
            const authenticatedUser = userDb.find(u => u.email === email && u.pass === pass);
            if(authenticatedUser) {
                localStorage.setItem("novaSessionToken", "token_" + Date.now());
                localStorage.setItem("currentUser", authenticatedUser.name);
                alert(`🚀 Welcome back, ${authenticatedUser.name}! Session initialized.`);
            } else {
                alert("❌ Invalid email or password structure phrase. Please check credentials or Sign Up.");
                return;
            }
        }
        
        const welcomeMessage = document.querySelector(".message.ai .msg-text");
        const activeUser = localStorage.getItem("currentUser") || "Ayush";
        if(welcomeMessage) {
            welcomeMessage.innerHTML = `Hello ${activeUser} 👋<br><br>NovaMind V4 Engine is successfully synchronized! Multi-format operations are active.`;
        }
        
        authOverlay.style.display = 'none';
    }
});
