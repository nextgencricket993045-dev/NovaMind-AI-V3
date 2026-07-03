const clearButton = document.getElementById("clear");
const input = document.getElementById("message");
const chat = document.getElementById("chat");
const button = document.getElementById("send");
const micButton = document.getElementById("mic");

const imageInput = document.getElementById("image");
const preview = document.getElementById("preview");

let imageBase64 = "";

// Image Preview
imageInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        imageBase64 = e.target.result;

        preview.src = imageBase64;
        preview.style.display = "block";

    };

    reader.readAsDataURL(file);

});

async function sendMessage() {

    const text = input.value.trim();

    if (text === "" && imageBase64 === "") return;

    if (text !== "") {

        chat.innerHTML += `
        <div class="user">${text}</div>
        `;

    }

    if (imageBase64 !== "") {

        chat.innerHTML += `
        <div class="user">
            <img src="${imageBase64}" style="max-width:200px;border-radius:10px;">
        </div>
        `;

    }

    input.value = "";

    chat.scrollTop = chat.scrollHeight;

    const typing = document.createElement("div");

    typing.className = "ai";
    typing.id = "typing";
    typing.innerHTML = "🤖 NovaMind AI is thinking...";

    chat.appendChild(typing);

    chat.scrollTop = chat.scrollHeight;

    try {

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                message: text,
                image: imageBase64

            })

        });

        const data = await response.json();

        if (document.getElementById("typing")) {

            document.getElementById("typing").remove();

        }

        chat.innerHTML += `
        <div class="ai">
        🤖 NovaMind AI<br><br>
        ${data.reply}
        </div>
        `;

        chat.scrollTop = chat.scrollHeight;

        imageBase64 = "";

        preview.src = "";

        preview.style.display = "none";

        imageInput.value = "";

    } catch (error) {

        if (document.getElementById("typing")) {

            document.getElementById("typing").remove();

        }

        chat.innerHTML += `
        <div class="ai">
        ❌ Error connecting to AI.
        </div>
        `;

    }

}

button.addEventListener("click", sendMessage);

input.addEventListener("keydown", function (e) {

    if (e.key === "Enter") {

        sendMessage();

    }

});

clearButton.addEventListener("click", function () {

    chat.innerHTML = `
    <div class="ai">
    Hello Ayush 👋<br>
    How can I help you today?
    </div>
    `;

    input.value = "";

    imageBase64 = "";

    preview.src = "";

    preview.style.display = "none";

    imageInput.value = "";

});

// Voice Input

const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;

    micButton.addEventListener("click", function () {

        recognition.start();

        micButton.innerText = "🎙️";

    });

    recognition.onresult = function (event) {

        input.value = event.results[0][0].transcript;

        micButton.innerText = "🎤";

        sendMessage();

    };

    recognition.onerror = function () {

        micButton.innerText = "🎤";

        alert("Voice recognition failed.");

    };

    recognition.onend = function () {

        micButton.innerText = "🎤";

    };

} else {

    micButton.innerText = "❌";

    micButton.disabled = true;

}