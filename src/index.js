import express from 'express';
import http from 'http';
import {router as matchesRouter} from './routes/matches.js'
import { attachWebSocketServer } from './ws/server.js';

const app = express();
const server = http.createServer(app);
const wss = attachWebSocketServer(server);

const port = 8000;
const host = '0.0.0.0';
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on port 8000!' });
});
app.use(matchesRouter)

app.locals.broadcastMatchCreated = wss.broadcastMatchCreated;


server.listen(port, host, () => {
  const baseurl = host === '0.0.0.0' ? `http://localhost:${port}` : `http://${host}:${port}`;
  console.log(`Server is running on ${baseurl}`);
  console.log(`WebSocket server is running on ${baseurl.replace('http', 'ws')}/ws`);
});

