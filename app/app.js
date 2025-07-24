document.body.innerHTML = `
  <style>
    body {
      background: #18191a;
      min-height: 100vh;
      margin: 0;
      color: #f3f4f6;
      font-family: 'Trebuchet MS';
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    #chat-header {
      width: 100vw;
      background: none;
      color: #f3f4f6;
      padding: 32px 0 16px 0;
      font-size: 2.1em;
      font-weight: 400;
      text-align: left;
      padding-left: 50px;
      letter-spacing: 1px;
      margin-bottom: 0;
    }
    #chat-history {
      flex: 1;
      overflow-y: auto;
      padding: 32px 0 120px 0;
      display: flex;
      flex-direction: column;
      gap: 24px;
      align-items: center;
      background: transparent;
      width: 100vw;
      box-sizing: border-box;
    }
    .msg-row {
      display: flex;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    .msg.user {
      justify-content: flex-end;
    }
    .msg.bot {
      justify-content: flex-start;
    }
    .msg-bubble {
      padding: 10px 20px;
      border-radius: 24px;
      font-size: 1em;
      max-width: 70%;
      box-shadow: 0 2px 12px rgba(0,0,0,0.10);
      line-height: 1.7;
      word-break: break-word;
      margin: 0 8px;
      background: #232428;
      color: #f3f4f6;
      border: none;
      display: flex;
      align-items: center;
      min-height: 32px;
    }
    .msg.user .msg-bubble {
      background: linear-gradient(90deg, #3a8bfd 0%, #6a82fb 100%);
      color: #fff;
      border-bottom-right-radius: 8px;
      border-bottom-left-radius: 24px;
    }
    .msg.bot .msg-bubble {
      background: #232428;
      color: #f3f4f6;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 24px;
    }
    #input-row {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      position: fixed;
      left: 0; right: 0; bottom: 0;
      width: 100vw;
      background: rgba(24,25,26,0.98);
      display: flex;
      gap: 12px;
      padding: 24px 0 24px 0;
      justify-content: center;
      border-top: 1px solid #232428;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.10);
      z-index: 10;
    }
    #user-input {
      flex: 1;
      min-width: 0;
      max-width: 600px;
      padding: 16px 20px;
      border-radius: 24px;
      border: none;
      font-size: 1em;
      background: #232428;
      color: #f3f4f6;
      outline: none;
      transition: border 0.2s;
      box-shadow: 0 1px 4px rgba(0,0,0,0.10);
    }
    #user-input:focus {
      border: 1.5px solid #3a8bfd;
    }
    #send-btn {
      padding: 0 28px;
      border-radius: 24px;
      border: none;
      background: linear-gradient(90deg, #3a8bfd 0%, #6a82fb 100%);
      color: #fff;
      font-size: 1.15em;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.10);
      transition: background 0.2s;
    }
    #send-btn:disabled {
      background: #444;
      cursor: not-allowed;
    }
    .typing-indicator {
      display: flex;
      align-items: center;
      height: 32px;
      gap: 4px;
      margin-left: 2px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6a82fb;
      opacity: 0.7;
      animation: blink 1.4s infinite both;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink {
      0%, 80%, 100% { opacity: 0.7; }
      40% { opacity: 0.2; }
    }
  </style>
  <div id="chat-header">🏢 Data Insights Tool</div>
  <div id="chat-history"></div>
  <form id="input-row">
    <input id="user-input" autocomplete="off" placeholder="Ask anything..." style="font-family: 'Trebuchet MS', sans-serif;" />
    <button id="send-btn" type="submit" style="background: none; border: none; font-size: 2em;"> &#10148; </button>
  </form>
`;

const ws = new WebSocket("ws://localhost:8001/ws");
const chatHistory = document.getElementById("chat-history");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const inputRow = document.getElementById("input-row");

let typingIndicatorRow = null;

function parseBotMessage(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

function addMessage(text, sender) {
  const row = document.createElement("div");
  row.className = `msg-row msg ${sender}`;
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  if (sender === "bot") {
    bubble.innerHTML = parseBotMessage(text);
  } else {
    bubble.textContent = text;
  }
  row.appendChild(bubble);
  chatHistory.appendChild(row);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function showTypingIndicator() {
  if (typingIndicatorRow) return;
  typingIndicatorRow = document.createElement("div");
  typingIndicatorRow.className = "msg-row msg bot";
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.className = "dot";
    indicator.appendChild(dot);
  }
  bubble.appendChild(indicator);
  typingIndicatorRow.appendChild(bubble);
  chatHistory.appendChild(typingIndicatorRow);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function removeTypingIndicator() {
  if (typingIndicatorRow) {
    chatHistory.removeChild(typingIndicatorRow);
    typingIndicatorRow = null;
  }
}

inputRow.onsubmit = (e) => {
  e.preventDefault();
  const msg = userInput.value.trim();
  if (!msg) return;
  addMessage(msg, "user");
  userInput.value = "";
  sendBtn.disabled = true;
  showTypingIndicator();
  ws.send(msg);
};

ws.onopen = () => {
  addMessage("Hello! 😊\nHow can I help you today?", "bot");
};

ws.onmessage = (event) => {
  removeTypingIndicator();
  addMessage(event.data, "bot");
  sendBtn.disabled = false;
};

ws.onclose = () => {
  removeTypingIndicator();
  addMessage("Connection closed.", "bot");
  sendBtn.disabled = true;
};

ws.onerror = (e) => {
  removeTypingIndicator();
  addMessage("WebSocket error.", "bot");
  sendBtn.disabled = true;
};