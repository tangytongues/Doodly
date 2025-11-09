// client/chat.js
(function () {
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const sendChatBtn = document.getElementById("sendChatBtn");

  // Render a single message
  function appendMessage({ name, message, self }) {
    const div = document.createElement("div");
    div.classList.add("chat-message");
    if (self) div.classList.add("self");
    div.innerHTML = `<strong>${name}:</strong> <span>${message}</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Send chat message
  function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;

    SocketClient.sendChat(msg);
    appendMessage({ name: "You", message: msg, self: true });
    chatInput.value = "";
  }

  // Handle incoming chat from server
  SocketClient.onChat = (data) => {
    appendMessage({
      name: data.name || "User",
      message: data.message,
      self: false,
    });
  };

  // Event listeners
  sendChatBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
