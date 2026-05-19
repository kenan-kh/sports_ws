import { WebSocket, WebSocketServer } from "ws";

function sendjson(socket, data) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(data));
}

function broadcast(ws, data) {
   for(const client of ws.clients) {
    if (client.readyState !== WebSocket.OPEN) {
      continue;
    }
    client.send(JSON.stringify(data));
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024, // 1MB
  });

  wss.on("connection", (socket) => {
    socket.isalive=true;

    socket.on("pong", () => {
    socket.isalive = true;
    });

    sendjson(socket, { type: "Welcome" });

    socket.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isalive === false) {
        console.log("Terminating unresponsive WebSocket client");
        return socket.terminate();
      }
      socket.isalive = false;
      socket.ping();
    });
  }, 30000) // Ping every 3 minutes;

  wss.on("close", () => {
    clearInterval(interval);
  });
function broadcastMatchCreated(match) {
  broadcast(wss, { type: "MatchCreated", data: match });
}
return {
  broadcastMatchCreated,
};
}
