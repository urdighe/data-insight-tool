const ws = new WebSocket("ws://localhost:8000/ws");

ws.onopen = () => {
  ws.send("Hello!");
};

ws.onmessage = (event) => {
  console.log("Bot says:", event.data);
};