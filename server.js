"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { WebSocketServer, WebSocket } = require("ws");

const ROOT = __dirname;
const PORT = Math.max(1, Math.min(65535, Number(process.env.PORT) || 4173));
const HOST = process.env.HOST || "0.0.0.0";
const MAX_PLAYERS = 4;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PUBLIC_FILES = new Set([
  "index.html",
  "style.css",
  "game.js",
  "service-worker.js",
  "manifest.webmanifest"
]);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const rooms = new Map();

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function isPublicPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  return PUBLIC_FILES.has(normalized) || normalized.startsWith("assets/");
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname);
  } catch (_) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  if (pathname === "/health") {
    json(res, 200, { ok: true, rooms: rooms.size, uptime: Math.round(process.uptime()) });
    return;
  }
  if (pathname === "/ws") {
    res.writeHead(426, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("WebSocket upgrade required");
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  if (!isPublicPath(relativePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const filePath = path.resolve(ROOT, relativePath);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": ext === ".png" ? "public, max-age=86400" : "no-cache"
    };
    res.writeHead(200, headers);
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
});

const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 512 * 1024, perMessageDeflate: true });

function send(ws, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch (_) {
    // A close event performs room cleanup.
  }
}

function cleanName(value) {
  const name = String(value || "Рыцарь")
    .replace(/[<>\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 16);
  return name || "Рыцарь";
}

function cleanCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
}

function makeRoomCode() {
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = "";
    for (let i = 0; i < 5; i++) code += ROOM_ALPHABET[crypto.randomInt(ROOM_ALPHABET.length)];
    if (!rooms.has(code)) return code;
  }
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

function publicPlayers(room) {
  return [...room.clients.values()].map((client, index) => ({
    id: client.clientId,
    name: client.playerName,
    host: client.clientId === room.hostId,
    color: index % 4
  }));
}

function broadcast(room, payload, except = null) {
  for (const client of room.clients.values()) {
    if (client !== except) send(client, payload);
  }
}

function roomUpdate(room) {
  broadcast(room, {
    type: "room_update",
    code: room.code,
    hostId: room.hostId,
    started: room.started,
    players: publicPlayers(room)
  });
}

function joined(ws, room) {
  send(ws, {
    type: "room_joined",
    you: ws.clientId,
    code: room.code,
    hostId: room.hostId,
    started: room.started,
    players: publicPlayers(room)
  });
  roomUpdate(room);
}

function detachClient(ws, notify = true) {
  if (!ws.roomCode) return;
  const room = rooms.get(ws.roomCode);
  ws.roomCode = null;
  if (!room) return;
  room.clients.delete(ws.clientId);

  if (ws.clientId === room.hostId) {
    rooms.delete(room.code);
    for (const client of room.clients.values()) {
      client.roomCode = null;
      send(client, { type: "room_closed", reason: "Ведущий покинул комнату" });
    }
    room.clients.clear();
    return;
  }

  if (notify) broadcast(room, { type: "peer_left", id: ws.clientId });
  if (room.clients.size === 0) rooms.delete(room.code);
  else roomUpdate(room);
}

function roomFor(ws) {
  return ws.roomCode ? rooms.get(ws.roomCode) : null;
}

function rateAllowed(ws) {
  const now = Date.now();
  if (now - ws.rateStarted > 1000) {
    ws.rateStarted = now;
    ws.rateCount = 0;
  }
  ws.rateCount++;
  return ws.rateCount <= 90;
}

wss.on("connection", (ws) => {
  ws.clientId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  ws.playerName = "Рыцарь";
  ws.roomCode = null;
  ws.isAlive = true;
  ws.rateStarted = Date.now();
  ws.rateCount = 0;
  ws.on("pong", () => { ws.isAlive = true; });
  send(ws, { type: "connected", id: ws.clientId, protocol: 1 });

  ws.on("message", (raw) => {
    if (!rateAllowed(ws)) {
      send(ws, { type: "error", message: "Слишком много сетевых сообщений" });
      ws.close(1008, "Rate limit");
      return;
    }

    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch (_) {
      send(ws, { type: "error", message: "Некорректное сообщение" });
      return;
    }
    if (!message || typeof message.type !== "string") return;

    if (message.type === "create") {
      detachClient(ws);
      ws.playerName = cleanName(message.name);
      const code = makeRoomCode();
      const room = { code, hostId: ws.clientId, clients: new Map(), started: false, createdAt: Date.now() };
      room.clients.set(ws.clientId, ws);
      ws.roomCode = code;
      rooms.set(code, room);
      joined(ws, room);
      return;
    }

    if (message.type === "join") {
      detachClient(ws);
      const code = cleanCode(message.code);
      const room = rooms.get(code);
      if (!room) return send(ws, { type: "error", message: "Комната не найдена" });
      if (room.started) return send(ws, { type: "error", message: "Забег уже начался" });
      if (room.clients.size >= MAX_PLAYERS) return send(ws, { type: "error", message: "В комнате уже 4 игрока" });
      ws.playerName = cleanName(message.name);
      ws.roomCode = code;
      room.clients.set(ws.clientId, ws);
      joined(ws, room);
      return;
    }

    const room = roomFor(ws);
    if (!room) {
      if (message.type !== "leave") send(ws, { type: "error", message: "Сначала войдите в комнату" });
      return;
    }

    if (message.type === "start") {
      if (ws.clientId !== room.hostId) return send(ws, { type: "error", message: "Начать забег может только ведущий" });
      if (room.clients.size < 2) return send(ws, { type: "error", message: "Нужен хотя бы ещё один игрок" });
      room.started = true;
      broadcast(room, { type: "match_start", players: publicPlayers(room), startedAt: Date.now() });
      roomUpdate(room);
      return;
    }

    if (message.type === "input") {
      if (!room.started || ws.clientId === room.hostId) return;
      const host = room.clients.get(room.hostId);
      send(host, {
        type: "peer_input",
        id: ws.clientId,
        seq: Number(message.seq) || 0,
        moveX: Number(message.moveX) || 0,
        moveY: Number(message.moveY) || 0,
        aim: Number(message.aim) || 0,
        shoot: Boolean(message.shoot),
        weapon: Math.max(0, Math.min(2, Number(message.weapon) | 0)),
        dash: Math.max(0, Number(message.dash) | 0),
        pulse: Math.max(0, Number(message.pulse) | 0)
      });
      return;
    }

    if (message.type === "snapshot") {
      if (!room.started || ws.clientId !== room.hostId || !message.data) return;
      broadcast(room, { type: "snapshot", data: message.data }, ws);
      return;
    }

    if (message.type === "return_lobby") {
      if (ws.clientId !== room.hostId) return;
      room.started = false;
      broadcast(room, { type: "return_lobby" });
      roomUpdate(room);
      return;
    }

    if (message.type === "leave") detachClient(ws);
  });

  ws.on("close", () => detachClient(ws));
  ws.on("error", () => {});
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);
heartbeat.unref();

server.listen(PORT, HOST, () => {
  console.log(`Soul Knight server: http://127.0.0.1:${PORT}`);
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) console.log(`LAN: http://${address.address}:${PORT}`);
    }
  }
});

function shutdown() {
  for (const ws of wss.clients) ws.close(1001, "Server shutdown");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 1500).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
