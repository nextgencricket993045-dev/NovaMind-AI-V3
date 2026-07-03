const clearButton = document.getElementById("clear");
const input = document.getElementById("message");
const chat = document.getElementById("chat");
const button = document.getElementById("send");

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

        document.getElementById("typing").remove();

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