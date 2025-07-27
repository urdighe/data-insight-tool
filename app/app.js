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
      overflow: hidden;
    }
    #chat-header {
      width: 100vw;
      background: rgba(24,25,26,0.95);
      backdrop-filter: blur(10px);
      color: #f3f4f6;
      padding: 20px 0 16px 0;
      font-size: 1.6em;
      font-weight: 500;
      text-align: left;
      padding-left: 40px;
      letter-spacing: -0.02em;
      margin-bottom: 0;
      flex-shrink: 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      position: relative;
    }
    #chat-container {
      position: absolute;
      top: 80px;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #chat-history {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 120px;
      overflow-y: auto;
      padding: 32px 0 0 0;
      display: none;
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
      margin-top: 0;
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
      min-height: 32px;
    }
    .msg-bubble h1, .msg-bubble h2, .msg-bubble h3 {
      margin: 8px 0 4px 0;
      color: #f3f4f6;
    }
    .msg-bubble h1 { font-size: 1.4em; }
    .msg-bubble h2 { font-size: 1.2em; }
    .msg-bubble h3 { font-size: 1.1em; }
    .msg-bubble code {
      background: #1a1b1e;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    .msg-bubble pre {
      background: #1a1b1e;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }
    .msg-bubble pre code {
      background: none;
      padding: 0;
      border-radius: 0;
    }
    .msg-bubble ul, .msg-bubble ol {
      margin: 8px 0;
      padding-left: 20px;
    }
    .msg-bubble li {
      margin: 4px 0;
    }
    .msg-bubble a {
      color: #3a8bfd;
      text-decoration: none;
    }
    .msg-bubble a:hover {
      text-decoration: underline;
    }
    .msg-bubble strong {
      font-weight: 600;
    }
    .msg-bubble em {
      font-style: italic;
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
    #input-container {
      position: fixed;
      top: 25%;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 800px;
      background: rgba(24,25,26,0.98);
      border: 1px solid #232428;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10;
      transition: transform 0.3s ease;
    }
    #input-row {
      width: 100%;
      margin: 0;
      display: flex;
      padding: 20px;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      position: relative;
    }

    #user-input {
      width: 100%;
      padding: 16px 20px;
      padding-right: 60px;
      border-radius: 24px;
      border: 1.5px solid transparent;
      font-size: 1em;
      background: #232428;
      color: #f3f4f6;
      outline: none;
      transition: border-color 0.2s, height 0.2s;
      box-shadow: 0 1px 4px rgba(0,0,0,0.10);
      font-family: 'Trebuchet MS', sans-serif;
      box-sizing: border-box;
      resize: none;
      overflow: hidden;
      min-height: 52px;
      max-height: 200px;
      line-height: 1.4;
    }
    #user-input:focus {
      border-color: #3a8bfd;
    }
    #send-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: #3a8bfd;
      color: #fff;
      font-size: 1.2em;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      position: absolute;
      right: 28px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
    }
    #send-btn:disabled {
      background: #444;
      cursor: not-allowed;
      opacity: 0.6;
    }
    #send-btn:hover:not(:disabled) {
      background: #2d7bfd;
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
    #greeting-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      height: 100%;
      text-align: center;
      padding: 0 20px;
      padding-top: 15%;
      transition: opacity 0.3s ease;
    }
    #greeting-message {
      font-size: 1.5em;
      color: #f3f4f6;
      margin-bottom: 40px;
      max-width: 600px;
      line-height: 1.6;
    }
    #greeting-input-container {
      width: 100%;
      max-width: 600px;
      display: flex;
      align-items: center;
      position: relative;
    }
    #greeting-input {
      width: 100%;
      padding: 16px 20px;
      padding-right: 60px;
      border-radius: 24px;
      border: 1.5px solid transparent;
      font-size: 1em;
      background: #232428;
      color: #f3f4f6;
      outline: none;
      transition: border-color 0.2s, height 0.2s;
      box-shadow: 0 1px 4px rgba(0,0,0,0.10);
      font-family: 'Trebuchet MS', sans-serif;
      box-sizing: border-box;
      resize: none;
      overflow: hidden;
      min-height: 52px;
      max-height: 200px;
      line-height: 1.4;
    }
    #greeting-input:focus {
      border-color: #3a8bfd;
    }
        #greeting-send-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: #3a8bfd;
      color: #fff;
      font-size: 1.2em;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
    }
    #greeting-send-btn:hover {
      background: #2d7bfd;
    }
    .hidden {
      opacity: 0;
      pointer-events: none;
    }
  </style>
  <div id="chat-header">🏢 Data Insights Tool</div>
  <div id="chat-container">
    <div id="greeting-container">
      <div id="greeting-message">
         Hello! 👋 Ask me anything about your data
      </div>
      <div id="greeting-input-container">
        <textarea id="greeting-input" autocomplete="off" placeholder="Ask anything..." rows="1"></textarea>
        <button id="greeting-send-btn" type="button">&#8594;</button>
      </div>
    </div>
    <div id="chat-history"></div>
  </div>
        <div id="input-container" class="hidden">
        <form id="input-row">
          <textarea id="user-input" autocomplete="off" placeholder="Ask anything..." rows="1"></textarea>
          <button id="send-btn" type="submit">&#8594;</button>
        </form>
      </div>
