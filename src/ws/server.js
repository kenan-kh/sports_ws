import { WebSocket, WebSocketServer } from "ws";
import { wsarcjet } from "../../arcjet.js";  

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
    noServer: true, // نتحكم يدويًا في عملية الـ upgrade
    path: "/ws",
    maxPayload: 1024 * 1024, // 1MB
  });

  // --- التعديل الجوهري: فحص الحماية قبل قبول الاتصال ---
  server.on("upgrade", async (req, socket, head) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname === "/ws" && wsarcjet) {
      try {
        const decision = await wsarcjet.protect(req);

        if (decision.isDenied()) {
          if(decision.reason.isRateLimit()) {
            socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
          }
          else {
          socket.write(`HTTP/1.1 ${code} Forbidden\r\n\r\n`);
          }
          socket.destroy();
          return;
        }
      } catch (err) {
        console.error("Arcjet protection error during upgrade:", err);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    // إذا مر الفحص، نقوم بإتمام الـ upgrade
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (socket) => {
    // تم الفحص مسبقًا، هنا يبدأ منطق العمل مباشرة
    socket.isalive = true;

    socket.on("pong", () => {
      socket.isalive = true;
    });

    sendjson(socket, { type: "Welcome" });

    socket.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });

  // --- منطق الـ Interval والـ Broadcast يبقى كما هو ---
  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isalive === false) {
        return socket.terminate();
      }
      socket.isalive = false;
      socket.ping();
    });
  }, 30000);

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