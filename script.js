// ==========================================
// NovaMind AI V3 - Core Script (Fixed)
// ==========================================

const attachBtn = document.getElementById("attach");
const attachMenu = document.getElementById("attachMenu");
const clearButton = document.getElementById("clear");
const input = document.getElementById("message");
const chat = document.getElementById("chat");
const button = document.getElementById("send"); // Fixed naming to 'button'
const micButton = document.getElementById("mic");
const themeToggle = document.getElementById("themeToggle");

// File Inputs & Preview Elements
const imageInput = document.getElementById("image");
const pdfInput = document.getElementById("pdf");
const docxInput = document.getElementById("docx");
const txtInput = document.getElementById("txt");
const previewContainer = document.getElementById("previewContainer");
const previewName = document.getElementById("previewName");
const cancelPreview = document.getElementById("cancelPreview");

// Global Variables to Store File Data
let imageBase64 = "";
let uploadedFileData = ""; 
let uploadedFileName = "";
let uploadedFileType = ""; 

// Helper function to get current time formatted
function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

// Helper function to escape text for HTML attributes
function escapeHtml(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ==========================================
// Theme Toggle (Dark / Light Mode)
// ==========================================
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    if (document.body.classList.contains("dark-theme")) {
        themeToggle.innerText = "🌙";
    } else {
        themeToggle.innerText = "☀️";
    }
});

// ==========================================
// File Input Handling (Image, TXT, PDF, DOCX)
// ==========================================

// 1. Image Compressor & Preview
imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    uploadedFileName = file.name;
    uploadedFileType = "image";

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const maxWidth = 1024;

            if (width > maxWidth) {
                height = Math.round(height * maxWidth / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            imageBase64 = canvas.toDataURL("image/jpeg", 0.6);
            
            previewName.innerText = `📷 Image: ${file.name}`;
            previewContainer.style.display = "flex";
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    attachMenu.classList.remove("active");
});

// 2. TXT File Reader
txtInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    uploadedFileName = file.name;
    uploadedFileType = "txt";

    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedFileData = e.target.result; 
        previewName.innerText = `📝 TXT: ${file.name}`;
        previewContainer.style.display = "flex";
    };
    reader.readAsText(file);
    attachMenu.classList.remove("active");
});

// 3. PDF File Handler
pdfInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    uploadedFileName = file.name;
    uploadedFileType = "pdf";

    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedFileData = e.target.result; 
        previewName.innerText = `📄 PDF: ${file.name}`;
        previewContainer.style.display = "flex";
    };
    reader.readAsDataURL(file);
    attachMenu.classList.remove("active");
});

// 4. DOCX File Handler
docxInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    uploadedFileName = file.name;
    uploadedFileType = "docx";

    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedFileData = e.target.result; 
        previewName.innerText = `📁 DOCX: ${file.name}`;
        previewContainer.style.display = "flex";
    };
    reader.readAsDataURL(file);
    attachMenu.classList.remove("active");
});

// Cancel Preview Button
cancelPreview.addEventListener("click", () => {
    resetAttachments();
});

function resetAttachments() {
    imageBase64 = "";
    uploadedFileData = "";
    uploadedFileName = "";
    uploadedFileType = "";
    previewName.innerText = "";
    previewContainer.style.display = "none";
    imageInput.value = "";
    pdfInput.value = "";
    docxInput.value = "";
    txtInput.value = "";
}

// ==========================================
// Messaging Logic
// ==========================================
async function sendMessage() {
    const text = input.value.trim();

    if (text === "" && imageBase64 === "" && uploadedFileData === "") return;

    const timeStamp = getCurrentTime();

    if (text !== "") {
        chat.innerHTML += `
        <div class="message user">
            <div class="msg-text">${text}</div>
            <div class="msg-meta"><span class="time">${timeStamp}</span></div>
        </div>`;
    }

    if (uploadedFileName !== "") {
        let icon = uploadedFileType === "image" ? "📷" : "📄";
        chat.innerHTML += `
        <div class="message user">
            <div class="msg-text">${icon} ${uploadedFileName}</div>
            <div class="msg-meta"><span class="time">${timeStamp}</span></div>
        </div>`;
    }

    input.value = "";
    previewContainer.style.display = "none";
    chat.scrollTop = chat.scrollHeight;

    const typing = document.createElement("div");
    typing.className = "message ai";
    typing.id = "typing";
    typing.innerHTML = `<div class="msg-text">⚡ NovaMind AI is thinking...</div>`;
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

        if (document.getElementById("typing")) {
            document.getElementById("typing").remove();
        }

        const aiTime = getCurrentTime();
        const escapedReply = escapeHtml(data.reply || "");

        chat.innerHTML += `
        <div class="message ai">
            <div class="msg-text">${data.reply}</div>
            <div class="msg-meta">
                <span class="time">${aiTime}</span>
                <button class="copy-btn" onclick="navigator.clipboard.writeText('${escapedReply}')">📋</button>
            </div>
        </div>`;

        chat.scrollTop = chat.scrollHeight;
        resetAttachments();

    } catch (error) {
        if (document.getElementById("typing")) {
            document.getElementById("typing").remove();
        }
        chat.innerHTML += `
        <div class="message ai">
            <div class="msg-text">❌ Error connecting to AI. Please try again.</div>
        </div>`;
        chat.scrollTop = chat.scrollHeight;
    }
}

// Event Listeners for Actions
button.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});

// Clear Chat Functionality
if (clearButton) {
    clearButton.addEventListener("click", () => {
        chat.innerHTML = `
        <div class="message ai">
            <div class="msg-text">Hello Ayush 👋<br><br>How can I help you today?</div>
        </div>`;
        resetAttachments();
    });
}

// ==========================================
// Voice Input Features
// ==========================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;

    micButton.addEventListener("click", () => {
        recognition.start();
        micButton.innerText = "🎙️";
    });

    recognition.onresult = function (event) {
        input.value = event.results[0][0].transcript;
        micButton.innerText = "🎤";
        sendMessage();
    };

    recognition.onerror = () => { micButton.innerText = "🎤"; };
    recognition.onend = () => { micButton.innerText = "🎤"; };
} else {
    micButton.innerText = "❌";
    micButton.disabled = true;
}

// ==========================================
// UI - Attachment Menu Overlay
// ==========================================
attachBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    attachMenu.classList.toggle("active");
});

document.addEventListener("click", (e) => {
    if (!attachMenu.contains(e.target) && !attachBtn.contains(e.target)) {
        attachMenu.classList.remove("active");
    }
});
