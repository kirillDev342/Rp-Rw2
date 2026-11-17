"use strict";

const path = require("path");
const { spawn } = require("child_process");
const { WebSocket } = require("ws");

const root = path.resolve(__dirname, "..");
const port = 43127;
const server = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"]
});

let host;
let guest;
let roomCode = "";
let started = false;
let snapshotReceived = false;
let finished = false;

function stop(code, message) {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  try { host?.close(); } catch (_) {}
  try { guest?.close(); } catch (_) {}
  try { server.kill(); } catch (_) {}
  if (message) (code ? console.error : console.log)(message);
  setTimeout(() => process.exit(code), 50);
}

function send(socket, message) {
  socket.send(JSON.stringify(message));
}

function handleHost(message) {
  if (message.type === "room_joined") {
    roomCode = message.code;
    if (guest.readyState === WebSocket.OPEN) send(guest, { type: "join", code: roomCode, name: "Guest" });
  }
  if (message.type === "room_update" && message.players?.length === 2 && !started) {
    started = true;
    send(host, { type: "start" });
  }
  if (message.type === "match_start") {
    send(host, { type: "snapshot", data: { state: "playing", players: [{ netId: "smoke" }], wave: 1 } });
  }
}

function handleGuest(message) {
  if (message.type === "snapshot" && message.data?.wave === 1) {
    snapshotReceived = true;
    send(host, { type: "return_lobby" });
  }
  if (message.type === "return_lobby" && snapshotReceived) stop(0, "Multiplayer smoke test passed");
}

function connectClients() {
  host = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  guest = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  host.on("open", () => send(host, { type: "create", name: "Host" }));
  guest.on("open", () => { if (roomCode) send(guest, { type: "join", code: roomCode, name: "Guest" }); });
  host.on("message", (raw) => handleHost(JSON.parse(raw.toString())));
  guest.on("message", (raw) => handleGuest(JSON.parse(raw.toString())));
  host.on("error", (error) => stop(1, `Host socket failed: ${error.message}`));
  guest.on("error", (error) => stop(1, `Guest socket failed: ${error.message}`));
}

server.stdout.on("data", (chunk) => {
  if (chunk.toString().includes("Soul Knight server:")) connectClients();
});
server.stderr.on("data", (chunk) => process.stderr.write(chunk));
server.on("exit", (code) => { if (!finished) stop(1, `Server exited early (${code})`); });

const timeout = setTimeout(() => stop(1, "Multiplayer smoke test timed out"), 8000);
