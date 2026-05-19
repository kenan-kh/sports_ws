import { WebSocket, WebSocketServer } from "ws";

function sendjson(socket, data) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(data));
}

function broadcast(ws, data) {
  ws.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    client.send(JSON.stringify(data));
  });
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024, // 1MB
  });

  wss.on("connection", (socket) => {
    sendjson(socket, { type: "Welcome" });

    socket.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });

function broadcastMatchCreated(match) {
  broadcast(wss, { type: "MatchCreated", data: match });
}
return {
  broadcastMatchCreated,
};
}
