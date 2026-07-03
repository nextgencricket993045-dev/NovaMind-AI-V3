const clearButton = document.getElementById("clear");
const input = document.getElementById("message");
const chat = document.getElementById("chat");
const button = document.getElementById("send");
const micButton = document.getElementById("mic");

async function sendMessage() {

    const text = input.value.trim();

    if (text === "") return;

    chat.innerHTML += `
    <div class="user">${text}</div>
    `;

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
                message: text
            })

        });

        const data = await response.json();

        document.getElementById("typing").remove();

        chat.innerHTML += `
        <div class="ai">
        🤖 NovaMind AI<br><br>
        ${data.reply}
        </div>
        `;

        chat.scrollTop = chat.scrollHeight;

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

input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});

clearButton.addEventListener("click", function() {

    chat.innerHTML = `
    <div class="ai">
        Hello Ayush 👋<br>
        How can I help you today?
    </div>
    `;

    input.value = "";

});

// 🎤 Voice Input
const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    micButton.addEventListener("click", function() {

        recognition.start();
        micButton.innerText = "🎙️";

    });

    recognition.onresult = function(event) {

        input.value = event.results[0][0].transcript;

        micButton.innerText = "🎤";

        sendMessage();

    };

    recognition.onerror = function() {

        micButton.innerText = "🎤";

        alert("Voice recognition failed.");

    };

    recognition.onend = function() {

        micButton.innerText = "🎤";

    };

} else {

    micButton.innerText = "❌";
    micButton.disabled = true;

}