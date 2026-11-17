(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Canvas, atlas and tiny helpers
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const W = 1280;
  const H = 720;
  const TAU = Math.PI * 2;
  ctx.imageSmoothingEnabled = false;

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(rand(a, b + 1));
  const choose = (arr) => arr[(Math.random() * arr.length) | 0];
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const pointIn = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const hash = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  const ATLAS = {
    portrait: { x: 17, y: 16, w: 178, h: 170 },
    coin: { x: 1067, y: 34, w: 77, h: 74 },
    gem: { x: 1259, y: 34, w: 76, h: 73 },
    pause: { x: 490, y: 221, w: 277, h: 385 },
    victory: { x: 792, y: 208, w: 375, h: 368 },
    defeat: { x: 1192, y: 236, w: 329, h: 347 },
    joystick: { x: 51, y: 652, w: 235, h: 233 },
    aimstick: { x: 331, y: 655, w: 151, h: 151 },
    attack: { x: 557, y: 641, w: 130, h: 133 },
    dash: { x: 697, y: 642, w: 124, h: 127 },
    fire: { x: 831, y: 642, w: 128, h: 129 },
    pulse: { x: 970, y: 619, w: 147, h: 152 },
    swap: { x: 658, y: 778, w: 101, h: 102 },
    shield: { x: 783, y: 778, w: 97, h: 100 },
    heal: { x: 915, y: 778, w: 99, h: 100 },
    minimap: { x: 1178, y: 607, w: 155, h: 157 },
    sword: { x: 390, y: 904, w: 79, h: 87 },
    gun: { x: 470, y: 904, w: 81, h: 87 },
    flame: { x: 552, y: 904, w: 79, h: 87 },
    ice: { x: 632, y: 904, w: 77, h: 87 },
    poison: { x: 711, y: 904, w: 76, h: 87 },
    void: { x: 789, y: 904, w: 76, h: 87 },
    demon: { x: 866, y: 904, w: 78, h: 87 }
  };

  const ARSENAL = {
    heroFront: { x: 0, y: 0, w: 180, h: 175, ax: 105, ay: 102 },
    heroSide: { x: 345, y: 0, w: 175, h: 175, ax: 105, ay: 101 },
    heroBack: { x: 515, y: 0, w: 185, h: 175, ax: 109, ay: 103 },
    heroDash: { x: 625, y: 625, w: 135, h: 165, ax: 88, ay: 96 },
    heroDown: { x: 490, y: 770, w: 230, h: 130, ax: 120, ay: 70 },
    blaster: { x: 1026, y: 205, w: 150, h: 96 },
    shotgun: { x: 870, y: 213, w: 145, h: 92 },
    cryo: { x: 1370, y: 804, w: 154, h: 103 },
    silverSword: { x: 775, y: 26, w: 135, h: 145 }
  };

  const DUNGEON_ATLAS = {
    // Enemy variants.
    slimeA: { x: 18, y: 347, w: 82, h: 65 },
    slimeB: { x: 110, y: 350, w: 82, h: 64 },
    slimeC: { x: 213, y: 345, w: 79, h: 66 },
    bat: { x: 316, y: 345, w: 102, h: 75 },
    mage: { x: 115, y: 426, w: 98, h: 92 },
    gunner: { x: 322, y: 434, w: 76, h: 85 },
    wizard: { x: 421, y: 432, w: 100, h: 102 },
    archer: { x: 933, y: 464, w: 79, h: 93 },
    swordKnight: { x: 730, y: 461, w: 90, h: 86 },
    redDemon: { x: 728, y: 352, w: 84, h: 96 },
    darkDemon: { x: 940, y: 357, w: 73, h: 92 },
    eye: { x: 1033, y: 460, w: 79, h: 75 },
    orbMonster: { x: 1127, y: 367, w: 89, h: 82 },
    minotaur: { x: 1311, y: 458, w: 136, h: 121 },

    // Room props.
    stoneColumn: { x: 1423, y: 21, w: 95, h: 142 },
    woodBarricade: { x: 777, y: 281, w: 81, h: 54 },
    crystalCluster: { x: 893, y: 745, w: 109, h: 85 },
    portalPurple: { x: 1008, y: 540, w: 181, h: 179 },
    portalBlue: { x: 1414, y: 579, w: 112, h: 132 },
    torchFire: { x: 673, y: 17, w: 69, h: 128 },
    torchBlue: { x: 768, y: 18, w: 65, h: 127 },
    torchPurple: { x: 860, y: 21, w: 58, h: 124 },
    bannerRed: { x: 1025, y: 12, w: 82, h: 143 },
    bannerBlue: { x: 1123, y: 12, w: 80, h: 143 },
    plant: { x: 593, y: 129, w: 75, h: 110 },
    barrel: { x: 22, y: 128, w: 82, h: 91 },
    blueChest: { x: 124, y: 128, w: 80, h: 91 },

    // Loot and projectiles.
    coin: { x: 15, y: 928, w: 57, h: 62 },
    heart: { x: 1089, y: 940, w: 63, h: 61 },
    energyGem: { x: 147, y: 928, w: 51, h: 68 },
    blueBolt: { x: 1333, y: 729, w: 53, h: 85 },
    iceShard: { x: 1262, y: 737, w: 59, h: 80 },
    fireSlash: { x: 1384, y: 741, w: 64, h: 73 },
    voidOrb: { x: 1164, y: 726, w: 102, h: 101 }
  };

  const ENEMY_SPRITES = {
    crawler: ["slimeA", "slimeB", "slimeC", "bat"],
    gunner: ["mage", "gunner", "wizard", "archer"],
    charger: ["swordKnight", "redDemon", "darkDemon"],
    turret: ["eye", "orbMonster"],
    boss: ["minotaur"]
  };

  const HERO_WALK = [
    { x: 0, y: 170, w: 165, h: 165, ax: 101, ay: 91 },
    { x: 160, y: 170, w: 165, h: 165, ax: 101, ay: 91 },
    { x: 320, y: 170, w: 170, h: 165, ax: 102, ay: 91 },
    { x: 490, y: 170, w: 165, h: 165, ax: 101, ay: 91 },
    { x: 0, y: 325, w: 165, h: 165, ax: 101, ay: 91 },
    { x: 160, y: 325, w: 165, h: 165, ax: 101, ay: 91 },
    { x: 325, y: 325, w: 165, h: 165, ax: 101, ay: 91 },
    { x: 490, y: 325, w: 165, h: 165, ax: 101, ay: 91 }
  ];

  const atlas = new Image();
  atlas.decoding = "async";
  atlas.src = "assets/ui-atlas.png";
  const arsenal = new Image();
  arsenal.decoding = "async";
  arsenal.src = "assets/character-arsenal.png";
  const menuArt = new Image();
  menuArt.decoding = "async";
  menuArt.src = "assets/menu-neon-dungeon.png";
  const dungeonAtlas = new Image();
  dungeonAtlas.decoding = "async";
  dungeonAtlas.src = "assets/dungeon-atlas-clean.png";

  function drawAtlas(name, x, y, w, h, alpha = 1) {
    if (!atlas.complete || !atlas.naturalWidth) return;
    const s = ATLAS[name];
    if (!s) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(atlas, s.x, s.y, s.w, s.h, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function drawArsenal(nameOrRegion, x, y, w, h, alpha = 1) {
    if (!arsenal.complete || !arsenal.naturalWidth) return;
    const s = typeof nameOrRegion === "string" ? ARSENAL[nameOrRegion] : nameOrRegion;
    if (!s) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(arsenal, s.x, s.y, s.w, s.h, x, y, w, h);
    ctx.restore();
  }

  function drawArsenalFit(name, x, y, w, h, alpha = 1) {
    const s = ARSENAL[name];
    if (!s) return;
    const scale = Math.min(w / s.w, h / s.h);
    const dw = s.w * scale;
    const dh = s.h * scale;
    drawArsenal(name, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, alpha);
  }

  function drawDungeonAtlas(name, x, y, w, h, alpha = 1, flipX = false) {
    if (!dungeonAtlas.complete || !dungeonAtlas.naturalWidth) return false;
    const s = DUNGEON_ATLAS[name];
    if (!s) return false;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (flipX) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(dungeonAtlas, s.x, s.y, s.w, s.h, 0, 0, w, h);
    } else {
      ctx.drawImage(dungeonAtlas, s.x, s.y, s.w, s.h, x, y, w, h);
    }
    ctx.restore();
    return true;
  }

  function pathRoundRect(x, y, w, h, r) {
    r = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function pixelText(text, x, y, size = 20, color = "#fff", align = "left") {
    ctx.save();
    ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = "#080a12";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function panel(x, y, w, h, fill = "rgba(10,14,25,.91)", border = "#333d52") {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.4)";
    pathRoundRect(x + 4, y + 6, w, h, 8);
    ctx.fill();
    ctx.fillStyle = fill;
    pathRoundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#080b13";
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = border;
    pathRoundRect(x + 4, y + 4, w - 8, h - 8, 5);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Audio — generated at runtime, so the game stays self-contained
  // ---------------------------------------------------------------------------
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.muted = false;
      this.lastBeat = 0;
    }
    init() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.34;
      this.master.connect(this.ctx.destination);
    }
    tone(freq, duration, type = "square", volume = 0.08, endFreq = null, delay = 0) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + duration + 0.03);
    }
    noise(duration = 0.08, volume = 0.06) {
      if (!this.ctx || this.muted) return;
      const length = Math.max(1, (this.ctx.sampleRate * duration) | 0);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 500;
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      src.buffer = buffer;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
    }
    shoot(kind) {
      if (kind === 1) { this.tone(150, .09, "sawtooth", .06, 70); this.noise(.04, .035); }
      else if (kind === 2) { this.tone(560, .15, "triangle", .07, 180); }
      else this.tone(310, .07, "square", .045, 120);
    }
    hit() { this.tone(95, .06, "square", .035, 55); }
    hurt() { this.noise(.16, .11); this.tone(90, .2, "sawtooth", .09, 40); }
    pickup() { this.tone(620, .06, "square", .05, 920); this.tone(900, .08, "square", .04, 1200, .05); }
    dash() { this.noise(.1, .045); this.tone(230, .12, "sine", .06, 620); }
    pulse() { this.tone(95, .45, "sine", .13, 520); this.tone(480, .35, "triangle", .05, 90); }
    clear() { [392, 523, 659, 784].forEach((f, i) => this.tone(f, .18, "square", .045, f * 1.02, i * .085)); }
    boss() { [100, 82, 65].forEach((f, i) => this.tone(f, .45, "sawtooth", .08, f * .7, i * .18)); }
    toggle() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : .34;
      return this.muted;
    }
    music(time, danger) {
      if (!this.ctx || this.muted || state !== "playing") return;
      const step = danger ? .34 : .48;
      if (time - this.lastBeat < step) return;
      this.lastBeat = time;
      const seq = danger ? [55, 55, 65, 73, 55, 82, 73, 65] : [55, 65, 73, 65, 49, 65, 73, 82];
      const n = seq[Math.floor(time / step) % seq.length];
      this.tone(n, .12, "triangle", .018, n * .96);
      if (Math.floor(time / step) % 4 === 0) this.tone(n * 2, .22, "sine", .012, n * 1.8);
    }
  }
  const audio = new AudioEngine();

  // ---------------------------------------------------------------------------
  // Input and UI state
  // ---------------------------------------------------------------------------
  const input = {
    keys: new Set(),
    mouse: { x: W * .7, y: H * .5, down: false },
    moveTouch: null,
    aimTouch: null
  };
  const isTouch = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const app = $("app");
  let state = "loading";
  let gameTime = 0;
  let runTime = 0;
  let lastTime = performance.now();
  let muted = false;
  let toastTimer = 0;
  let uiRects = {};
  let bestScore = 0;
  try { bestScore = Number(localStorage.getItem("neonDungeonBest") || 0); } catch (_) {}
  $("bestScore").textContent = bestScore.toLocaleString("ru-RU");

  // ---------------------------------------------------------------------------
  // Online co-op: rooms are relayed by server.js, while the host simulates.
  // ---------------------------------------------------------------------------
  const PLAYER_COLORS = ["#52e1ff", "#ff6f91", "#ffd052", "#8cff77"];
  const network = {
    socket: null,
    connected: false,
    pending: null,
    manualClose: false,
    id: "",
    hostId: "",
    roomCode: "",
    roster: [],
    active: false,
    isHost: false,
    remoteInputs: new Map(),
    inputSeq: 0,
    dashSeq: 0,
    pulseSeq: 0,
    sendClock: 0,
    snapshotClock: 0,
    receivedSnapshot: false,
    lastSnapshotAt: 0
  };

  try {
    const savedName = localStorage.getItem("neonDungeonPlayerName");
    if (savedName) $("playerName").value = savedName.slice(0, 16);
  } catch (_) {}
  const linkedRoom = new URLSearchParams(location.search).get("room");
  if (linkedRoom) $("roomCodeInput").value = linkedRoom.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);

  function networkUrl() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${location.host}/ws`;
  }

  function cleanPlayerName() {
    const name = $("playerName").value.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 16) || "Рыцарь";
    $("playerName").value = name;
    try { localStorage.setItem("neonDungeonPlayerName", name); } catch (_) {}
    return name;
  }

  function setNetworkError(message = "") {
    $("networkError").textContent = message;
  }

  function setNetworkBusy(busy) {
    $("createRoomBtn").disabled = busy;
    $("joinRoomBtn").disabled = busy;
    if (busy) setNetworkError("Подключаемся к серверу…");
  }

  function networkSend(payload) {
    if (!network.socket || network.socket.readyState !== WebSocket.OPEN) return false;
    try {
      network.socket.send(JSON.stringify(payload));
      return true;
    } catch (_) {
      return false;
    }
  }

  function connectNetwork(action) {
    setNetworkError();
    if (!location.host || location.protocol === "file:") {
      setNetworkError("Запусти игру через start-game.bat — WebSocket недоступен из файла");
      return;
    }
    if (network.socket?.readyState === WebSocket.OPEN) {
      action();
      return;
    }
    if (network.socket?.readyState === WebSocket.CONNECTING) {
      network.pending = action;
      return;
    }

    setNetworkBusy(true);
    network.pending = action;
    network.manualClose = false;
    let socket;
    try {
      socket = new WebSocket(networkUrl());
    } catch (_) {
      setNetworkBusy(false);
      setNetworkError("Не удалось открыть сетевое соединение");
      return;
    }
    network.socket = socket;
    socket.addEventListener("open", () => {
      network.connected = true;
      setNetworkBusy(false);
      setNetworkError();
      const pending = network.pending;
      network.pending = null;
      pending?.();
    });
    socket.addEventListener("message", (event) => {
      try { handleNetworkMessage(JSON.parse(event.data)); } catch (_) { setNetworkError("Сервер прислал повреждённые данные"); }
    });
    socket.addEventListener("close", () => {
      const wasActive = network.active;
      network.connected = false;
      network.socket = null;
      network.pending = null;
      network.active = false;
      network.isHost = false;
      network.remoteInputs.clear();
      setNetworkBusy(false);
      if (!network.manualClose) {
        setNetworkError("Соединение с сервером потеряно");
        if (wasActive) {
          state = "menu";
          syncAppMode();
          showScreen("networkWait", false);
          showScreen("upgrade", false);
          showScreen("menu", true);
          showScreen("multiplayer", true);
        }
      }
    });
    socket.addEventListener("error", () => setNetworkError("Сетевой сервер недоступен. Запусти start-game.bat"));
  }

  function requestCreateRoom() {
    connectNetwork(() => networkSend({ type: "create", name: cleanPlayerName() }));
  }

  function requestJoinRoom() {
    const code = $("roomCodeInput").value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
    $("roomCodeInput").value = code;
    if (code.length < 5) {
      setNetworkError("Введи код комнаты из 5 символов");
      return;
    }
    connectNetwork(() => networkSend({ type: "join", code, name: cleanPlayerName() }));
  }

  function applyRoster(message) {
    network.roomCode = message.code || network.roomCode;
    network.hostId = message.hostId || network.hostId;
    network.roster = Array.isArray(message.players) ? message.players : network.roster;
    network.isHost = network.id === network.hostId;
    renderNetworkRoom();
  }

  function renderNetworkRoom() {
    const inRoom = Boolean(network.roomCode);
    $("networkConnectPanel").hidden = inRoom;
    $("networkRoomPanel").hidden = !inRoom;
    if (!inRoom) return;
    $("roomCode").textContent = network.roomCode;
    const list = $("networkPlayers");
    list.replaceChildren();
    for (let i = 0; i < 4; i++) {
      const member = network.roster[i];
      const row = document.createElement("div");
      row.className = `network-player${member ? "" : " network-slot-empty"}`;
      row.style.setProperty("--player-color", PLAYER_COLORS[member?.color ?? i]);
      const gem = document.createElement("i");
      const name = document.createElement("span");
      name.textContent = member?.name || "Свободное место";
      row.append(gem, name);
      if (member?.host) {
        const host = document.createElement("b");
        host.textContent = "ВЕДУЩИЙ";
        row.appendChild(host);
      }
      if (member?.id === network.id) {
        const you = document.createElement("em");
        you.textContent = "ВЫ";
        row.appendChild(you);
      }
      list.appendChild(row);
    }
    const enough = network.roster.length >= 2;
    $("startNetworkBtn").hidden = !network.isHost;
    $("startNetworkBtn").disabled = !enough;
    $("networkRoomStatus").textContent = network.isHost
      ? enough ? `${network.roster.length} / 4 — можно начинать` : "Ждём хотя бы ещё одного игрока…"
      : "Ждём, когда ведущий начнёт забег…";
  }

  function resetNetworkRoom() {
    network.roomCode = "";
    network.hostId = "";
    network.roster = [];
    network.active = false;
    network.isHost = false;
    network.remoteInputs.clear();
    renderNetworkRoom();
  }

  function leaveNetworkRoom() {
    networkSend({ type: "leave" });
    resetNetworkRoom();
    setNetworkError();
  }

  function showNetworkLobby() {
    showScreen("menu", true);
    showScreen("multiplayer", true);
    showScreen("networkWait", false);
    showScreen("upgrade", false);
    state = "menu";
    syncAppMode();
    canvas.style.cursor = "crosshair";
    renderNetworkRoom();
  }

  function handleNetworkMessage(message) {
    if (!message || typeof message.type !== "string") return;
    if (message.type === "error") {
      setNetworkError(message.message || "Ошибка сети");
      return;
    }
    if (message.type === "connected") {
      network.id = message.id || network.id;
      return;
    }
    if (message.type === "room_joined") {
      network.id = message.you || network.id;
      applyRoster(message);
      setNetworkError();
      return;
    }
    if (message.type === "room_update") {
      applyRoster(message);
      return;
    }
    if (message.type === "match_start") {
      network.roster = Array.isArray(message.players) ? message.players : network.roster;
      network.active = true;
      network.isHost = network.id === network.hostId;
      network.remoteInputs.clear();
      network.inputSeq = 0;
      network.dashSeq = 0;
      network.pulseSeq = 0;
      network.sendClock = 0;
      network.snapshotClock = 0;
      network.receivedSnapshot = false;
      showScreen("multiplayer", false);
      showScreen("menu", false);
      startRun(true);
      return;
    }
    if (message.type === "peer_input" && network.active && network.isHost) {
      message.receivedAt = performance.now();
      network.remoteInputs.set(message.id, message);
      return;
    }
    if (message.type === "snapshot" && network.active && !network.isHost) {
      applyNetworkSnapshot(message.data);
      return;
    }
    if (message.type === "peer_left") {
      network.remoteInputs.delete(message.id);
      coopPlayers.delete(message.id);
      toast("ИГРОК ОТКЛЮЧИЛСЯ", 1.4);
      return;
    }
    if (message.type === "return_lobby") {
      network.active = false;
      showNetworkLobby();
      return;
    }
    if (message.type === "room_closed") {
      resetNetworkRoom();
      showNetworkLobby();
      setNetworkError(message.reason || "Комната закрыта");
    }
  }

  function screenPoint(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: clamp((ev.clientX - r.left) * W / r.width, 0, W),
      y: clamp((ev.clientY - r.top) * H / r.height, 0, H)
    };
  }

  function showScreen(id, show) {
    $(id).classList.toggle("screen--visible", show);
  }

  function isPortraitTouch() {
    return isTouch && window.innerHeight > window.innerWidth;
  }

  function syncAppMode() {
    app.classList.toggle("game-active", state === "playing");
    app.classList.toggle("menu-active", state === "menu");
    if (state !== "playing") resetDomSticks();
  }

  function activeFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function updateFullscreenButton() {
    const active = Boolean(activeFullscreenElement()) || matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: standalone)").matches;
    const button = $("fullscreenBtn");
    button.classList.toggle("is-fullscreen", active);
    button.textContent = active ? "↙" : "⛶";
    button.setAttribute("aria-label", active ? "Выйти из полного экрана" : "Открыть на весь экран");
  }

  function requestMobileFullscreen(showFailure = false) {
    if (!isTouch || activeFullscreenElement() || matchMedia("(display-mode: standalone)").matches) return;
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!request) {
      if (showFailure) toast("ДОБАВЬ ИГРУ НА ГЛАВНЫЙ ЭКРАН ЧЕРЕЗ МЕНЮ БРАУЗЕРА", 3);
      return;
    }
    try {
      const result = request.call(root, { navigationUI: "hide" });
      if (result?.then) {
        result.then(() => {
          updateFullscreenButton();
          if (screen.orientation?.lock && innerWidth > innerHeight) screen.orientation.lock("landscape").catch(() => {});
        }).catch(() => {
          if (showFailure) toast("ЯНДЕКС ЗАПРЕТИЛ FULLSCREEN — УСТАНОВИ ИГРУ НА ГЛАВНЫЙ ЭКРАН", 3);
        });
      }
    } catch (_) {
      if (showFailure) toast("ЯНДЕКС ЗАПРЕТИЛ FULLSCREEN — УСТАНОВИ ИГРУ НА ГЛАВНЫЙ ЭКРАН", 3);
    }
  }

  function toggleFullscreen() {
    if (activeFullscreenElement()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        try { exit.call(document); } catch (_) {}
      }
    } else requestMobileFullscreen(true);
  }

  function syncViewportHeight() {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
  }

  function toast(text, duration = 1.8) {
    const el = $("toast");
    el.textContent = text;
    el.classList.add("show");
    toastTimer = duration;
  }

  function hideToast() {
    $("toast").classList.remove("show");
    toastTimer = 0;
  }

  window.addEventListener("keydown", (ev) => {
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
    input.keys.add(ev.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.code)) ev.preventDefault();
    if (ev.repeat) return;

    if (state === "upgrade" && ["Digit1", "Digit2", "Digit3"].includes(ev.code)) {
      chooseUpgrade(Number(ev.code.at(-1)) - 1);
      return;
    }
    if (ev.code === "Escape") {
      if ($("how").classList.contains("screen--visible")) showScreen("how", false);
      else if (state === "playing") pauseGame();
      else if (state === "paused") resumeGame();
      return;
    }
    if (state === "playing") {
      if (ev.code === "Space") tryDash();
      if (ev.code === "KeyQ") usePulse();
      if (ev.code === "Digit1") switchWeapon(0);
      if (ev.code === "Digit2") switchWeapon(1);
      if (ev.code === "Digit3") switchWeapon(2);
    } else if (state === "gameover" && (ev.code === "Enter" || ev.code === "Space")) {
      if (network.active) {
        if (network.isHost) networkSend({ type: "start" });
      } else startRun();
    }
    else if (state === "victory" && (ev.code === "Enter" || ev.code === "Space")) returnToMenu();
  });
  window.addEventListener("keyup", (ev) => input.keys.delete(ev.code));
  window.addEventListener("blur", () => {
    input.keys.clear();
    input.mouse.down = false;
    resetDomSticks();
    if (state === "playing") pauseGame();
  });
  window.addEventListener("resize", () => { resetDomSticks(); syncViewportHeight(); });
  window.visualViewport?.addEventListener("resize", syncViewportHeight);
  document.addEventListener("fullscreenchange", () => { syncViewportHeight(); updateFullscreenButton(); });
  document.addEventListener("webkitfullscreenchange", () => { syncViewportHeight(); updateFullscreenButton(); });
  syncViewportHeight();
  updateFullscreenButton();

  canvas.addEventListener("pointermove", (ev) => {
    const p = screenPoint(ev);
    if (ev.pointerType === "touch") {
      if (input.moveTouch && input.moveTouch.id === ev.pointerId) {
        input.moveTouch.x = p.x;
        input.moveTouch.y = p.y;
      }
      if (input.aimTouch && input.aimTouch.id === ev.pointerId) {
        input.aimTouch.x = p.x;
        input.aimTouch.y = p.y;
      }
    } else {
      input.mouse.x = p.x;
      input.mouse.y = p.y;
    }
  });

  canvas.addEventListener("pointerdown", (ev) => {
    audio.init();
    const p = screenPoint(ev);
    if (state !== "playing") {
      handleOverlayClick(p);
      return;
    }
    if (uiRects.pause && pointIn(p, uiRects.pause)) {
      pauseGame();
      return;
    }
    if (uiRects.weapons) {
      const slot = uiRects.weapons.findIndex((r) => pointIn(p, r));
      if (slot >= 0) {
        switchWeapon(slot);
        return;
      }
    }
    try { canvas.setPointerCapture?.(ev.pointerId); } catch (_) { /* Synthetic/legacy pointers may not be capturable. */ }
    if (ev.pointerType === "touch") {
      if (Math.hypot(p.x - (W - 105), p.y - (H - 245)) < 52) { tryDash(); return; }
      if (Math.hypot(p.x - (W - 220), p.y - (H - 215)) < 54) { usePulse(); return; }
      if (p.x < W * .48 && !input.moveTouch) input.moveTouch = { id: ev.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y };
      else if (!input.aimTouch) input.aimTouch = { id: ev.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y };
    } else {
      input.mouse.x = p.x;
      input.mouse.y = p.y;
      if (ev.button === 0) input.mouse.down = true;
      if (ev.button === 2) usePulse();
    }
  });

  function releasePointer(ev) {
    if (ev.pointerType === "touch") {
      if (input.moveTouch?.id === ev.pointerId) input.moveTouch = null;
      if (input.aimTouch?.id === ev.pointerId) input.aimTouch = null;
    } else if (ev.button === 0) input.mouse.down = false;
  }
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
  canvas.addEventListener("wheel", (ev) => {
    if (state !== "playing") return;
    const dir = ev.deltaY > 0 ? 1 : -1;
    switchWeapon((player.weapon + dir + WEAPONS.length) % WEAPONS.length);
    ev.preventDefault();
  }, { passive: false });

  function setStickVisual(element, x = 0, y = 0) {
    element.style.setProperty("--stick-x", `${x}px`);
    element.style.setProperty("--stick-y", `${y}px`);
  }

  function resetDomSticks() {
    input.moveTouch = null;
    input.aimTouch = null;
    setStickVisual($("moveStick"));
    setStickVisual($("aimStick"));
  }

  function bindDomStick(id, inputKey) {
    const element = $(id);
    const update = (ev) => {
      const touch = input[inputKey];
      if (!touch || touch.id !== ev.pointerId || touch.source !== "dom") return;
      let dx = ev.clientX - touch.sx;
      let dy = ev.clientY - touch.sy;
      const length = Math.hypot(dx, dy);
      if (length > touch.radius) {
        dx = dx / length * touch.radius;
        dy = dy / length * touch.radius;
      }
      touch.x = touch.sx + dx;
      touch.y = touch.sy + dy;
      setStickVisual(element, dx, dy);
      ev.preventDefault();
      ev.stopPropagation();
    };
    const release = (ev) => {
      const touch = input[inputKey];
      if (!touch || touch.id !== ev.pointerId || touch.source !== "dom") return;
      input[inputKey] = null;
      setStickVisual(element);
      ev.preventDefault();
      ev.stopPropagation();
    };
    element.addEventListener("pointerdown", (ev) => {
      if (state !== "playing" || input[inputKey]) return;
      audio.init();
      const r = element.getBoundingClientRect();
      const radius = Math.min(r.width, r.height) * .29;
      input[inputKey] = { id: ev.pointerId, sx: r.left + r.width / 2, sy: r.top + r.height / 2, x: ev.clientX, y: ev.clientY, radius, source: "dom" };
      try { element.setPointerCapture(ev.pointerId); } catch (_) {}
      update(ev);
    }, { passive: false });
    element.addEventListener("pointermove", update, { passive: false });
    element.addEventListener("pointerup", release, { passive: false });
    element.addEventListener("pointercancel", release, { passive: false });
  }

  function syncTouchWeapons() {
    document.querySelectorAll("[data-touch-weapon]").forEach((button) => {
      button.classList.toggle("is-active", Boolean(player) && Number(button.dataset.touchWeapon) === player.weapon);
    });
  }

  bindDomStick("moveStick", "moveTouch");
  bindDomStick("aimStick", "aimTouch");
  $("touchDashBtn").addEventListener("pointerdown", (ev) => { ev.preventDefault(); ev.stopPropagation(); tryDash(); });
  $("touchPulseBtn").addEventListener("pointerdown", (ev) => { ev.preventDefault(); ev.stopPropagation(); usePulse(); });
  $("touchPauseBtn").addEventListener("pointerdown", (ev) => { ev.preventDefault(); ev.stopPropagation(); pauseGame(); });
  document.querySelectorAll("[data-touch-weapon]").forEach((button) => {
    button.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      switchWeapon(Number(button.dataset.touchWeapon));
    });
  });

  // ---------------------------------------------------------------------------
  // World and entities
  // ---------------------------------------------------------------------------
  const WORLD = { w: 1920, h: 1200, margin: 40 };
  const MAP_TILE = 40;
  const MAP_COLS = WORLD.w / MAP_TILE;
  const MAP_ROWS = WORLD.h / MAP_TILE;

  // Real connected dungeon geometry: nine rooms joined by traversable corridors.
  const FLOOR_ZONES = [
    { name: "central", x: 600, y: 360, w: 720, h: 480, room: true },
    { name: "top", x: 720, y: 80, w: 480, h: 200, room: true },
    { name: "bottom", x: 720, y: 920, w: 480, h: 200, room: true },
    { name: "left", x: 80, y: 360, w: 400, h: 360, room: true },
    { name: "right", x: 1440, y: 360, w: 400, h: 360, room: true },
    { name: "topLeft", x: 120, y: 80, w: 360, h: 200, room: true },
    { name: "topRight", x: 1440, y: 80, w: 360, h: 200, room: true },
    { name: "bottomLeft", x: 120, y: 880, w: 400, h: 240, room: true },
    { name: "bottomRight", x: 1400, y: 880, w: 400, h: 240, room: true },

    { name: "northGate", x: 880, y: 280, w: 160, h: 80 },
    { name: "southGate", x: 880, y: 840, w: 160, h: 80 },
    { name: "westGate", x: 480, y: 500, w: 120, h: 160 },
    { name: "eastGate", x: 1320, y: 500, w: 120, h: 160 },
    { name: "northWestGate", x: 240, y: 280, w: 160, h: 80 },
    { name: "northEastGate", x: 1540, y: 280, w: 160, h: 80 },
    { name: "southWestGate", x: 240, y: 720, w: 160, h: 160 },
    { name: "southEastGate", x: 1540, y: 720, w: 160, h: 160 },
    { name: "topWestHall", x: 480, y: 140, w: 240, h: 80 },
    { name: "topEastHall", x: 1200, y: 140, w: 240, h: 80 },
    { name: "bottomWestHall", x: 520, y: 1000, w: 200, h: 80 },
    { name: "bottomEastHall", x: 1200, y: 1000, w: 200, h: 80 }
  ];
  const SPAWN_ROOMS = FLOOR_ZONES.filter((z) => z.room && z.name !== "central");
  const floorGrid = new Uint8Array(MAP_COLS * MAP_ROWS);
  for (let gy = 0; gy < MAP_ROWS; gy++) {
    for (let gx = 0; gx < MAP_COLS; gx++) {
      const cx = gx * MAP_TILE + MAP_TILE / 2;
      const cy = gy * MAP_TILE + MAP_TILE / 2;
      floorGrid[gy * MAP_COLS + gx] = FLOOR_ZONES.some((z) => cx >= z.x && cx < z.x + z.w && cy >= z.y && cy < z.y + z.h) ? 1 : 0;
    }
  }

  const obstacles = [
    { x: 650, y: 410, w: 100, h: 100, type: "pillar" },
    { x: 1170, y: 410, w: 100, h: 100, type: "pillar" },
    { x: 650, y: 690, w: 100, h: 100, type: "pillar" },
    { x: 1170, y: 690, w: 100, h: 100, type: "pillar" },
    { x: 745, y: 125, w: 150, h: 66, type: "crate" },
    { x: 935, y: 1020, w: 150, h: 66, type: "crate" },
    { x: 165, y: 495, w: 78, h: 78, type: "crystal" },
    { x: 1690, y: 500, w: 78, h: 78, type: "crystal" },
    { x: 225, y: 950, w: 78, h: 78, type: "crystal" },
    { x: 1500, y: 940, w: 78, h: 78, type: "crystal" }
  ];
  const decorations = [
    { sprite: "portalPurple", x: 94, y: 440, w: 128, h: 126 },
    { sprite: "torchBlue", x: 780, y: 382, w: 43, h: 80 },
    { sprite: "torchBlue", x: 1097, y: 382, w: 43, h: 80 },
    { sprite: "torchFire", x: 535, y: 515, w: 43, h: 80 },
    { sprite: "torchFire", x: 1342, y: 515, w: 43, h: 80 },
    { sprite: "torchPurple", x: 765, y: 92, w: 40, h: 78 },
    { sprite: "torchPurple", x: 1115, y: 92, w: 40, h: 78 },
    { sprite: "bannerRed", x: 914, y: 278, w: 55, h: 96 },
    { sprite: "bannerBlue", x: 1545, y: 210, w: 52, h: 93 },
    { sprite: "barrel", x: 390, y: 590, w: 53, h: 59 },
    { sprite: "barrel", x: 1725, y: 605, w: 53, h: 59 },
    { sprite: "blueChest", x: 260, y: 118, w: 58, h: 65 },
    { sprite: "blueChest", x: 1585, y: 960, w: 58, h: 65 },
    { sprite: "plant", x: 415, y: 170, w: 46, h: 68 },
    { sprite: "plant", x: 1460, y: 615, w: 46, h: 68 },
    { sprite: "plant", x: 435, y: 1020, w: 46, h: 68 },
    { sprite: "plant", x: 1710, y: 1020, w: 46, h: 68 }
  ];
  let player;
  let coopPlayers = new Map();
  let enemies = [];
  let bullets = [];
  let particles = [];
  let pickups = [];
  let floaters = [];
  let shockwaves = [];
  let spawnQueue = [];
  let spawnTimer = 0;
  let wave = 1;
  let waveAge = 0;
  let waveActive = false;
  let waveBanner = 0;
  let clearTimer = 0;
  let score = 0;
  let coins = 0;
  let kills = 0;
  let camera = { x: 280, y: 200, shake: 0 };
  let aimAngle = 0;
  let roomCleared = false;
  let entityId = 1;

  function allPlayers() {
    if (coopPlayers.size) return [...coopPlayers.values()];
    return player ? [player] : [];
  }

  function livingPlayers() {
    return allPlayers().filter((p) => p.alive !== false && p.hp > 0 && p.connected !== false);
  }

  function playerById(id) {
    return coopPlayers.get(id) || (player?.netId === id ? player : null);
  }

  function nearestLivingPlayer(entity) {
    const alive = livingPlayers();
    if (!alive.length) return player;
    let nearest = alive[0];
    let nearestDistance = distance(entity, nearest);
    for (let i = 1; i < alive.length; i++) {
      const d = distance(entity, alive[i]);
      if (d < nearestDistance) {
        nearest = alive[i];
        nearestDistance = d;
      }
    }
    return nearest;
  }

  const WEAPONS = [
    { name: "ИМПУЛЬСНИК", short: "БЛАСТЕР", sprite: "blaster", color: "#52cfff", rate: .16, damage: 15, speed: 900, cost: 1, spread: .025, pellets: 1, size: 5 },
    { name: "ГРОМОБОЙ", short: "ДРОБОВИК", sprite: "shotgun", color: "#ffad37", rate: .55, damage: 8, speed: 720, cost: 4, spread: .25, pellets: 6, size: 5 },
    { name: "КРИОБЛАСТЕР", short: "МОРОЗ", sprite: "cryo", color: "#81ecff", rate: .36, damage: 22, speed: 620, cost: 3, spread: .035, pellets: 1, size: 9, freeze: .75 }
  ];

  function makePlayer(meta = {}) {
    return {
      netId: meta.id || "solo",
      name: meta.name || "Рыцарь",
      colorIndex: Number(meta.color) || 0,
      connected: true,
      alive: true,
      x: WORLD.w / 2,
      y: WORLD.h / 2,
      r: 20,
      hp: 100,
      maxHp: 100,
      armor: 50,
      maxArmor: 50,
      energy: 100,
      maxEnergy: 100,
      speed: 255,
      vx: 0,
      vy: 0,
      weapon: 0,
      shootCd: 0,
      dashCd: 0,
      dashMax: 1.25,
      dashTimer: 0,
      pulseCd: 0,
      pulseMax: 6,
      invuln: 0,
      sinceHit: 99,
      damageMult: 1,
      fireMult: 1,
      energyRegen: 8,
      armorRegen: 10,
      crit: .08,
      multishot: 0,
      lifesteal: 0,
      ricochet: 0,
      magnet: 105,
      hitFlash: 0,
      aimAngle: 0,
      serverX: WORLD.w / 2,
      serverY: WORLD.h / 2,
      lastDashInput: 0,
      lastPulseInput: 0
    };
  }

  function startRun(networkMatch = false) {
    audio.init();
    hideToast();
    showScreen("menu", false);
    showScreen("how", false);
    showScreen("multiplayer", false);
    showScreen("networkWait", false);
    showScreen("upgrade", false);
    state = "playing";
    syncAppMode();
    canvas.style.cursor = isTouch ? "default" : "none";
    coopPlayers.clear();
    if (networkMatch && network.active) {
      network.roster.forEach((member, index) => {
        const p = makePlayer(member);
        const angle = index * TAU / Math.max(1, network.roster.length) - Math.PI / 2;
        const radius = network.roster.length > 1 ? 48 : 0;
        p.x += Math.cos(angle) * radius;
        p.y += Math.sin(angle) * radius;
        p.serverX = p.x;
        p.serverY = p.y;
        coopPlayers.set(p.netId, p);
      });
      player = coopPlayers.get(network.id) || makePlayer({ id: network.id, name: cleanPlayerName(), color: 0 });
      coopPlayers.set(player.netId, player);
    } else {
      player = makePlayer({ id: "solo", name: "Рыцарь", color: 0 });
      coopPlayers.set(player.netId, player);
    }
    syncTouchWeapons();
    enemies = [];
    bullets = [];
    particles = [];
    pickups = [];
    floaters = [];
    shockwaves = [];
    score = 0;
    coins = 0;
    kills = 0;
    wave = 1;
    runTime = 0;
    entityId = 1;
    camera.x = player.x - W / 2;
    camera.y = player.y - H / 2;
    camera.shake = 0;
    navFields.clear();
    if (!network.active || network.isHost) beginWave(1);
    else {
      waveActive = false;
      waveBanner = 0;
      toast("СИНХРОНИЗАЦИЯ С ВЕДУЩИМ…", 1.4);
    }
  }

  function beginWave(number) {
    wave = number;
    waveAge = 0;
    waveActive = true;
    waveBanner = 2.3;
    clearTimer = 0;
    roomCleared = false;
    spawnQueue = [];
    if (number === 5) {
      spawnQueue.push("boss");
      audio.boss();
    } else {
      const partyScale = 1 + Math.max(0, allPlayers().length - 1) * .42;
      const count = Math.round([0, 6, 9, 12, 15][number] * partyScale);
      for (let i = 0; i < count; i++) {
        let type = "crawler";
        const roll = Math.random();
        if (number >= 2 && roll > .53) type = "gunner";
        if (number >= 3 && roll > .78) type = "charger";
        if (number >= 4 && roll > .86) type = "turret";
        spawnQueue.push(type);
      }
      // Shuffle so every wave opens differently.
      spawnQueue.sort(() => Math.random() - .5);
    }
    spawnTimer = .65;
  }

  const navFields = new Map();

  function mapCellAt(x, y) {
    const gx = Math.floor(x / MAP_TILE);
    const gy = Math.floor(y / MAP_TILE);
    if (gx < 0 || gy < 0 || gx >= MAP_COLS || gy >= MAP_ROWS) return -1;
    return gy * MAP_COLS + gx;
  }

  function pointOnFloor(x, y) {
    const cell = mapCellAt(x, y);
    return cell >= 0 && floorGrid[cell] === 1;
  }

  function circleOnFloor(x, y, r) {
    if (!pointOnFloor(x, y)) return false;
    const sampleR = Math.max(4, r + 2);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      if (!pointOnFloor(x + Math.cos(a) * sampleR, y + Math.sin(a) * sampleR)) return false;
    }
    return true;
  }

  function moveEntity(entity, dx, dy) {
    const ox = entity.x;
    const oy = entity.y;
    if (circleOnFloor(entity.x + dx, entity.y, entity.r)) entity.x += dx;
    else entity.vx *= .12;
    if (circleOnFloor(entity.x, entity.y + dy, entity.r)) entity.y += dy;
    else entity.vy *= .12;
    for (const o of obstacles) resolveCircleRect(entity, o);
    if (!circleOnFloor(entity.x, entity.y, entity.r)) {
      entity.x = ox;
      entity.y = oy;
      entity.vx *= .2;
      entity.vy *= .2;
    }
  }

  function navigationCellOpen(cell) {
    if (cell < 0 || floorGrid[cell] !== 1) return false;
    const gx = cell % MAP_COLS;
    const gy = Math.floor(cell / MAP_COLS);
    const x = gx * MAP_TILE + MAP_TILE / 2;
    const y = gy * MAP_TILE + MAP_TILE / 2;
    return circleOnFloor(x, y, 28) && !obstacles.some((o) => circleRectHit(x, y, 18, o));
  }

  function rebuildNavigation(targetPlayer = player) {
    if (!targetPlayer) return null;
    const key = targetPlayer.netId || "solo";
    const target = mapCellAt(targetPlayer.x, targetPlayer.y);
    let record = navFields.get(key);
    if (record?.targetCell === target) return record.field;
    const field = record?.field || new Int16Array(MAP_COLS * MAP_ROWS);
    field.fill(-1);
    record = { targetCell: target, field };
    navFields.set(key, record);
    if (!navigationCellOpen(target)) return field;
    const queue = new Int32Array(MAP_COLS * MAP_ROWS);
    let head = 0, tail = 0;
    queue[tail++] = target;
    field[target] = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < tail) {
      const cell = queue[head++];
      const gx = cell % MAP_COLS;
      const gy = Math.floor(cell / MAP_COLS);
      const nextDistance = field[cell] + 1;
      for (const [dx, dy] of dirs) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= MAP_COLS || ny >= MAP_ROWS) continue;
        const next = ny * MAP_COLS + nx;
        if (field[next] >= 0 || !navigationCellOpen(next)) continue;
        field[next] = nextDistance;
        queue[tail++] = next;
      }
    }
    return field;
  }

  function hasDirectFloorPath(x1, y1, x2, y2, radius) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(d / 28));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!circleOnFloor(lerp(x1, x2, t), lerp(y1, y2, t), radius * .72)) return false;
    }
    return true;
  }

  function navigationDirection(entity, targetPlayer = player) {
    const dx = targetPlayer.x - entity.x;
    const dy = targetPlayer.y - entity.y;
    const directDistance = Math.max(1, Math.hypot(dx, dy));
    if (hasDirectFloorPath(entity.x, entity.y, targetPlayer.x, targetPlayer.y, entity.r)) return { x: dx / directDistance, y: dy / directDistance };
    const navField = rebuildNavigation(targetPlayer);
    const cell = mapCellAt(entity.x, entity.y);
    if (!navField || cell < 0 || navField[cell] < 0) return { x: dx / directDistance, y: dy / directDistance };
    const gx = cell % MAP_COLS;
    const gy = Math.floor(cell / MAP_COLS);
    let best = cell;
    for (const [sx, sy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = gx + sx, ny = gy + sy;
      if (nx < 0 || ny < 0 || nx >= MAP_COLS || ny >= MAP_ROWS) continue;
      const next = ny * MAP_COLS + nx;
      if (navField[next] >= 0 && navField[next] < navField[best]) best = next;
    }
    const tx = (best % MAP_COLS) * MAP_TILE + MAP_TILE / 2;
    const ty = Math.floor(best / MAP_COLS) * MAP_TILE + MAP_TILE / 2;
    const nd = Math.max(1, Math.hypot(tx - entity.x, ty - entity.y));
    return { x: (tx - entity.x) / nd, y: (ty - entity.y) / nd };
  }

  function validSpawn(x, y, radius = 28) {
    if (livingPlayers().some((p) => Math.hypot(x - p.x, y - p.y) < 430)) return false;
    return circleOnFloor(x, y, radius) && !obstacles.some((o) => circleRectHit(x, y, radius + 12, o));
  }

  function findSpawn(radius = 28) {
    for (let i = 0; i < 60; i++) {
      const room = choose(SPAWN_ROOMS);
      const inset = radius + 32;
      const x = rand(room.x + inset, room.x + room.w - inset);
      const y = rand(room.y + inset, room.y + room.h - inset);
      if (validSpawn(x, y, radius)) return { x, y };
    }
    return { x: 960, y: 180 };
  }

  function spawnEnemy(type, x, y) {
    const scale = 1 + (wave - 1) * .13;
    const partyScale = 1 + Math.max(0, allPlayers().length - 1) * (type === "boss" ? .5 : .28);
    const data = {
      crawler: { hp: 42, r: 20, speed: 126, damage: 12, color: "#70df75" },
      gunner: { hp: 58, r: 22, speed: 82, damage: 10, color: "#ff666f" },
      charger: { hp: 95, r: 27, speed: 75, damage: 18, color: "#c579ff" },
      turret: { hp: 115, r: 28, speed: 0, damage: 10, color: "#ffb846" },
      boss: { hp: 1150, r: 58, speed: 74, damage: 24, color: "#ee3f64" }
    }[type];
    const suppliedPointIsOpen = x != null && circleOnFloor(x, y, data.r) && !obstacles.some((o) => circleRectHit(x, y, data.r + 8, o));
    const p = suppliedPointIsOpen ? { x, y } : type === "boss" ? { x: 960, y: 180 } : findSpawn(data.r);
    const e = {
      id: entityId++,
      type,
      x: p.x,
      y: p.y,
      r: data.r,
      hp: data.hp * (type === "boss" ? partyScale : scale * partyScale),
      maxHp: data.hp * (type === "boss" ? partyScale : scale * partyScale),
      speed: data.speed * (1 + (wave - 1) * .025),
      damage: data.damage,
      color: data.color,
      sprite: choose(ENEMY_SPRITES[type]),
      vx: 0,
      vy: 0,
      flash: 0,
      contactCd: 0,
      shootCd: rand(.3, 1.1),
      mode: "idle",
      modeTimer: 0,
      chargeX: 0,
      chargeY: 0,
      frozen: 0,
      spawn: .42,
      summonCd: 6.5,
      seed: Math.random() * 1000
    };
    enemies.push(e);
    burst(e.x, e.y, type === "boss" ? "#ff3a60" : "#8e70ff", type === "boss" ? 28 : 12, 170);
    return e;
  }

  function switchWeapon(index, target = player, feedback = target === player) {
    index = clamp(Number(index) | 0, 0, WEAPONS.length - 1);
    if (!target || index === target.weapon) return;
    target.weapon = index;
    target.shootCd = Math.min(target.shootCd, .08);
    if (feedback) {
      syncTouchWeapons();
      audio.tone(260 + index * 110, .07, "square", .04, 440 + index * 90);
      toast(WEAPONS[index].name, .75);
    }
  }

  function movementVector() {
    let x = 0, y = 0;
    if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) x--;
    if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) x++;
    if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) y--;
    if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) y++;
    if (input.moveTouch) {
      const radius = input.moveTouch.radius || 45;
      x += clamp((input.moveTouch.x - input.moveTouch.sx) / radius, -1, 1);
      y += clamp((input.moveTouch.y - input.moveTouch.sy) / radius, -1, 1);
    }
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / Math.max(1, l), y: y / Math.max(1, l), length: Math.min(1, l) } : { x: 0, y: 0, length: 0 };
  }

  function currentAim() {
    if (input.aimTouch) {
      const dx = input.aimTouch.x - input.aimTouch.sx;
      const dy = input.aimTouch.y - input.aimTouch.sy;
      if (Math.hypot(dx, dy) > 8) aimAngle = Math.atan2(dy, dx);
      if (player) player.aimAngle = aimAngle;
      return aimAngle;
    }
    const wx = input.mouse.x + camera.x;
    const wy = input.mouse.y + camera.y;
    aimAngle = Math.atan2(wy - player.y, wx - player.x);
    player.aimAngle = aimAngle;
    return aimAngle;
  }

  function activateDash(target, movement, angle, feedback = false) {
    if (!target || target.alive === false || target.dashCd > 0 || target.dashTimer > 0) return false;
    const a = movement?.length > .1 ? Math.atan2(movement.y, movement.x) : angle;
    target.dashTimer = .18;
    target.dashCd = target.dashMax;
    target.invuln = Math.max(target.invuln, .28);
    target.vx = Math.cos(a) * 780;
    target.vy = Math.sin(a) * 780;
    if (feedback) {
      audio.dash();
      camera.shake = Math.max(camera.shake, 4);
    }
    for (let i = 0; i < 10; i++) particle(target.x, target.y, "#50d8ff", rand(2, 5), rand(.2, .5), rand(-150, 150), rand(-150, 150));
    return true;
  }

  function tryDash() {
    if (state !== "playing" || !player) return;
    const m = movementVector();
    const a = m.length > .1 ? Math.atan2(m.y, m.x) : currentAim();
    if (activateDash(player, m, a, true) && network.active && !network.isHost) network.dashSeq++;
  }

  function activatePulse(target, authoritative = true, feedback = false) {
    if (!target || target.alive === false || target.pulseCd > 0 || target.energy < 25) return false;
    target.energy -= 25;
    target.pulseCd = target.pulseMax;
    target.invuln = Math.max(target.invuln, .3);
    shockwaves.push({ x: target.x, y: target.y, r: 10, max: 265, life: .48, total: .48 });
    if (!authoritative) {
      if (feedback) { audio.pulse(); camera.shake = 11; }
      return true;
    }
    bullets = bullets.filter((b) => {
      if (b.team === "enemy" && Math.hypot(b.x - target.x, b.y - target.y) < 280) {
        burst(b.x, b.y, "#55eaff", 3, 90);
        score += 3;
        return false;
      }
      return true;
    });
    enemies.forEach((e) => {
      const d = Math.hypot(e.x - target.x, e.y - target.y);
      if (d < 255 + e.r) {
        const f = (1 - d / 340) * 480;
        e.vx += (e.x - target.x) / Math.max(1, d) * f;
        e.vy += (e.y - target.y) / Math.max(1, d) * f;
        damageEnemy(e, 24 * target.damageMult, false, "#64edff", target.netId);
      }
    });
    if (feedback) { audio.pulse(); camera.shake = 11; }
    return true;
  }

  function usePulse() {
    if (state !== "playing" || !player) return;
    const guest = network.active && !network.isHost;
    if (activatePulse(player, !guest, true) && guest) network.pulseSeq++;
  }

  function shootPlayer(target, angle) {
    const w = WEAPONS[target.weapon];
    if (target.alive === false || target.shootCd > 0 || target.energy < w.cost || target.dashTimer > 0) return;
    target.energy -= w.cost;
    target.shootCd = w.rate / target.fireMult;
    const extra = target.multishot;
    const total = w.pellets + extra;
    for (let i = 0; i < total; i++) {
      const centered = total === 1 ? 0 : (i / (total - 1) - .5);
      const spread = centered * w.spread * 2 + rand(-w.spread, w.spread) * (w.pellets > 1 ? .32 : 1);
      const a = angle + spread;
      const crit = Math.random() < target.crit;
      bullets.push({
        id: entityId++,
        team: "player",
        ownerId: target.netId,
        x: target.x + Math.cos(a) * 55,
        y: target.y + Math.sin(a) * 55,
        vx: Math.cos(a) * w.speed,
        vy: Math.sin(a) * w.speed,
        r: w.size + (crit ? 2 : 0),
        damage: w.damage * target.damageMult * (crit ? 1.85 : 1),
        color: crit ? "#fff46b" : w.color,
        sprite: target.weapon === 1 ? "fireSlash" : target.weapon === 2 ? "iceShard" : "blueBolt",
        life: 1.5,
        freeze: w.freeze || 0,
        ricochet: target.ricochet,
        hit: new Set(),
        crit
      });
    }
    target.vx -= Math.cos(angle) * (w.pellets > 1 ? 42 : 12);
    target.vy -= Math.sin(angle) * (w.pellets > 1 ? 42 : 12);
    particle(target.x + Math.cos(angle) * 59, target.y + Math.sin(angle) * 59, w.color, 5, .16, Math.cos(angle) * 90, Math.sin(angle) * 90);
    if (target === player) audio.shoot(target.weapon);
  }

  function enemyBullet(e, angle, speed = 360, size = 6, color = "#ff5969", damage = null) {
    bullets.push({
      id: entityId++,
      team: "enemy",
      x: e.x + Math.cos(angle) * (e.r + 8),
      y: e.y + Math.sin(angle) * (e.r + 8),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: size,
      damage: damage ?? e.damage,
      color,
      sprite: "voidOrb",
      life: 4,
      hit: new Set()
    });
  }

  function circleRectHit(x, y, r, o) {
    const nx = clamp(x, o.x, o.x + o.w);
    const ny = clamp(y, o.y, o.y + o.h);
    return (x - nx) ** 2 + (y - ny) ** 2 < r * r;
  }

  function resolveCircleRect(entity, o) {
    let nx = clamp(entity.x, o.x, o.x + o.w);
    let ny = clamp(entity.y, o.y, o.y + o.h);
    let dx = entity.x - nx;
    let dy = entity.y - ny;
    let d = Math.hypot(dx, dy);
    if (d >= entity.r || d > 0.001) {
      if (d < entity.r) {
        const push = entity.r - d;
        entity.x += dx / d * push;
        entity.y += dy / d * push;
      }
      return d < entity.r;
    }
    // Centre is inside the rectangle: use the nearest side.
    const sides = [
      { d: Math.abs(entity.x - o.x), x: o.x - entity.r, axis: "x" },
      { d: Math.abs(entity.x - (o.x + o.w)), x: o.x + o.w + entity.r, axis: "x" },
      { d: Math.abs(entity.y - o.y), y: o.y - entity.r, axis: "y" },
      { d: Math.abs(entity.y - (o.y + o.h)), y: o.y + o.h + entity.r, axis: "y" }
    ].sort((a, b) => a.d - b.d)[0];
    if (sides.axis === "x") entity.x = sides.x;
    else entity.y = sides.y;
    return true;
  }

  function updatePlayerEntity(target, dt, control) {
    if (!target || target.alive === false) {
      if (target) { target.vx = 0; target.vy = 0; }
      return;
    }
    target.shootCd -= dt;
    target.dashCd = Math.max(0, target.dashCd - dt);
    target.pulseCd = Math.max(0, target.pulseCd - dt);
    target.invuln = Math.max(0, target.invuln - dt);
    target.hitFlash = Math.max(0, target.hitFlash - dt);
    target.sinceHit += dt;
    target.energy = Math.min(target.maxEnergy, target.energy + target.energyRegen * dt);
    if (target.sinceHit > 4 && target.armor < target.maxArmor) target.armor = Math.min(target.maxArmor, target.armor + target.armorRegen * dt);

    const m = control.movement;
    target.aimAngle = control.aim;
    if (target.dashTimer > 0) {
      target.dashTimer -= dt;
      if (Math.random() < .85) particle(target.x, target.y, "#54dfff", rand(3, 7), .28, rand(-40, 40), rand(-40, 40));
    } else {
      const targetVx = m.x * target.speed;
      const targetVy = m.y * target.speed;
      target.vx = lerp(target.vx, targetVx, 1 - Math.exp(-dt * 13));
      target.vy = lerp(target.vy, targetVy, 1 - Math.exp(-dt * 13));
    }
    moveEntity(target, target.vx * dt, target.vy * dt);
    if (control.shoot) shootPlayer(target, control.aim);
  }

  function updatePlayers(dt) {
    const localMovement = movementVector();
    const localAim = currentAim();
    updatePlayerEntity(player, dt, { movement: localMovement, aim: localAim, shoot: input.mouse.down || Boolean(input.aimTouch) });

    if (network.active && network.isHost) {
      for (const target of allPlayers()) {
        if (target === player) continue;
        const remote = network.remoteInputs.get(target.netId);
        const fresh = remote && performance.now() - remote.receivedAt < 650;
        const mx = fresh ? clamp(remote.moveX, -1, 1) : 0;
        const my = fresh ? clamp(remote.moveY, -1, 1) : 0;
        const length = Math.hypot(mx, my);
        const movement = length > 0 ? { x: mx / Math.max(1, length), y: my / Math.max(1, length), length: Math.min(1, length) } : { x: 0, y: 0, length: 0 };
        const remoteAim = fresh ? remote.aim : target.aimAngle;
        if (fresh) switchWeapon(remote.weapon, target, false);
        if (fresh && remote.dash > target.lastDashInput) {
          target.lastDashInput = remote.dash;
          activateDash(target, movement, remoteAim, false);
        }
        if (fresh && remote.pulse > target.lastPulseInput) {
          target.lastPulseInput = remote.pulse;
          activatePulse(target, true, false);
        }
        updatePlayerEntity(target, dt, { movement, aim: remoteAim, shoot: Boolean(fresh && remote.shoot) });
      }
    }

    const active = livingPlayers();
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i], b = active[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        const min = a.r + b.r - 4;
        if (d > 0 && d < min) {
          const push = (min - d) * .5;
          a.x += dx / d * push; a.y += dy / d * push;
          b.x -= dx / d * push; b.y -= dy / d * push;
        }
      }
    }
  }

  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.flash = Math.max(0, e.flash - dt);
      e.contactCd -= dt;
      e.shootCd -= dt;
      e.modeTimer -= dt;
      e.spawn -= dt;
      e.frozen = Math.max(0, e.frozen - dt);
      const slow = e.frozen > 0 ? .42 : 1;
      const targetPlayer = nearestLivingPlayer(e);
      if (!targetPlayer) continue;
      const dx = targetPlayer.x - e.x;
      const dy = targetPlayer.y - e.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const nav = navigationDirection(e, targetPlayer);
      const ux = nav.x;
      const uy = nav.y;
      let mx = 0, my = 0;

      if (e.type === "crawler") {
        mx = ux; my = uy;
        e.vx = lerp(e.vx, mx * e.speed * slow, 1 - Math.exp(-dt * 6));
        e.vy = lerp(e.vy, my * e.speed * slow, 1 - Math.exp(-dt * 6));
      } else if (e.type === "gunner") {
        const side = Math.sin(gameTime * 1.2 + e.seed) > 0 ? 1 : -1;
        const forward = d > 330 ? 1 : d < 225 ? -1 : 0;
        mx = ux * forward + -uy * side * .48;
        my = uy * forward + ux * side * .48;
        e.vx = lerp(e.vx, mx * e.speed * slow, 1 - Math.exp(-dt * 5));
        e.vy = lerp(e.vy, my * e.speed * slow, 1 - Math.exp(-dt * 5));
        if (e.shootCd <= 0 && d < 640) {
          enemyBullet(e, Math.atan2(dy, dx) + rand(-.075, .075), 390 + wave * 10);
          e.shootCd = rand(1.05, 1.5) * Math.max(.72, 1 - wave * .035);
        }
      } else if (e.type === "charger") {
        if (e.mode === "idle") {
          e.vx = lerp(e.vx, ux * e.speed * slow, 1 - Math.exp(-dt * 4));
          e.vy = lerp(e.vy, uy * e.speed * slow, 1 - Math.exp(-dt * 4));
          if (e.shootCd <= 0 && d < 520) {
            e.mode = "telegraph";
            e.modeTimer = .72;
            e.chargeX = ux;
            e.chargeY = uy;
            e.vx *= .1; e.vy *= .1;
          }
        } else if (e.mode === "telegraph") {
          e.vx *= .88; e.vy *= .88;
          if (e.modeTimer <= 0) {
            e.mode = "charge";
            e.modeTimer = .52;
            e.vx = e.chargeX * 560;
            e.vy = e.chargeY * 560;
          }
        } else if (e.mode === "charge" && e.modeTimer <= 0) {
          e.mode = "idle";
          e.shootCd = 2.4;
          e.vx *= .2; e.vy *= .2;
        }
      } else if (e.type === "turret") {
        e.vx *= .8; e.vy *= .8;
        if (e.shootCd <= 0 && d < 700) {
          const a = Math.atan2(dy, dx);
          [-.2, 0, .2].forEach((s) => enemyBullet(e, a + s, 330, 6, "#ffb13b", e.damage));
          e.shootCd = 1.75;
        }
      } else if (e.type === "boss") {
        const phase = e.hp / e.maxHp < .48 ? 2 : 1;
        const side = Math.sin(gameTime * .7) > 0 ? 1 : -1;
        const forward = d > 335 ? 1 : d < 235 ? -.7 : 0;
        mx = ux * forward + -uy * side * .6;
        my = uy * forward + ux * side * .6;
        e.vx = lerp(e.vx, mx * e.speed * slow * (phase === 2 ? 1.35 : 1), 1 - Math.exp(-dt * 3));
        e.vy = lerp(e.vy, my * e.speed * slow * (phase === 2 ? 1.35 : 1), 1 - Math.exp(-dt * 3));
        if (e.shootCd <= 0) {
          const count = phase === 2 ? 16 : 12;
          const offset = gameTime * .55;
          for (let n = 0; n < count; n++) enemyBullet(e, offset + n * TAU / count, phase === 2 ? 310 : 260, phase === 2 ? 8 : 7, n % 2 ? "#ff405f" : "#b84fff", 13);
          e.shootCd = phase === 2 ? 1.05 : 1.5;
          camera.shake = Math.max(camera.shake, 5);
        }
        e.summonCd -= dt;
        if (e.summonCd <= 0 && enemies.length < 9) {
          for (let n = 0; n < (phase === 2 ? 3 : 2); n++) {
            const a = n * TAU / 3 + Math.random();
            spawnEnemy(n === 1 && phase === 2 ? "gunner" : "crawler", e.x + Math.cos(a) * 115, e.y + Math.sin(a) * 115);
          }
          e.summonCd = phase === 2 ? 5.2 : 7.5;
        }
      }

      // Soft separation keeps mobs readable instead of forming one blob.
      for (let j = 0; j < enemies.length; j++) {
        const other = enemies[j];
        if (other === e) continue;
        const sx = e.x - other.x;
        const sy = e.y - other.y;
        const sd = Math.hypot(sx, sy);
        const min = e.r + other.r + 6;
        if (sd > 0 && sd < min) {
          e.vx += sx / sd * (min - sd) * 4;
          e.vy += sy / sd * (min - sd) * 4;
        }
      }

      moveEntity(e, e.vx * dt, e.vy * dt);

      if (e.contactCd <= 0) {
        for (const victim of livingPlayers()) {
          if (Math.hypot(victim.x - e.x, victim.y - e.y) < e.r + victim.r + 3 && victim.dashTimer <= 0) {
            damagePlayer(victim, e.damage, e.x, e.y);
            e.contactCd = .75;
            const knockD = Math.max(1, Math.hypot(victim.x - e.x, victim.y - e.y));
            e.vx -= (victim.x - e.x) / knockD * 190;
            e.vy -= (victim.y - e.y) / knockD * 190;
            break;
          }
        }
      }
    }
  }

  function bulletHitsObstacle(b) {
    return obstacles.some((o) => circleRectHit(b.x, b.y, b.r, o));
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const oldX = b.x, oldY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const hitMapWall = !circleOnFloor(b.x, b.y, b.r);
      let remove = b.life <= 0;
      if (!remove && (hitMapWall || bulletHitsObstacle(b))) {
        if (b.team === "player" && b.ricochet > 0) {
          b.ricochet--;
          b.x = oldX; b.y = oldY;
          // Determine a useful reflection from the attempted movement.
          const hitX = !circleOnFloor(oldX + b.vx * dt, oldY, b.r) || obstacles.some((o) => circleRectHit(oldX + b.vx * dt, oldY, b.r, o));
          const hitY = !circleOnFloor(oldX, oldY + b.vy * dt, b.r) || obstacles.some((o) => circleRectHit(oldX, oldY + b.vy * dt, b.r, o));
          if (hitX) b.vx *= -1;
          if (hitY) b.vy *= -1;
          if (!hitX && !hitY) { b.vx *= -1; b.vy *= -1; }
          audio.tone(700, .035, "square", .015, 520);
        } else remove = true;
      }

      if (!remove && b.team === "player") {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (b.hit.has(e)) continue;
          if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
            b.hit.add(e);
            damageEnemy(e, b.damage, b.crit, b.color, b.ownerId);
            if (b.freeze && Math.random() < b.freeze) e.frozen = Math.max(e.frozen, 1.3);
            const d = Math.max(1, Math.hypot(b.vx, b.vy));
            e.vx += b.vx / d * 80;
            e.vy += b.vy / d * 80;
            remove = true;
            break;
          }
        }
      } else if (!remove && b.team === "enemy") {
        for (const victim of livingPlayers()) {
          if (victim.invuln <= 0 && Math.hypot(b.x - victim.x, b.y - victim.y) < b.r + victim.r) {
            damagePlayer(victim, b.damage, b.x, b.y);
            remove = true;
            break;
          }
        }
      }

      if (remove) {
        burst(b.x, b.y, b.color, b.r > 7 ? 5 : 3, 75);
        bullets.splice(i, 1);
      } else if (Math.random() < .55) {
        particle(b.x, b.y, b.color, Math.max(1, b.r * .42), .13, -b.vx * .03, -b.vy * .03);
      }
    }
  }

  function damageEnemy(e, amount, critical = false, color = "#fff", sourceId = player?.netId) {
    if (!e || e.hp <= 0) return;
    e.hp -= amount;
    e.lastHitBy = sourceId;
    e.flash = .09;
    floaters.push({ x: e.x + rand(-8, 8), y: e.y - e.r - 8, text: `${Math.round(amount)}`, color: critical ? "#fff05a" : color, life: .7, total: .7, big: critical });
    audio.hit();
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    const index = enemies.indexOf(e);
    if (index < 0) return;
    enemies.splice(index, 1);
    const boss = e.type === "boss";
    const value = boss ? 2500 : e.type === "charger" ? 220 : e.type === "turret" ? 260 : e.type === "gunner" ? 150 : 100;
    score += value * wave;
    kills++;
    const killer = playerById(e.lastHitBy) || player;
    if (killer?.lifesteal > 0 && Math.random() < killer.lifesteal) killer.hp = Math.min(killer.maxHp, killer.hp + 4);
    burst(e.x, e.y, e.color, boss ? 70 : 20, boss ? 360 : 220);
    shockwaves.push({ x: e.x, y: e.y, r: 5, max: boss ? 210 : 55, life: boss ? .6 : .23, total: boss ? .6 : .23, color: e.color, decorative: true });
    camera.shake = Math.max(camera.shake, boss ? 22 : 5);
    const coinCount = boss ? 18 : irand(1, e.type === "crawler" ? 2 : 3);
    for (let i = 0; i < coinCount; i++) pickups.push({ type: "coin", x: e.x + rand(-18, 18), y: e.y + rand(-18, 18), vx: rand(-150, 150), vy: rand(-150, 150), r: 9, value: boss ? 5 : 1, life: 15, bob: Math.random() * TAU });
    const roll = Math.random();
    if (!boss && roll < .09) pickups.push({ type: "heart", x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-80, 80), r: 13, value: 20, life: 14, bob: Math.random() * TAU });
    else if (!boss && roll < .2) pickups.push({ type: "energy", x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-80, 80), r: 12, value: 25, life: 14, bob: Math.random() * TAU });
  }

  function damagePlayer(target, amount, fromX, fromY) {
    if (!target || target.alive === false || target.invuln > 0 || state !== "playing") return;
    let left = amount;
    if (target.armor > 0) {
      const absorbed = Math.min(target.armor, left);
      target.armor -= absorbed;
      left -= absorbed;
    }
    if (left > 0) target.hp -= left;
    target.sinceHit = 0;
    target.invuln = .62;
    target.hitFlash = .2;
    const dx = target.x - fromX;
    const dy = target.y - fromY;
    const d = Math.max(1, Math.hypot(dx, dy));
    target.vx += dx / d * 260;
    target.vy += dy / d * 260;
    floaters.push({ x: target.x, y: target.y - 35, text: `-${Math.ceil(amount)}`, color: "#ff4a59", life: .9, total: .9, big: true });
    burst(target.x, target.y, target.armor > 0 ? "#41bfff" : "#ff4056", 14, 210);
    if (target === player) {
      camera.shake = 14;
      audio.hurt();
    }
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      target.vx = 0;
      target.vy = 0;
      shockwaves.push({ x: target.x, y: target.y, r: 5, max: 90, life: .45, total: .45, color: "#ff4056", decorative: true });
      if (target === player && livingPlayers().length) toast("ВЫ ПАЛИ — ЖДИТЕ КОНЦА ВОЛНЫ", 2.2);
      if (livingPlayers().length === 0) endRun(false);
    }
  }

  function particle(x, y, color, size = 3, life = .4, vx = 0, vy = 0) {
    particles.push({ x, y, color, size, life, total: life, vx, vy, gravity: rand(10, 60) });
  }

  function burst(x, y, color, count = 10, speed = 160) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = rand(speed * .25, speed);
      particle(x, y, color, rand(2, 6), rand(.25, .75), Math.cos(a) * s, Math.sin(a) * s);
    }
  }

  function updateEffects(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(.07, dt);
      p.vy = p.vy * Math.pow(.16, dt) + p.gravity * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life -= dt;
      f.y -= 44 * dt;
      if (f.life <= 0) floaters.splice(i, 1);
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const s = shockwaves[i];
      s.life -= dt;
      s.r = lerp(s.r, s.max, 1 - Math.exp(-dt * 12));
      if (s.life <= 0) shockwaves.splice(i, 1);
    }
  }

  function updatePickups(dt) {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.life -= dt;
      p.bob += dt * 4;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(.03, dt);
      p.vy *= Math.pow(.03, dt);
      let magnetTarget = null;
      let magnetDistance = Infinity;
      for (const candidate of livingPlayers()) {
        const d = Math.hypot(candidate.x - p.x, candidate.y - p.y);
        if (d < candidate.magnet && d < magnetDistance) {
          magnetTarget = candidate;
          magnetDistance = d;
        }
      }
      if (magnetTarget) {
        const dx = magnetTarget.x - p.x;
        const dy = magnetTarget.y - p.y;
        const d = Math.max(1, magnetDistance);
        const force = (1 - d / magnetTarget.magnet) * 1250 + 120;
        p.vx += dx / d * force * dt;
        p.vy += dy / d * force * dt;
      }
      const collector = livingPlayers().find((candidate) => Math.hypot(candidate.x - p.x, candidate.y - p.y) < candidate.r + p.r + 5);
      if (collector) {
        if (p.type === "coin") { coins += p.value; score += p.value * 20; }
        if (p.type === "heart") { collector.hp = Math.min(collector.maxHp, collector.hp + p.value); if (collector === player) toast(`ЗДОРОВЬЕ +${p.value}`, .8); }
        if (p.type === "energy") { collector.energy = Math.min(collector.maxEnergy, collector.energy + p.value); if (collector === player) toast(`ЭНЕРГИЯ +${p.value}`, .8); }
        if (collector === player) audio.pickup();
        burst(p.x, p.y, p.type === "coin" ? "#ffd23f" : p.type === "heart" ? "#ff4059" : "#46d7ff", 7, 100);
        pickups.splice(i, 1);
      } else if (p.life <= 0) pickups.splice(i, 1);
    }
  }

  function updateWave(dt) {
    waveAge += dt;
    if (spawnQueue.length) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnEnemy(spawnQueue.shift());
        spawnTimer = wave === 5 ? .2 : rand(.35, .62);
      }
    }
    if (waveActive && waveAge > 2 && spawnQueue.length === 0 && enemies.length === 0) {
      if (clearTimer <= 0) {
        clearTimer = 1.35;
        roomCleared = true;
        score += 500 * wave;
        for (const member of allPlayers()) {
          if (member.alive === false) {
            member.alive = true;
            member.hp = Math.max(1, Math.ceil(member.maxHp * .5));
            member.armor = Math.max(member.armor, Math.ceil(member.maxArmor * .35));
            member.x = WORLD.w / 2 + rand(-55, 55);
            member.y = WORLD.h / 2 + rand(-55, 55);
            member.invuln = 2;
          } else member.hp = Math.min(member.maxHp, member.hp + 8);
          member.energy = member.maxEnergy;
        }
        audio.clear();
        toast(wave === 5 ? "СТРАЖ ПОВЕРЖЕН" : `ВОЛНА ${wave} ЗАЧИЩЕНА`, 1.25);
      } else {
        clearTimer -= dt;
        if (clearTimer <= 0) {
          waveActive = false;
          if (wave >= 5) endRun(true);
          else openUpgrade();
        }
      }
    }
  }

  function updateCamera(dt) {
    const focus = player?.alive === false ? (livingPlayers()[0] || player) : player;
    const tx = clamp(focus.x - W / 2, 0, WORLD.w - W);
    const ty = clamp(focus.y - H / 2, 0, WORLD.h - H);
    camera.x = lerp(camera.x, tx, 1 - Math.exp(-dt * 5));
    camera.y = lerp(camera.y, ty, 1 - Math.exp(-dt * 5));
    camera.shake = Math.max(0, camera.shake - dt * 28);
  }

  function serializableBullet(b) {
    const copy = { ...b };
    delete copy.hit;
    return copy;
  }

  function makeNetworkSnapshot() {
    return {
      state,
      runTime,
      wave,
      waveAge,
      waveActive,
      waveBanner,
      roomCleared,
      score,
      coins,
      kills,
      spawnQueue: [...spawnQueue],
      players: allPlayers().map((p) => ({ ...p, serverX: undefined, serverY: undefined })),
      enemies: enemies.map((e) => ({ ...e })),
      bullets: bullets.map(serializableBullet),
      pickups: pickups.map((p) => ({ ...p })),
      shockwaves: shockwaves.map((s) => ({ ...s }))
    };
  }

  function sendHostSnapshot(dt) {
    if (!network.active || !network.isHost) return;
    network.snapshotClock += dt;
    if (network.snapshotClock < .05) return;
    network.snapshotClock %= .05;
    networkSend({ type: "snapshot", data: makeNetworkSnapshot() });
  }

  function applyNetworkSnapshot(data) {
    if (!data || !Array.isArray(data.players)) return;
    const previous = coopPlayers;
    const nextPlayers = new Map();
    for (const incoming of data.players) {
      if (!incoming?.netId) continue;
      let target = previous.get(incoming.netId) || makePlayer({ id: incoming.netId, name: incoming.name, color: incoming.colorIndex });
      if (incoming.netId === network.id && target) {
        const localX = target.x;
        const localY = target.y;
        const localAim = target.aimAngle;
        Object.assign(target, incoming);
        target.serverX = incoming.x;
        target.serverY = incoming.y;
        const error = Math.hypot(localX - incoming.x, localY - incoming.y);
        if (network.receivedSnapshot && error < 220 && target.alive !== false) {
          target.x = localX;
          target.y = localY;
          target.aimAngle = localAim;
        }
      } else Object.assign(target, incoming, { serverX: incoming.x, serverY: incoming.y });
      nextPlayers.set(target.netId, target);
    }
    coopPlayers = nextPlayers;
    player = coopPlayers.get(network.id) || player;
    if (!player) return;
    aimAngle = player.aimAngle || aimAngle;
    enemies = Array.isArray(data.enemies) ? data.enemies.map((e) => ({ ...e })) : [];
    bullets = Array.isArray(data.bullets) ? data.bullets.map((b) => ({ ...b, hit: new Set() })) : [];
    pickups = Array.isArray(data.pickups) ? data.pickups.map((p) => ({ ...p })) : [];
    shockwaves = Array.isArray(data.shockwaves) ? data.shockwaves.map((s) => ({ ...s })) : [];
    spawnQueue = Array.isArray(data.spawnQueue) ? [...data.spawnQueue] : [];
    runTime = Number(data.runTime) || 0;
    wave = Number(data.wave) || 1;
    waveAge = Number(data.waveAge) || 0;
    waveActive = Boolean(data.waveActive);
    waveBanner = Number(data.waveBanner) || 0;
    roomCleared = Boolean(data.roomCleared);
    score = Number(data.score) || 0;
    coins = Number(data.coins) || 0;
    kills = Number(data.kills) || 0;
    network.lastSnapshotAt = performance.now();
    network.receivedSnapshot = true;

    const nextState = ["playing", "paused", "upgrade", "gameover", "victory"].includes(data.state) ? data.state : "playing";
    if (state !== nextState) {
      state = nextState;
      syncAppMode();
      if (nextState === "upgrade") {
        $("networkWaitTitle").textContent = "ВЕДУЩИЙ ВЫБИРАЕТ УСИЛЕНИЕ";
        $("networkWaitText").textContent = "Усиление получит вся команда";
        showScreen("networkWait", true);
      } else showScreen("networkWait", false);
      canvas.style.cursor = nextState === "playing" && !isTouch ? "none" : "default";
    }
  }

  function sendGuestInput(dt) {
    if (!network.active || network.isHost) return;
    network.sendClock += dt;
    if (network.sendClock < 1 / 30) return;
    network.sendClock %= 1 / 30;
    const m = state === "playing" && player?.alive !== false ? movementVector() : { x: 0, y: 0 };
    const angle = player ? currentAim() : 0;
    networkSend({
      type: "input",
      seq: ++network.inputSeq,
      moveX: m.x,
      moveY: m.y,
      aim: angle,
      shoot: state === "playing" && player?.alive !== false && (input.mouse.down || Boolean(input.aimTouch)),
      weapon: player?.weapon || 0,
      dash: network.dashSeq,
      pulse: network.pulseSeq
    });
  }

  function updateGuestWorld(dt) {
    sendGuestInput(dt);
    if (!player) return;
    if (performance.now() - network.lastSnapshotAt > 5000) {
      $("networkWaitTitle").textContent = "НЕТ ОТВЕТА ОТ ВЕДУЩЕГО";
      $("networkWaitText").textContent = "Проверяем соединение…";
      showScreen("networkWait", true);
    }
    if (state !== "playing") {
      updateEffects(dt);
      updateCamera(dt);
      return;
    }
    showScreen("networkWait", false);
    runTime += dt;
    waveBanner = Math.max(0, waveBanner - dt);
    if (player.alive !== false) {
      player.shootCd -= dt;
      player.dashCd = Math.max(0, player.dashCd - dt);
      player.pulseCd = Math.max(0, player.pulseCd - dt);
      player.invuln = Math.max(0, player.invuln - dt);
      player.energy = Math.min(player.maxEnergy, player.energy + player.energyRegen * dt);
      const m = movementVector();
      currentAim();
      if (player.dashTimer > 0) player.dashTimer -= dt;
      else {
        player.vx = lerp(player.vx, m.x * player.speed, 1 - Math.exp(-dt * 13));
        player.vy = lerp(player.vy, m.y * player.speed, 1 - Math.exp(-dt * 13));
      }
      moveEntity(player, player.vx * dt, player.vy * dt);
      const correction = Math.hypot(player.serverX - player.x, player.serverY - player.y);
      if (correction > 220) {
        player.x = player.serverX;
        player.y = player.serverY;
      } else {
        const amount = 1 - Math.exp(-dt * 5);
        player.x = lerp(player.x, player.serverX, amount);
        player.y = lerp(player.y, player.serverY, amount);
      }
    }
    for (const member of allPlayers()) {
      if (member === player) continue;
      member.x += (member.vx || 0) * dt;
      member.y += (member.vy || 0) * dt;
    }
    for (const e of enemies) { e.x += (e.vx || 0) * dt; e.y += (e.vy || 0) * dt; }
    for (const b of bullets) { b.x += (b.vx || 0) * dt; b.y += (b.vy || 0) * dt; }
    for (const p of pickups) { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; p.bob = (p.bob || 0) + dt * 4; }
    updateEffects(dt);
    updateCamera(dt);
    audio.music(gameTime, wave === 5);
  }

  function update(dt) {
    gameTime += dt;
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) hideToast();
    }
    if (network.active && !network.isHost) {
      updateGuestWorld(dt);
      return;
    }
    if (state !== "playing") {
      sendHostSnapshot(dt);
      return;
    }
    runTime += dt;
    waveBanner = Math.max(0, waveBanner - dt);
    updatePlayers(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updatePickups(dt);
    updateEffects(dt);
    updateWave(dt);
    updateCamera(dt);
    audio.music(gameTime, wave === 5);
    sendHostSnapshot(dt);
  }

  // ---------------------------------------------------------------------------
  // Upgrades and run endings
  // ---------------------------------------------------------------------------
  const UPGRADES = [
    { id: "damage", icon: "✦", color: "#ff6b4f", title: "КАЛИБРОВКА", text: "+20% к урону всего оружия", tag: "урон", apply: (p) => p.damageMult *= 1.2 },
    { id: "firerate", icon: "⚡", color: "#ffc43d", title: "РАЗГОН", text: "+18% к скорострельности", tag: "темп", apply: (p) => p.fireMult *= 1.18 },
    { id: "health", icon: "+", color: "#58df78", title: "БИОБРОНЯ", text: "+25 к максимуму здоровья и полное лечение", tag: "защита", apply: (p) => { p.maxHp += 25; p.hp = p.maxHp; } },
    { id: "armor", icon: "◆", color: "#4ac8ff", title: "НАНОЩИТ", text: "+18 к максимуму щита и +3 к регенерации", tag: "защита", apply: (p) => { p.maxArmor += 18; p.armor = p.maxArmor; p.armorRegen += 3; } },
    { id: "energy", icon: "ϟ", color: "#a987ff", title: "ЯДРО", text: "+30 энергии и ускоренная зарядка", tag: "ресурс", apply: (p) => { p.maxEnergy += 30; p.energy = p.maxEnergy; p.energyRegen += 3; } },
    { id: "speed", icon: "➜", color: "#62ecdc", title: "ЛЁГКИЙ ШАГ", text: "+12% к скорости движения", tag: "мобильность", apply: (p) => p.speed *= 1.12 },
    { id: "dash", icon: "»", color: "#48b9ff", title: "ФАЗОВЫЙ РЫВОК", text: "Рывок перезаряжается на 25% быстрее", tag: "мобильность", apply: (p) => p.dashMax *= .75 },
    { id: "crit", icon: "!", color: "#ffdc55", title: "ТОЧНЫЙ ВЫСТРЕЛ", text: "+14% шанс критического урона", tag: "урон", apply: (p) => p.crit += .14 },
    { id: "multi", icon: "≡", color: "#ff7ca8", title: "ЭХО-СТВОЛ", text: "+1 дополнительный снаряд за выстрел", tag: "редкое", apply: (p) => p.multishot += 1 },
    { id: "ricochet", icon: "↗", color: "#bd86ff", title: "РИКОШЕТ", text: "Пули один раз отскакивают от препятствий", tag: "редкое", apply: (p) => p.ricochet += 1 },
    { id: "vamp", icon: "♥", color: "#ff4e69", title: "СБОРЩИК ДУШ", text: "20% шанс восстановить здоровье за убийство", tag: "редкое", apply: (p) => p.lifesteal += .2 },
    { id: "magnet", icon: "⌁", color: "#6ce7ff", title: "МАГНИТ", text: "Вдвое больше радиус сбора добычи", tag: "удобство", apply: (p) => p.magnet *= 2 }
  ];
  let offeredUpgrades = [];

  function openUpgrade() {
    state = "upgrade";
    syncAppMode();
    canvas.style.cursor = "default";
    input.mouse.down = false;
    const pool = [...UPGRADES].sort(() => Math.random() - .5);
    offeredUpgrades = pool.slice(0, 3);
    const wrap = $("upgradeChoices");
    wrap.innerHTML = "";
    offeredUpgrades.forEach((u, i) => {
      const button = document.createElement("button");
      button.className = "upgrade-card";
      button.style.setProperty("--card-color", u.color);
      button.innerHTML = `<span class="upgrade-number">${i + 1}</span><span class="upgrade-icon">${u.icon}</span><h3>${u.title}</h3><p>${u.text}</p><small>${u.tag}</small>`;
      button.addEventListener("click", () => chooseUpgrade(i));
      wrap.appendChild(button);
    });
    showScreen("upgrade", true);
  }

  function chooseUpgrade(index) {
    if (state !== "upgrade" || !offeredUpgrades[index]) return;
    const selected = offeredUpgrades[index];
    for (const member of allPlayers()) selected.apply(member);
    showScreen("upgrade", false);
    state = "playing";
    syncAppMode();
    canvas.style.cursor = isTouch ? "default" : "none";
    audio.pickup();
    toast(selected.title, 1.2);
    beginWave(wave + 1);
  }

  function saveBest() {
    if (score <= bestScore) return false;
    bestScore = Math.round(score);
    $("bestScore").textContent = bestScore.toLocaleString("ru-RU");
    try { localStorage.setItem("neonDungeonBest", String(bestScore)); } catch (_) {}
    return true;
  }

  function endRun(won) {
    if (state !== "playing") return;
    state = won ? "victory" : "gameover";
    syncAppMode();
    input.mouse.down = false;
    input.moveTouch = null;
    input.aimTouch = null;
    canvas.style.cursor = "default";
    const record = saveBest();
    if (record) toast("НОВЫЙ РЕКОРД!", 2.5);
    if (won) audio.clear();
  }

  function pauseGame() {
    if (state !== "playing") return;
    if (network.active && !network.isHost) {
      toast("ПАУЗОЙ УПРАВЛЯЕТ ВЕДУЩИЙ", 1.2);
      return;
    }
    state = "paused";
    syncAppMode();
    input.mouse.down = false;
    canvas.style.cursor = "default";
  }

  function resumeGame() {
    if (state !== "paused") return;
    if (network.active && !network.isHost) return;
    state = "playing";
    syncAppMode();
    canvas.style.cursor = isTouch ? "default" : "none";
    lastTime = performance.now();
  }

  function returnToMenu() {
    if (network.active) {
      if (network.isHost) networkSend({ type: "return_lobby" });
      else leaveNetworkRoom();
      network.active = false;
      showNetworkLobby();
      return;
    }
    state = "menu";
    syncAppMode();
    input.mouse.down = false;
    canvas.style.cursor = "crosshair";
    showScreen("menu", true);
  }

  function handleOverlayClick(p) {
    if (state === "paused") {
      if (network.active && !network.isHost) {
        if (pointIn(p, uiRects.sound || {})) toggleAudio();
        else toast("ЖДЁМ ВЕДУЩЕГО", 1);
        return;
      }
      if (pointIn(p, uiRects.resume || {})) resumeGame();
      else if (pointIn(p, uiRects.sound || {})) toggleAudio();
      else if (pointIn(p, uiRects.menu || {}) || pointIn(p, uiRects.quit || {})) returnToMenu();
    } else if (state === "gameover") {
      if (pointIn(p, uiRects.retry || {})) {
        if (network.active) {
          if (network.isHost) networkSend({ type: "start" });
          else toast("ПОВТОРНЫЙ ЗАБЕГ ЗАПУСКАЕТ ВЕДУЩИЙ", 1.4);
        } else startRun();
      }
    } else if (state === "victory") {
      if (pointIn(p, uiRects.continue || {})) returnToMenu();
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: dungeon
  // ---------------------------------------------------------------------------
  function drawFloor() {
    ctx.fillStyle = "#030610";
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    const minGX = clamp(Math.floor(camera.x / MAP_TILE) - 2, 0, MAP_COLS - 1);
    const maxGX = clamp(Math.ceil((camera.x + W) / MAP_TILE) + 2, 0, MAP_COLS - 1);
    const minGY = clamp(Math.floor(camera.y / MAP_TILE) - 2, 0, MAP_ROWS - 1);
    const maxGY = clamp(Math.ceil((camera.y + H) / MAP_TILE) + 2, 0, MAP_ROWS - 1);
    const hasTile = (gx, gy) => gx >= 0 && gy >= 0 && gx < MAP_COLS && gy < MAP_ROWS && floorGrid[gy * MAP_COLS + gx] === 1;

    // Blue floor tiles shared by every room and corridor.
    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        if (!hasTile(gx, gy)) continue;
        const x = gx * MAP_TILE, y = gy * MAP_TILE;
        const h = hash(gx, gy);
        ctx.fillStyle = h > .58 ? "#151d35" : "#11192e";
        ctx.fillRect(x, y, MAP_TILE, MAP_TILE);
        ctx.fillStyle = h > .77 ? "rgba(74,105,166,.22)" : "rgba(0,0,0,.14)";
        ctx.fillRect(x + 3, y + 3, MAP_TILE - 6, 3);
        ctx.fillStyle = "rgba(4,8,18,.32)";
        ctx.fillRect(x + MAP_TILE - 3, y + 5, 2, MAP_TILE - 8);
        if (h > .87) {
          ctx.strokeStyle = "#293958";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 7, y + 30);
          ctx.lineTo(x + 16, y + 23);
          ctx.lineTo(x + 24, y + 27);
          ctx.lineTo(x + 33, y + 18);
          ctx.stroke();
        }
      }
    }

    // Build blue-stone walls only along the actual outline of the connected map.
    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        if (!hasTile(gx, gy)) continue;
        const x = gx * MAP_TILE, y = gy * MAP_TILE;
        const cap = hash(gx + 71, gy + 19) > .5 ? "#435486" : "#384978";
        if (!hasTile(gx, gy - 1)) {
          ctx.fillStyle = "#050815"; ctx.fillRect(x - 2, y - 16, MAP_TILE + 4, 21);
          ctx.fillStyle = "#202c55"; ctx.fillRect(x, y - 13, MAP_TILE, 15);
          ctx.fillStyle = cap; ctx.fillRect(x + 3, y - 11, MAP_TILE - 6, 6);
          ctx.fillStyle = "#6272a5"; ctx.fillRect(x + 5, y - 9, MAP_TILE - 10, 2);
        }
        if (!hasTile(gx, gy + 1)) {
          ctx.fillStyle = "#050815"; ctx.fillRect(x - 2, y + MAP_TILE - 4, MAP_TILE + 4, 20);
          ctx.fillStyle = "#1b274b"; ctx.fillRect(x, y + MAP_TILE - 3, MAP_TILE, 15);
          ctx.fillStyle = cap; ctx.fillRect(x + 3, y + MAP_TILE, MAP_TILE - 6, 6);
        }
        if (!hasTile(gx - 1, gy)) {
          ctx.fillStyle = "#050815"; ctx.fillRect(x - 16, y - 2, 21, MAP_TILE + 4);
          ctx.fillStyle = "#24315a"; ctx.fillRect(x - 13, y, 15, MAP_TILE);
          ctx.fillStyle = cap; ctx.fillRect(x - 10, y + 3, 6, MAP_TILE - 6);
        }
        if (!hasTile(gx + 1, gy)) {
          ctx.fillStyle = "#050815"; ctx.fillRect(x + MAP_TILE - 4, y - 2, 20, MAP_TILE + 4);
          ctx.fillStyle = "#1c294f"; ctx.fillRect(x + MAP_TILE - 3, y, 15, MAP_TILE);
          ctx.fillStyle = cap; ctx.fillRect(x + MAP_TILE, y + 3, 6, MAP_TILE - 6);
        }
      }
    }

    // Central rune makes the main combat room readable at a glance.
    ctx.save();
    ctx.globalAlpha = roomCleared ? .72 : .34;
    ctx.strokeStyle = roomCleared ? "#52e8ff" : "#784eff";
    ctx.lineWidth = 4;
    ctx.translate(WORLD.w / 2, WORLD.h / 2);
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-34, -34, 68, 68);
    ctx.strokeRect(-20, -20, 40, 40);
    ctx.restore();
  }

  function drawDecoration(d) {
    if (d.sprite.startsWith("torch")) {
      const color = d.sprite === "torchFire" ? "rgba(255,116,34,.2)" : d.sprite === "torchBlue" ? "rgba(35,206,255,.2)" : "rgba(177,64,255,.2)";
      const glow = ctx.createRadialGradient(d.x + d.w / 2, d.y + d.h * .35, 2, d.x + d.w / 2, d.y + d.h * .35, 72);
      glow.addColorStop(0, color);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(d.x - 50, d.y - 45, d.w + 100, d.h + 90);
    }
    const pulse = d.sprite.startsWith("torch") ? 1 + Math.sin(gameTime * 7 + d.x) * .025 : 1;
    const w = d.w * pulse, h = d.h * pulse;
    drawDungeonAtlas(d.sprite, d.x + (d.w - w) / 2, d.y + d.h - h, w, h);
  }

  function drawObstacle(o) {
    if (dungeonAtlas.complete && dungeonAtlas.naturalWidth) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, o.y + o.h * .92, o.w * .42, Math.max(8, o.h * .14), 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      if (o.type === "pillar") {
        const w = 88, h = 132;
        drawDungeonAtlas("stoneColumn", o.x + (o.w - w) / 2, o.y + o.h - h + 8, w, h);
      } else if (o.type === "crate") {
        drawDungeonAtlas("woodBarricade", o.x - 3, o.y - 10, o.w + 6, o.h + 22);
      } else {
        drawDungeonAtlas("crystalCluster", o.x - 13, o.y - 8, o.w + 26, o.h + 11);
      }
      return;
    }
    ctx.fillStyle = "rgba(0,0,0,.42)";
    ctx.fillRect(o.x + 10, o.y + 13, o.w, o.h);
    if (o.type === "pillar") {
      ctx.fillStyle = "#0b101e";
      ctx.fillRect(o.x - 6, o.y + 9, o.w + 12, o.h - 9);
      ctx.fillStyle = "#38435d";
      ctx.fillRect(o.x, o.y, o.w, o.h - 12);
      ctx.fillStyle = "#46536e";
      ctx.fillRect(o.x + 9, o.y + 8, o.w - 18, 15);
      ctx.fillStyle = "#20293d";
      ctx.fillRect(o.x + 15, o.y + 30, o.w - 30, o.h - 50);
      ctx.fillStyle = "#12192a";
      ctx.fillRect(o.x - 7, o.y + o.h - 22, o.w + 14, 25);
      ctx.fillStyle = "#31bde8";
      ctx.fillRect(o.x + o.w / 2 - 6, o.y + 44, 12, 24);
    } else if (o.type === "crate") {
      ctx.fillStyle = "#16101a";
      ctx.fillRect(o.x - 4, o.y - 4, o.w + 8, o.h + 8);
      ctx.fillStyle = "#6f3f2d";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = "#a9653c";
      ctx.fillRect(o.x + 7, o.y + 7, o.w - 14, 8);
      ctx.fillStyle = "#40283a";
      ctx.fillRect(o.x + 15, o.y + 22, o.w - 30, o.h - 31);
      ctx.fillStyle = "#d68a45";
      ctx.fillRect(o.x + o.w / 2 - 7, o.y + 18, 14, o.h - 28);
    } else {
      ctx.fillStyle = "#101323";
      ctx.fillRect(o.x + 8, o.y + 24, o.w - 16, o.h - 24);
      ctx.save();
      ctx.translate(o.x + o.w / 2, o.y + o.h / 2 - 4);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#143b60";
      ctx.fillRect(-25, -25, 50, 50);
      ctx.fillStyle = "#2dd5ff";
      ctx.fillRect(-17, -17, 34, 34);
      ctx.fillStyle = "#b4f7ff";
      ctx.fillRect(-11, -12, 9, 16);
      ctx.restore();
    }
  }

  function drawPlayer(target) {
    const angle = target.aimAngle || 0;
    const moving = Math.hypot(target.vx, target.vy) > 30;
    const facingLeft = Math.cos(angle) < 0;
    const bob = moving ? Math.sin(gameTime * 15) * .8 : Math.sin(gameTime * 4) * .55;
    ctx.save();
    ctx.translate(Math.round(target.x), Math.round(target.y));
    if (target.invuln > 0 && Math.floor(target.invuln * 18) % 2 === 0) ctx.globalAlpha = .46;
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.beginPath(); ctx.ellipse(0, 24, 28, 10, 0, 0, TAU); ctx.fill();
    if (network.active) {
      ctx.strokeStyle = PLAYER_COLORS[target.colorIndex % PLAYER_COLORS.length];
      ctx.lineWidth = 3;
      ctx.globalAlpha *= .78;
      ctx.beginPath(); ctx.ellipse(0, 24, 30, 12, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (target.alive === false || state === "gameover") {
      const dead = ARSENAL.heroDown;
      const scale = .55;
      drawArsenal(dead, -dead.ax * scale, -dead.ay * scale, dead.w * scale, dead.h * scale, .88);
      ctx.restore();
      if (network.active) pixelText(target.name || "Рыцарь", target.x, target.y - 48, 11, "#8b96aa", "center");
      return;
    }

    let frame;
    if (target.dashTimer > 0) frame = ARSENAL.heroDash;
    else if (moving) frame = HERO_WALK[Math.floor(gameTime * 11) % HERO_WALK.length];
    else if (Math.sin(angle) < -.72) frame = ARSENAL.heroBack;
    else if (Math.sin(angle) > .72) frame = ARSENAL.heroFront;
    else frame = ARSENAL.heroSide;

    const spriteScale = target.dashTimer > 0 ? .52 : .5;
    ctx.save();
    ctx.scale(facingLeft ? -1 : 1, 1);
    drawArsenal(frame, -frame.ax * spriteScale, -frame.ay * spriteScale + bob, frame.w * spriteScale, frame.h * spriteScale);
    ctx.restore();

    // Every equipped weapon now comes directly from the arsenal atlas.
    if (target.dashTimer <= 0) {
      const weapon = WEAPONS[target.weapon];
      const sprite = ARSENAL[weapon.sprite];
      const gunW = target.weapon === 1 ? 65 : 68;
      const gunH = sprite.h / sprite.w * gunW;
      ctx.save();
      ctx.rotate(angle);
      if (Math.cos(angle) < 0) ctx.scale(1, -1);
      ctx.fillStyle = "#f1a66a";
      ctx.fillRect(9, -2, 10, 8);
      drawArsenal(weapon.sprite, 7, -gunH * .53, gunW, gunH);
      ctx.restore();
    }
    ctx.restore();

    if (target.armor > 0 && target.invuln > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(70,205,255,.65)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(target.x, target.y, 30 + Math.sin(gameTime * 15) * 2, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    if (network.active) pixelText(target.name || "Рыцарь", target.x, target.y - 54, 10, PLAYER_COLORS[target.colorIndex % PLAYER_COLORS.length], "center");
  }

  function drawEnemy(e) {
    const targetPlayer = nearestLivingPlayer(e) || player;
    const a = Math.atan2(targetPlayer.y - e.y, targetPlayer.x - e.x);
    const bob = Math.sin(gameTime * 5 + e.seed) * 2;
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y + bob));
    const spawnScale = e.spawn > 0 ? clamp(1 - e.spawn / .42, 0, 1) : 1;
    ctx.scale(spawnScale, spawnScale);
    ctx.fillStyle = "rgba(0,0,0,.43)";
    ctx.beginPath(); ctx.ellipse(0, e.r * .75, e.r * 1.05, e.r * .38, 0, 0, TAU); ctx.fill();
    if (e.frozen > 0) {
      ctx.strokeStyle = "#8eedff";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, e.r + 5, 0, TAU); ctx.stroke();
    }

    if (e.type === "charger" && e.mode === "telegraph") {
      ctx.strokeStyle = `rgba(255,77,112,${.4 + Math.sin(gameTime * 26) * .25})`;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(e.chargeX * 520, e.chargeY * 520); ctx.stroke();
    }
    if (e.type === "boss") {
      ctx.fillStyle = "rgba(155,42,255,.18)";
      ctx.beginPath(); ctx.arc(0, 0, e.r + 16 + Math.sin(gameTime * 3) * 4, 0, TAU); ctx.fill();
    }

    if (dungeonAtlas.complete && dungeonAtlas.naturalWidth && e.sprite) {
      const sprite = DUNGEON_ATLAS[e.sprite];
      const heightScale = e.type === "boss" ? 2.82 : e.type === "gunner" ? 3 : e.type === "charger" ? 2.85 : e.type === "turret" ? 2.55 : 2.5;
      const h = e.r * heightScale;
      const w = h * sprite.w / sprite.h;
      const flip = e.type !== "boss" && targetPlayer.x < e.x;
      ctx.save();
      if (e.flash > 0) ctx.filter = "brightness(0) invert(1)";
      drawDungeonAtlas(e.sprite, -w / 2, e.r * .8 - h, w, h, 1, flip);
      ctx.restore();
    } else if (e.type === "crawler") {
      ctx.fillStyle = e.flash > 0 ? "#fff" : "#173b26";
      ctx.fillRect(-e.r, -e.r + 5, e.r * 2, e.r * 1.65);
      ctx.fillStyle = e.flash > 0 ? "#fff" : e.color;
      ctx.fillRect(-e.r + 4, -e.r, e.r * 2 - 8, e.r * 1.45);
      ctx.fillRect(-e.r + 7, -e.r - 6, 7, 10);
      ctx.fillRect(e.r - 14, -e.r - 6, 7, 10);
      ctx.fillStyle = "#102018";
      ctx.fillRect(-9, -7, 6, 7); ctx.fillRect(5, -7, 6, 7);
      ctx.fillStyle = "#d9ff96";
      ctx.fillRect(-8, -6, 2, 3); ctx.fillRect(6, -6, 2, 3);
    } else if (e.type === "gunner") {
      ctx.fillStyle = e.flash > 0 ? "#fff" : "#6d2035";
      ctx.fillRect(-20, -21, 40, 40);
      ctx.fillStyle = e.flash > 0 ? "#fff" : e.color;
      ctx.fillRect(-16, -17, 32, 24);
      ctx.fillStyle = "#1b1926";
      ctx.fillRect(-10, -9, 20, 9);
      ctx.fillStyle = "#ffd05d";
      ctx.fillRect(-7, -7, 5, 4); ctx.fillRect(3, -7, 5, 4);
      ctx.rotate(a);
      ctx.fillStyle = "#171a27"; ctx.fillRect(12, -6, 27, 12);
      ctx.fillStyle = "#ff9a52"; ctx.fillRect(20, -3, 17, 6);
    } else if (e.type === "charger") {
      ctx.fillStyle = e.flash > 0 ? "#fff" : "#4a225e";
      ctx.fillRect(-26, -22, 52, 43);
      ctx.fillStyle = e.flash > 0 ? "#fff" : e.color;
      ctx.fillRect(-20, -17, 40, 31);
      ctx.fillRect(-25, -27, 11, 16); ctx.fillRect(14, -27, 11, 16);
      ctx.fillStyle = "#24142e";
      ctx.fillRect(-12, -6, 8, 7); ctx.fillRect(5, -6, 8, 7);
      ctx.fillStyle = "#ffef61";
      ctx.fillRect(-9, -4, 3, 3); ctx.fillRect(7, -4, 3, 3);
    } else if (e.type === "turret") {
      ctx.save(); ctx.rotate(gameTime * .5 + e.seed);
      ctx.fillStyle = e.flash > 0 ? "#fff" : "#583a24";
      for (let n = 0; n < 4; n++) { ctx.rotate(Math.PI / 2); ctx.fillRect(14, -7, 23, 14); }
      ctx.restore();
      ctx.fillStyle = e.flash > 0 ? "#fff" : e.color;
      ctx.fillRect(-21, -21, 42, 42);
      ctx.fillStyle = "#25202a"; ctx.fillRect(-13, -13, 26, 26);
      ctx.fillStyle = "#ff5b52"; ctx.fillRect(-6, -6, 12, 12);
    } else {
      // Procedural fallback if the dungeon atlas cannot be loaded.
      ctx.fillStyle = e.flash > 0 ? "#fff" : "#24172e";
      ctx.fillRect(-52, -45, 104, 91);
      ctx.fillStyle = e.flash > 0 ? "#fff" : "#702742";
      ctx.fillRect(-44, -52, 88, 84);
      ctx.fillRect(-54, 12, 108, 30);
      ctx.fillStyle = "#17121e";
      ctx.fillRect(-33, -33, 66, 53);
      ctx.fillStyle = "#f1e9dc";
      ctx.fillRect(-25, -28, 50, 41);
      ctx.fillStyle = "#241728";
      ctx.fillRect(-16, -13, 10, 12); ctx.fillRect(7, -13, 10, 12); ctx.fillRect(-5, 4, 11, 12);
      ctx.fillStyle = "#e83762";
      ctx.fillRect(-14, -9, 5, 5); ctx.fillRect(10, -9, 5, 5);
      // Crown/horns.
      ctx.fillStyle = "#ef3f63";
      ctx.fillRect(-46, -61, 15, 20); ctx.fillRect(31, -61, 15, 20); ctx.fillRect(-8, -67, 16, 22);
    }
    ctx.restore();

    if (e.type !== "boss" && (e.hp < e.maxHp || e.flash > 0)) {
      const w = e.r * 2.2;
      const heightFactor = e.type === "gunner" ? 2.5 : e.type === "charger" ? 2.35 : e.type === "turret" ? 2.1 : 2.05;
      const barY = e.y - e.r * heightFactor - 8;
      ctx.fillStyle = "#080b12"; ctx.fillRect(e.x - w / 2 - 2, barY, w + 4, 8);
      ctx.fillStyle = "#e94059"; ctx.fillRect(e.x - w / 2, barY + 2, w * clamp(e.hp / e.maxHp, 0, 1), 4);
    }
  }

  function drawBullet(b) {
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    ctx.shadowColor = b.color;
    ctx.shadowBlur = b.team === "enemy" ? 8 : 12;
    if (dungeonAtlas.complete && dungeonAtlas.naturalWidth && b.sprite) {
      const s = DUNGEON_ATLAS[b.sprite];
      const h = b.r * (b.team === "enemy" ? 3.5 : 4.1);
      const w = h * s.w / s.h;
      ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
      drawDungeonAtlas(b.sprite, -w / 2, -h / 2, w, h);
      ctx.restore();
      return;
    }
    ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 4);
    ctx.fillStyle = b.color;
    ctx.fillRect(-b.r, -b.r, b.r * 2, b.r * 2);
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.fillRect(-b.r * .45, -b.r * .45, b.r * .9, b.r * .9);
    ctx.restore();
  }

  function drawPickup(p) {
    const y = p.y + Math.sin(p.bob) * 4;
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(y));
    ctx.shadowBlur = 13;
    if (dungeonAtlas.complete && dungeonAtlas.naturalWidth) {
      const sprite = p.type === "coin" ? "coin" : p.type === "heart" ? "heart" : "energyGem";
      const s = DUNGEON_ATLAS[sprite];
      const h = p.type === "coin" ? 27 : p.type === "heart" ? 29 : 31;
      const w = h * s.w / s.h;
      ctx.shadowColor = p.type === "coin" ? "#ffca37" : p.type === "heart" ? "#ff4059" : "#42d5ff";
      drawDungeonAtlas(sprite, -w / 2, -h / 2, w, h);
      ctx.restore();
      return;
    }
    if (p.type === "coin") {
      ctx.shadowColor = "#ffca37"; ctx.fillStyle = "#8b4d14"; ctx.fillRect(-9, -10, 18, 20);
      ctx.fillStyle = "#ffc934"; ctx.fillRect(-6, -9, 12, 18); ctx.fillStyle = "#fff083"; ctx.fillRect(-3, -6, 4, 9);
    } else if (p.type === "heart") {
      ctx.shadowColor = "#ff4059"; ctx.fillStyle = "#ff4059";
      ctx.fillRect(-11, -7, 22, 12); ctx.fillRect(-7, 4, 14, 7); ctx.fillRect(-4, 11, 8, 4);
      ctx.fillStyle = "#ff9bad"; ctx.fillRect(-6, -5, 5, 4);
    } else {
      ctx.shadowColor = "#42d5ff"; ctx.fillStyle = "#42d5ff";
      ctx.rotate(Math.PI / 4); ctx.fillRect(-9, -9, 18, 18); ctx.fillStyle = "#c0f8ff"; ctx.fillRect(-5, -5, 7, 7);
    }
    ctx.restore();
  }

  function drawWorldEffects() {
    for (const s of shockwaves) {
      ctx.save();
      ctx.globalAlpha = clamp(s.life / s.total, 0, 1);
      ctx.strokeStyle = s.color || "#56e8ff";
      ctx.lineWidth = s.decorative ? 5 : 10;
      ctx.shadowColor = s.color || "#56e8ff";
      ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life / p.total, 0, 1);
      ctx.fillStyle = p.color;
      const size = Math.max(1, Math.round(p.size * p.life / p.total));
      ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
      ctx.restore();
    }
    for (const f of floaters) {
      ctx.save();
      ctx.globalAlpha = clamp(f.life / f.total, 0, 1);
      pixelText(f.text, f.x, f.y, f.big ? 18 : 14, f.color, "center");
      ctx.restore();
    }
  }

  function drawDungeon() {
    const sx = camera.shake > 0 ? rand(-camera.shake, camera.shake) : 0;
    const sy = camera.shake > 0 ? rand(-camera.shake, camera.shake) : 0;
    ctx.save();
    ctx.translate(Math.round(-camera.x + sx), Math.round(-camera.y + sy));
    drawFloor();
    for (const d of decorations) drawDecoration(d);
    for (const o of obstacles) drawObstacle(o);
    for (const p of pickups) drawPickup(p);
    for (const b of bullets) drawBullet(b);
    const sorted = [
      ...enemies.map((entity) => ({ entity, player: false, y: entity.y })),
      ...allPlayers().map((entity) => ({ entity, player: true, y: entity.y }))
    ].sort((a, b) => a.y - b.y);
    for (const item of sorted) item.player ? drawPlayer(item.entity) : drawEnemy(item.entity);
    drawWorldEffects();
    ctx.restore();

    // Subtle playable-area lighting.
    const px = player.x - camera.x;
    const py = player.y - camera.y;
    const grad = ctx.createRadialGradient(px, py, 120, px, py, 560);
    grad.addColorStop(0, "rgba(7,12,25,0)");
    grad.addColorStop(1, "rgba(2,4,10,.3)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------------------------------------------------------------------------
  // Rendering: HUD and screens
  // ---------------------------------------------------------------------------
  function drawBar(x, y, w, h, value, max, color, icon, label) {
    ctx.fillStyle = "rgba(4,7,13,.88)";
    pathRoundRect(x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = "#080a10"; ctx.lineWidth = 4; ctx.stroke();
    const ratio = clamp(value / max, 0, 1);
    if (ratio > 0) {
      const grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color === "#ed3d52" ? "#ff6167" : color === "#249ddd" ? "#41cfff" : "#ffcf44");
      ctx.fillStyle = grad;
      pathRoundRect(x + 4, y + 4, Math.max(2, (w - 8) * ratio), h - 8, 3); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.25)";
      ctx.fillRect(x + 8, y + 6, Math.max(0, (w - 16) * ratio), 3);
    }
    pixelText(icon, x + 13, y + h / 2 + 1, 16, "#fff", "center");
    pixelText(`${label}  ${Math.ceil(value)} / ${max}`, x + w / 2 + 9, y + h / 2 + 1, 13, "#fff", "center");
  }

  function updateMobileHudDom() {
    if (!player) return;
    const ratio = (value, max) => `${clamp(value / Math.max(1, max), 0, 1) * 100}%`;
    $("mobileHpFill").style.width = ratio(player.hp, player.maxHp);
    $("mobileArmorFill").style.width = ratio(player.armor, player.maxArmor);
    $("mobileEnergyFill").style.width = ratio(player.energy, player.maxEnergy);
    $("mobileHpText").textContent = `HP ${Math.ceil(player.hp)} / ${player.maxHp}`;
    $("mobileArmorText").textContent = `ЩИТ ${Math.ceil(player.armor)} / ${player.maxArmor}`;
    $("mobileEnergyText").textContent = `ЭНЕРГИЯ ${Math.ceil(player.energy)} / ${player.maxEnergy}`;
    $("mobileWave").textContent = wave === 5 ? "БОСС" : `ВОЛНА ${wave} / 5`;
    const boss = enemies.find((e) => e.type === "boss");
    $("mobileTargets").textContent = boss ? `СТРАЖ: ${Math.ceil(boss.hp / boss.maxHp * 100)}%` : roomCleared ? "ЗАЧИЩЕНО" : `ЦЕЛЕЙ: ${enemies.length + spawnQueue.length}`;
    $("mobileCoins").textContent = `● ${coins}`;
  }

  function drawHUD() {
    if (isPortraitTouch()) {
      updateMobileHudDom();
      return;
    }
    // Player portrait and vitals use the supplied transparent atlas.
    panel(16, 15, 92, 91, "rgba(14,18,31,.94)", "#515d75");
    drawAtlas("portrait", 19, 18, 86, 82);
    drawBar(116, 17, 256, 27, player.hp, player.maxHp, "#ed3d52", "♥", "HP");
    drawBar(116, 49, 256, 25, player.armor, player.maxArmor, "#249ddd", "◆", "ЩИТ");
    drawBar(116, 79, 256, 23, player.energy, player.maxEnergy, "#e69d1c", "ϟ", "ЭНЕРГИЯ");

    // Wave counter.
    panel(W / 2 - 104, 16, 208, 58, "rgba(8,12,23,.94)", wave === 5 ? "#923149" : "#304d77");
    pixelText(wave === 5 ? "БОСС" : `ВОЛНА ${wave} / 5`, W / 2, 37, 19, wave === 5 ? "#ff536d" : "#f5f8ff", "center");
    const remain = enemies.length + spawnQueue.length;
    ctx.fillStyle = "#8996aa";
    ctx.font = "700 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(roomCleared ? "КОМНАТА ЗАЧИЩЕНА" : `ЦЕЛЕЙ: ${remain}`, W / 2, 62);

    // Currency and score.
    uiRects.pause = { x: W - 282, y: 16, w: 40, h: 49 };
    panel(uiRects.pause.x, uiRects.pause.y, uiRects.pause.w, uiRects.pause.h, "rgba(8,12,23,.94)");
    pixelText("Ⅱ", uiRects.pause.x + 20, uiRects.pause.y + 25, 17, "#aebbd0", "center");
    panel(W - 233, 16, 217, 49, "rgba(8,12,23,.94)");
    drawAtlas("coin", W - 227, 18, 44, 42);
    pixelText(String(coins), W - 174, 41, 17, "#ffd24d", "left");
    ctx.fillStyle = "#374159"; ctx.fillRect(W - 125, 24, 2, 31);
    pixelText(score.toLocaleString("ru-RU"), W - 112, 41, 15, "#eef4ff", "left");

    // Tiny map based on the actual world rather than a decorative static image.
    const mx = W - 150, my = 78, mw = 134, mh = 91;
    panel(mx, my, mw, mh, "rgba(7,11,20,.88)");
    ctx.fillStyle = "#050914"; ctx.fillRect(mx + 10, my + 10, mw - 20, mh - 20);
    const rx = (v) => mx + 10 + v / WORLD.w * (mw - 20);
    const ry = (v) => my + 10 + v / WORLD.h * (mh - 20);
    ctx.fillStyle = "#24345a";
    for (const z of FLOOR_ZONES) ctx.fillRect(rx(z.x), ry(z.y), Math.max(1, z.w / WORLD.w * (mw - 20)), Math.max(1, z.h / WORLD.h * (mh - 20)));
    ctx.fillStyle = "#3a4b64";
    for (const o of obstacles) ctx.fillRect(rx(o.x), ry(o.y), Math.max(3, o.w / WORLD.w * (mw - 20)), Math.max(3, o.h / WORLD.h * (mh - 20)));
    ctx.fillStyle = "#f0445c";
    for (const e of enemies) ctx.fillRect(rx(e.x) - 1, ry(e.y) - 1, e.type === "boss" ? 5 : 3, e.type === "boss" ? 5 : 3);
    for (const member of allPlayers()) {
      ctx.fillStyle = PLAYER_COLORS[member.colorIndex % PLAYER_COLORS.length];
      ctx.fillRect(rx(member.x) - 2, ry(member.y) - 2, 5, 5);
    }

    // Weapons at the bottom.
    const slotW = 76, gap = 9, total = slotW * 3 + gap * 2;
    const sx = W / 2 - total / 2;
    uiRects.weapons = [];
    WEAPONS.forEach((w, i) => {
      const x = sx + i * (slotW + gap), y = H - 84;
      uiRects.weapons.push({ x, y, w: slotW, h: 68 });
      panel(x, y, slotW, 68, i === player.weapon ? "rgba(31,53,75,.96)" : "rgba(8,11,20,.85)", i === player.weapon ? w.color : "#333c50");
      drawArsenalFit(w.sprite, x + 7, y + 8, 62, 48, i === player.weapon ? 1 : .48);
      ctx.fillStyle = i === player.weapon ? w.color : "#697489";
      ctx.fillRect(x + 5, y + 5, 17, 16);
      pixelText(String(i + 1), x + 13, y + 13, 10, "#fff", "center");
    });

    // Ability icons from the provided atlas.
    drawSkillButton("dash", W - 174, H - 89, 67, player.dashCd, player.dashMax, "SPACE");
    drawSkillButton("pulse", W - 95, H - 96, 76, player.pulseCd, player.pulseMax, "Q");

    if (wave === 5) {
      const boss = enemies.find((e) => e.type === "boss");
      if (boss) {
        const bw = 520, bx = W / 2 - bw / 2, by = 88;
        panel(bx, by, bw, 37, "rgba(10,7,15,.92)", "#76243c");
        ctx.fillStyle = "#2b1421"; ctx.fillRect(bx + 9, by + 19, bw - 18, 9);
        ctx.fillStyle = "#ef3f63"; ctx.fillRect(bx + 9, by + 19, (bw - 18) * clamp(boss.hp / boss.maxHp, 0, 1), 9);
        pixelText("СТРАЖ ПУСТОТЫ", W / 2, by + 12, 12, "#ff8496", "center");
      }
    }

    if (!isTouch) drawCrosshair();

    if (waveBanner > 0) {
      const t = clamp(waveBanner / 2.3, 0, 1);
      const alpha = Math.min(1, (1 - t) * 5, t * 3);
      ctx.save(); ctx.globalAlpha = alpha;
      pixelText(wave === 5 ? "ФИНАЛЬНАЯ ВОЛНА" : `ВОЛНА ${wave}`, W / 2, H * .29, 40, wave === 5 ? "#ff4564" : "#f5f8ff", "center");
      pixelText(wave === 5 ? "СТРАЖ ПРОБУДИЛСЯ" : "ЗАЧИСТИ КОМНАТУ", W / 2, H * .29 + 45, 14, "#7fcfff", "center");
      ctx.restore();
    }
  }

  function drawSkillButton(icon, x, y, size, cooldown, max, key) {
    drawAtlas(icon, x, y, size, size, cooldown > 0 ? .65 : 1);
    if (cooldown > 0) {
      const ratio = clamp(cooldown / max, 0, 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y + size * (1 - ratio), size, size * ratio); ctx.clip();
      ctx.fillStyle = "rgba(4,7,14,.7)"; ctx.fillRect(x, y, size, size);
      ctx.restore();
      pixelText(cooldown.toFixed(1), x + size / 2, y + size / 2, 13, "#fff", "center");
    }
    if (!isTouch) {
      ctx.fillStyle = "#101521"; ctx.fillRect(x - 1, y + size - 17, key.length > 1 ? 42 : 20, 17);
      pixelText(key, x + (key.length > 1 ? 20 : 9), y + size - 9, 9, "#ccd7e8", "center");
    }
  }

  function drawTouchControls() {
    const move = input.moveTouch;
    const aim = input.aimTouch;
    const leftX = move ? move.sx : 105;
    const leftY = move ? move.sy : H - 105;
    drawAtlas("joystick", leftX - 75, leftY - 75, 150, 150, .48);
    if (move) {
      const dx = clamp(move.x - move.sx, -45, 45), dy = clamp(move.y - move.sy, -45, 45);
      ctx.fillStyle = "rgba(210,225,255,.42)"; ctx.beginPath(); ctx.arc(leftX + dx, leftY + dy, 25, 0, TAU); ctx.fill();
    }
    const rightX = aim ? aim.sx : W - 105;
    const rightY = aim ? aim.sy : H - 105;
    drawAtlas("aimstick", rightX - 62, rightY - 62, 124, 124, .46);
    drawAtlas("dash", W - 142, H - 282, 74, 76, .7);
    drawAtlas("pulse", W - 260, H - 260, 82, 84, .7);
  }

  function drawCrosshair() {
    const x = input.mouse.x, y = input.mouse.y;
    const hot = enemies.some((e) => Math.hypot(e.x - (x + camera.x), e.y - (y + camera.y)) < e.r + 12);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.strokeStyle = hot ? "#ff5163" : "#eaf7ff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, hot ? 9 : 11, 0, TAU); ctx.stroke();
    ctx.fillStyle = hot ? "#ff5163" : "#64dbff";
    ctx.fillRect(-1, -1, 3, 3);
    ctx.fillRect(-18, -1, 6, 2); ctx.fillRect(12, -1, 6, 2);
    ctx.fillRect(-1, -18, 2, 6); ctx.fillRect(-1, 12, 2, 6);
    ctx.restore();
  }

  function drawOverlayBackdrop() {
    ctx.fillStyle = "rgba(3,5,11,.72)";
    ctx.fillRect(0, 0, W, H);
  }

  function drawPause() {
    drawOverlayBackdrop();
    const scale = 1.08, w = ATLAS.pause.w * scale, h = ATLAS.pause.h * scale;
    const x = W / 2 - w / 2, y = H / 2 - h / 2;
    drawAtlas("pause", x, y, w, h);
    uiRects = {
      resume: { x: x + 29 * scale, y: y + 113 * scale, w: 221 * scale, h: 60 * scale },
      sound: { x: x + 29 * scale, y: y + 180 * scale, w: 221 * scale, h: 55 * scale },
      menu: { x: x + 29 * scale, y: y + 242 * scale, w: 221 * scale, h: 55 * scale },
      quit: { x: x + 29 * scale, y: y + 302 * scale, w: 221 * scale, h: 58 * scale }
    };
    // Clarify that the atlas' SETTINGS button controls audio in this build.
    ctx.fillStyle = "#99a7bd"; ctx.font = "700 10px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(muted ? "ЗВУК ВЫКЛЮЧЕН" : "ЗВУК ВКЛЮЧЕН", W / 2, y + 237 * scale);
  }

  function drawGameOver() {
    drawOverlayBackdrop();
    const scale = 1.17, w = ATLAS.defeat.w * scale, h = ATLAS.defeat.h * scale;
    const x = W / 2 - w / 2, y = H / 2 - h / 2 - 14;
    drawAtlas("defeat", x, y, w, h);
    uiRects = { retry: { x: x + 62 * scale, y: y + 233 * scale, w: 220 * scale, h: 72 * scale } };
    panel(W / 2 - 175, y + h + 4, 350, 51, "rgba(8,11,20,.94)");
    pixelText(`СЧЁТ ${score.toLocaleString("ru-RU")}  ·  УБИТО ${kills}`, W / 2, y + h + 29, 14, "#dce7f6", "center");
  }

  function drawVictory() {
    drawOverlayBackdrop();
    const scale = 1.12, w = ATLAS.victory.w * scale, h = ATLAS.victory.h * scale;
    const x = W / 2 - w / 2, y = H / 2 - h / 2 - 12;
    drawAtlas("victory", x, y, w, h);
    uiRects = { continue: { x: x + 67 * scale, y: y + 264 * scale, w: 252 * scale, h: 70 * scale } };
    panel(W / 2 - 205, y + h + 2, 410, 52, "rgba(8,11,20,.95)", "#314968");
    pixelText(`СЧЁТ ${score.toLocaleString("ru-RU")}  ·  ВРЕМЯ ${formatTime(runTime)}`, W / 2, y + h + 28, 14, "#ffe06a", "center");
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function drawMenuBackground() {
    if (menuArt.complete && menuArt.naturalWidth) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(menuArt, 0, 0, W, H);
      ctx.restore();
      return;
    }

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#070a12"); g.addColorStop(.58, "#10182a"); g.addColorStop(1, "#0a1830");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const tile = 64;
    for (let y = 0; y < H; y += tile) {
      for (let x = 0; x < W; x += tile) {
        const h = hash(x / tile, y / tile);
        ctx.fillStyle = h > .5 ? "rgba(48,66,96,.12)" : "rgba(10,13,23,.12)";
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        if (h > .9) { ctx.fillStyle = "rgba(60,197,255,.15)"; ctx.fillRect(x + 15, y + 17, 4, 4); }
      }
    }
    // Animated portal behind the menu card.
    const px = W * .74, py = H * .5;
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(45,190,255,${.13 - i * .018})`;
      ctx.lineWidth = 8 - i;
      ctx.beginPath();
      ctx.ellipse(px, py, 105 + i * 18 + Math.sin(gameTime * 2 + i) * 5, 180 + i * 14, 0, 0, TAU);
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(px, py, 20, px, py, 260);
    glow.addColorStop(0, "rgba(35,184,255,.25)"); glow.addColorStop(1, "rgba(20,90,170,0)");
    ctx.fillStyle = glow; ctx.fillRect(px - 280, py - 280, 560, 560);
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4 + gameTime * (.15 + (i % 3) * .04);
      const r = 80 + (i * 37) % 260;
      const x = px + Math.cos(a) * r, y = py + Math.sin(a * .8) * r * .75;
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,74,93,.38)" : "rgba(69,207,255,.42)";
      ctx.fillRect(x, y, i % 4 === 0 ? 5 : 3, i % 4 === 0 ? 5 : 3);
    }
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (state === "loading" || state === "menu") drawMenuBackground();
    else {
      ctx.fillStyle = "#070a12"; ctx.fillRect(0, 0, W, H);
      if (player) {
        drawDungeon();
        drawHUD();
      }
      if (state === "paused") drawPause();
      if (state === "gameover") drawGameOver();
      if (state === "victory") drawVictory();
      if (state === "upgrade") {
        ctx.fillStyle = "rgba(3,5,11,.5)"; ctx.fillRect(0, 0, W, H);
      }
    }
  }

  function loop(now) {
    const dt = Math.min(.033, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------------------
  // DOM controls and loading
  // ---------------------------------------------------------------------------
  function startSoloRun() {
    if (network.roomCode) leaveNetworkRoom();
    network.active = false;
    requestMobileFullscreen(false);
    startRun(false);
  }

  $("startBtn").addEventListener("click", startSoloRun);
  $("howStartBtn").addEventListener("click", startSoloRun);
  $("howBtn").addEventListener("click", () => showScreen("how", true));
  $("closeHowBtn").addEventListener("click", () => showScreen("how", false));
  $("multiplayerBtn").addEventListener("click", () => {
    setNetworkError();
    renderNetworkRoom();
    showScreen("multiplayer", true);
    $(network.roomCode ? "startNetworkBtn" : "playerName").focus();
  });
  $("closeMultiplayerBtn").addEventListener("click", () => showScreen("multiplayer", false));
  $("createRoomBtn").addEventListener("click", requestCreateRoom);
  $("joinRoomBtn").addEventListener("click", requestJoinRoom);
  $("roomCodeInput").addEventListener("input", () => {
    $("roomCodeInput").value = $("roomCodeInput").value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
  });
  $("roomCodeInput").addEventListener("keydown", (ev) => { if (ev.key === "Enter") requestJoinRoom(); });
  $("playerName").addEventListener("keydown", (ev) => { if (ev.key === "Enter") requestCreateRoom(); });
  $("startNetworkBtn").addEventListener("click", () => {
    if (network.isHost && network.roster.length >= 2) networkSend({ type: "start" });
  });
  $("leaveRoomBtn").addEventListener("click", leaveNetworkRoom);
  $("copyRoomCodeBtn").addEventListener("click", async () => {
    if (!network.roomCode) return;
    const url = new URL(location.href);
    url.searchParams.set("room", network.roomCode);
    const text = `${network.roomCode}\n${url}`;
    try {
      await navigator.clipboard.writeText(text);
      toast("КОД И ССЫЛКА СКОПИРОВАНЫ", 1.2);
    } catch (_) {
      toast(`КОД: ${network.roomCode}`, 2);
    }
  });
  $("fullscreenBtn").addEventListener("click", toggleFullscreen);

  function toggleAudio() {
    audio.init();
    muted = audio.toggle();
    $("muteBtn").textContent = muted ? "×" : "♪";
    $("settingsBtn").setAttribute("aria-label", muted ? "Включить звук" : "Выключить звук");
    toast(muted ? "ЗВУК ВЫКЛЮЧЕН" : "ЗВУК ВКЛЮЧЕН", .8);
  }

  $("settingsBtn").addEventListener("click", toggleAudio);
  $("exitBtn").addEventListener("click", () => toast("ЧТОБЫ ВЫЙТИ, ЗАКРОЙ ВКЛАДКУ", 2));
  $("muteBtn").addEventListener("click", toggleAudio);

  let loadingFinished = false;
  const settledAssets = new Set();
  let assetFailed = false;
  function finishLoading() {
    if (loadingFinished) return;
    loadingFinished = true;
    $("loadingBar").style.width = "100%";
    $("loadingText").textContent = "Готово!";
    setTimeout(() => {
      showScreen("loading", false);
      showScreen("menu", true);
      state = "menu";
      syncAppMode();
      if (linkedRoom) showScreen("multiplayer", true);
    }, 420);
  }

  function settleAsset(image, label, ok) {
    if (settledAssets.has(image)) return;
    settledAssets.add(image);
    if (!ok) assetFailed = true;
    $("loadingBar").style.width = `${12 + settledAssets.size / loadingAssets.length * 88}%`;
    $("loadingText").textContent = assetFailed ? "Часть графики недоступна — включаем резервный режим" : `Готовим ${label}…`;
    if (settledAssets.size === loadingAssets.length) finishLoading();
  }

  const loadingAssets = [
    [atlas, "интерфейс"],
    [arsenal, "анимации героя"],
    [menuArt, "главное меню"],
    [dungeonAtlas, "монстров и артефакты"]
  ];
  loadingAssets.forEach(([image, label]) => {
    if (image.complete) settleAsset(image, label, image.naturalWidth > 0);
    else {
      image.addEventListener("load", () => settleAsset(image, label, true), { once: true });
      image.addEventListener("error", () => settleAsset(image, label, false), { once: true });
    }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}), { once: true });
  }

  requestAnimationFrame(loop);
})();