`;

const ws = new WebSocket("ws://localhost:8001/ws");
const chatHistory = document.getElementById("chat-history");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const inputRow = document.getElementById("input-row");
const inputContainer = document.getElementById("input-container");
const greetingContainer = document.getElementById("greeting-container");
const greetingInput = document.getElementById("greeting-input");
const greetingSendBtn = document.getElementById("greeting-send-btn");

let typingIndicatorRow = null;
let conversationStarted = false;

function parseBotMessage(text) {
  // Bold text
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic text
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Code blocks (triple backticks)
  text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code (single backticks)
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Headers
  text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Simple list replacement - more direct approach
  // Replace * item with <li>item</li>
  text = text.replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>');
  text = text.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive <li> tags in <ul>
  text = text.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/gs, function(match) {
    const items = match.match(/<li>.*?<\/li>/g);
    if (items && items.length > 0) {
      return '<ul>' + items.join('') + '</ul>';
    }
    return match;
  });
  
  // Line breaks
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

function startConversation() {
  if (conversationStarted) return;
  
  conversationStarted = true;
  greetingContainer.classList.add("hidden");
  inputContainer.classList.remove("hidden");
  
  // Move reply box slightly up from bottom when conversation starts
  inputContainer.style.top = "auto";
  inputContainer.style.bottom = "20px";
  
  // Show chat history with absolute positioning
  chatHistory.style.display = "flex";
  chatHistory.scrollTop = 0;
  
  // Focus on the main input
  setTimeout(() => {
    userInput.focus();
  }, 300);
}

function sendMessage(message) {
  if (!message.trim()) return;
  
  if (!conversationStarted) {
    startConversation();
  }
  
  addMessage(message, "user");
  sendBtn.disabled = true;
  showTypingIndicator();
  ws.send(message);
}

// Greeting input handlers
greetingSendBtn.onclick = () => {
  const msg = greetingInput.value.trim();
  if (!msg) return;
  
  sendMessage(msg);
  greetingInput.value = "";
};

greetingInput.onkeypress = (e) => {
  if (e.key === "Enter") {
    const msg = greetingInput.value.trim();
    if (!msg) return;
    
    sendMessage(msg);
    greetingInput.value = "";
    // Reset height after sending
    greetingInput.style.height = 'auto';
  }
};

greetingInput.addEventListener('input', function() {
  this.style.height = 'auto';
  const newHeight = Math.min(this.scrollHeight, 200);
  this.style.height = newHeight + 'px';
});

// Main input handlers
inputRow.onsubmit = (e) => {
  e.preventDefault();
  const msg = userInput.value.trim();
  if (!msg) return;
  
  sendMessage(msg);
  userInput.value = "";
};

userInput.onkeypress = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const msg = userInput.value.trim();
    if (!msg) return;
    
    sendMessage(msg);
    userInput.value = "";
    // Reset height after sending
    userInput.style.height = 'auto';
  }
};

userInput.addEventListener('input', function() {
  this.style.height = 'auto';
  const newHeight = Math.min(this.scrollHeight, 200);
  this.style.height = newHeight + 'px';
});

ws.onopen = () => {
  // Don't show initial message until conversation starts
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