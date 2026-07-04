const attachBtn = document.getElementById("attach");
const attachMenu = document.getElementById("attachMenu");
const input = document.getElementById("message");
const chat = document.getElementById("chat");
const button = document.getElementById("send");
const micButton = document.getElementById("mic");
const themeToggle = document.getElementById("themeToggle");
const voiceReplyToggle = document.getElementById("voiceReplyToggle");

const imageInput = document.getElementById("image");
const pdfInput = document.getElementById("pdf");
const docxInput = document.getElementById("docx");
const txtInput = document.getElementById("txt");
const previewContainer = document.getElementById("previewContainer");
const previewName = document.getElementById("previewName");
const cancelPreview = document.getElementById("cancelPreview");

let imageBase64 = "";
let uploadedFileData = ""; 
let uploadedFileName = "";
let uploadedFileType = ""; 
let isVoiceReplyEnabled = true;
let lastUserMessage = ""; // For regenerate function

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

// Speak AI text out loud (AI Voice Reply)
function speakText(text) {
    if (!isVoiceReplyEnabled) return;
    window.speechSynthesis.cancel(); // Stop any previous speech
    const speech = new SpeechSynthesisUtterance(text.replace(/[\#\*`_-]/g, "")); // Clean markdown symbols
    speech.lang = "hi-IN"; // Supports both Hindi and English context smoothly
    window.speechSynthesis.speak(speech);
}

voiceReplyToggle.addEventListener("click", () => {
    isVoiceReplyEnabled = !isVoiceReplyEnabled;
    voiceReplyToggle.innerText = isVoiceReplyEnabled ? "🔊" : "🔇";
});

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    themeToggle.innerText = document.body.classList.contains("dark-theme") ? "🌙" : "☀️";
});

// File Loading Logic
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
});

txtInput.addEventListener("change", function() { handleFileSelect(this.files[0], "txt", "text"); });
pdfInput.addEventListener("change", function() { handleFileSelect(this.files[0], "pdf", "dataurl"); });
docxInput.addEventListener("change", function() { handleFileSelect(this.files[0], "docx", "dataurl"); });

cancelPreview.addEventListener("click", resetAttachments);

function resetAttachments() {
    imageBase64 = ""; uploadedFileData = ""; uploadedFileName = ""; uploadedFileType = "";
    previewName.innerText = ""; previewContainer.style.display = "none";
    imageInput.value = ""; pdfInput.value = ""; docxInput.value = ""; txtInput.value = "";
}

async function sendMessage(overrideText = null) {
    const text = overrideText !== null ? overrideText : input.value.trim();
    if (text === "" && imageBase64 === "" && uploadedFileData === "") return;

    if (overrideText === null) lastUserMessage = text;
    const timeStamp = getCurrentTime();

    if (text !== "") {
        chat.innerHTML += `
        <div class="message user">
            <div class="msg-text">${text}</div>
            <div class="msg-meta">
                <span class="time">${timeStamp}</span>
                <span style="cursor:pointer; opacity:0.6;" onclick="editMessage(this)">✏️</span>
            </div>
        </div>`;
    }

    input.value = "";
    previewContainer.style.display = "none";
    chat.scrollTop = chat.scrollHeight;

    const typing = document.createElement("div");
    typing.className = "message ai";
    typing.id = "typing";
    typing.innerHTML = `<div class="msg-text">⚡ NovaMind AI is thinking (Web Search Active)...</div>`;
    chat.appendChild(typing);
    chat.scrollTop = chat.scrollHeight;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                image: imageBase64,
                fileData: uploadedFileData,
                fileName: uploadedFileName,
                fileType: uploadedFileType
            })
        });

        const data = await response.json();
        if (document.getElementById("typing")) document.getElementById("typing").remove();

        const aiTime = getCurrentTime();
        const escapedReply = escapeHtml(data.reply || "");

        chat.innerHTML += `
        <div class="message ai">
            <div class="msg-text">${data.reply}</div>
            <div class="msg-meta">
                <span class="time">${aiTime}</span>
                <button class="copy-btn" onclick="navigator.clipboard.writeText('${escapedReply}')">📋</button>
                <button class="tts-btn" onclick="speakText('${escapedReply}')">🔊</button>
                <span style="cursor:pointer; font-size:12px; margin-left:5px;" onclick="regenerateResponse()">🔄</span>
            </div>
        </div>`;

        chat.scrollTop = chat.scrollHeight;
        speakText(data.reply);
        resetAttachments();

    } catch (error) {
        if (document.getElementById("typing")) document.getElementById("typing").remove();
        chat.innerHTML += `<div class="message ai"><div class="msg-text">❌ Connection Error.</div></div>`;
    }
}

function editMessage(element) {
    const oldText = element.parentElement.previousElementSibling.innerText;
    const newText = prompt("Edit your message:", oldText);
    if (newText !== null && newText.trim() !== "") {
        sendMessage(newText.trim());
    }
}

function regenerateResponse() {
    if (lastUserMessage !== "") {
        sendMessage(lastUserMessage);
    }
}

button.addEventListener("click", () => sendMessage());
input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });

// Voice Input Configuration
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    micButton.addEventListener("click", () => { recognition.start(); micButton.innerText = "🎙️"; });
    recognition.onresult = (e) => { input.value = e.results[0][0].transcript; micButton.innerText = "🎤"; sendMessage(); };
    recognition.onerror = () => micButton.innerText = "🎤";
    recognition.onend = () => micButton.innerText = "🎤";
} else {
    micButton.innerText = "❌"; micButton.disabled = true;
}

attachBtn.addEventListener("click", (e) => { e.stopPropagation(); attachMenu.classList.toggle("active"); });
document.addEventListener("click", (e) => { if (!attachMenu.contains(e.target) && !attachBtn.contains(e.target)) attachMenu.classList.remove("active"); });
