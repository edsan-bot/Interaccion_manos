// sketch.js — Ciclo principal de p5.js (espec. §5, §8, §13)
// Orquesta cámara, detección de manos, lógica de juego y renderizado.
// CONFIG centralizada (espec. §7 y §14.8 del spec.md)

const CONFIG = {
  // Canvas / cámara
  canvasW: 640,
  canvasH: 480,
  // Detección de manos (ml5 HandPose)
  maxHands: 1,
  modelType: 'lite',
  flipHorizontal: true,
  smoothingAlpha: 0.4,
  minCutSpeed: 130,        // px/s: mínimo para contar como corte (evita cortar quieto)
  noHandPauseMs: 1200,     // ms sin mano → pausa automática
  // Frutas y física
  gravity: 0.38,
  spawnSpeedBase: 7.5,
  spawnSpeedMax: 12,
  spawnInterval: 750,
  spawnIntervalMin: 330,
  maxFruits: 9,
  missGraceMs: 700,
  // Dificultad
  difficultyEveryCuts: 12,
  difficultySpeedStep: 1.5,
  difficultySpawnStep: 0.88,
  // Vidas y puntuación (espec. §15)
  maxLives: 3,
  pointsFruit: 100,
  pointsGolden: 300,
  streakThreshold: 5,
  streakBonus: 250,
  // Probabilidades de tipo de objeto (espec. §15)
  probBomb: 0.07,
  probGolden: 0.05,
  probHeart: 0.04,
  // Partículas (espec. §10)
  maxParticles: 240,
  particleLifeFrames: 42
};

let cnv;
let game;
let knife = {
  x: 0,
  y: 0,
  prev: { x: 0, y: 0 },
  angle: 0,
  speed: 0,
  active: false,
  trail: []
};
let lastRaw = null;

function setup() {
  cnv = createCanvas(CONFIG.canvasW, CONFIG.canvasH);
  cnv.parent('sketch-container');
  pixelDensity(1);
  textAlign(CENTER, CENTER);

  initCamera();
  initHandPose();

  fruits = new FruitSystem();
  particles = new ParticleSystem();
  fruits.particles = particles;
  game = new Game();
  game.particles = particles;

  // Diagnóstico de cámara si no responde (espec. §10, §14.7)
  let cameraWarned = false;
  setInterval(() => {
    if (cameraWarned) return;
    if (!videoReady && !modelError) {
      updateStatus('Esperando permiso de cámara… (concedelo en el navegador)');
      cameraWarned = true;
    }
  }, 3000);
}

function updateStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

function draw() {
  background(10, 13, 28);

  // Pantallas de carga / error antes de poder jugar
  if (!cameraIsReady()) {
    if (modelError) {
      drawStatus('No se pudo cargar el modelo de manos.');
    } else if (!videoReady) {
      drawStatus('Esperando acceso a la cámara…');
    } else {
      drawStatus('Iniciando cámara…');
    }
    return;
  }

  // Fondo: vídeo de la cámara espejado (modo selfie, espec. §8)
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();
  fill(0, 0, 0, 115);
  rect(0, 0, width, height);

  // Actualiza el cuchillo desde la detección gestual
  updateKnifeFromRaw();

  // Lógica de juego
  game.update();

  // Mundo
  fruits.draw();
  particles.draw();

  // Cuchillo y estela
  drawKnife();

  // Pausa automática si la mano sale del encuadre (espec. §4, §15)
  updateNoHandPause();

  // Mantener la detección activa mientras se juega
  if (game.state === 'PLAYING' && handPoseModel && !handPoseModel.detecting) {
    startDetection();
  }

  // HUD / pantallas de estado
  if (game.state === 'PLAYING') {
    game.drawHUD();
  } else if (game.state === 'START') {
    game.drawStart();
  } else if (game.state === 'GAMEOVER') {
    game.drawGameOver();
  } else if (game.state === 'PAUSED') {
    game.drawPaused();
  }
}

function drawStatus(msg) {
  fill(255);
  textSize(16);
  text(msg, width / 2, height / 2);
}

// ---------- Cuchillo: suavizado, estela y dirección (espec. §5, §14.5) ----------

function updateKnifeFromRaw() {
  const now = millis();
  const found = rawTip && rawTip.found && now - rawTip.t < 600;
  knife.active = found;

  if (!found) {
    knife.prev = { x: knife.x, y: knife.y };
    return;
  }

  const vc = videoToCanvas(rawTip.x, rawTip.y);
  const raw = { x: vc.x, y: vc.y, t: now };

  // Velocidad y dirección se calculan sobre la posición CRUDA (sin suavizar),
  // para que los movimientos rápidos no se escondan al detectar cortes.
  if (lastRaw) {
    const dt = max(now - lastRaw.t, 1);
    knife.speed = dist(raw.x, raw.y, lastRaw.x, lastRaw.y) / dt * 1000;
    knife.angle = atan2(raw.y - lastRaw.y, raw.x - lastRaw.x);
  }
  lastRaw = raw;

  // Posición anterior (suavizada) antes de sobrescribirla → segmento de corte
  knife.prev = { x: knife.x, y: knife.y };

  // EMA: menos vibración, a cambio de algo de latencia (ajustable en CONFIG)
  const a = CONFIG.smoothingAlpha;
  knife.x += a * (raw.x - knife.x);
  knife.y += a * (raw.y - knife.y);

  knife.trail.push({ x: knife.x, y: knife.y, t: now });
  while (knife.trail.length > 0 && now - knife.trail[0].t > 260) {
    knife.trail.shift();
  }
}

function drawKnife() {
  if (!knife.active) return;

  // Estela luminosa
  for (let i = 1; i < knife.trail.length; i++) {
    const a = knife.trail[i - 1];
    const b = knife.trail[i];
    const alpha = (255 * (i / (knife.trail.length - 1))) * 0.75;
    const w = 5 * (i / knife.trail.length) + 1;
    stroke(170, 215, 255, alpha);
    strokeWeight(w);
    line(a.x, a.y, b.x, b.y);
  }

  // Punta del cuchillo
  noStroke();
  fill(255, 255, 255, 230);
  circle(knife.x, knife.y, 7);

  // Hoja orientada en la dirección del movimiento
  push();
  translate(knife.x, knife.y);
  rotate(knife.angle + HALF_PI);
  fill(200, 215, 255, 225);
  triangle(-9, 14, 9, 14, 0, -34);
  fill(255, 255, 255, 170);
  triangle(-3, 8, 3, 8, 0, -18);
  pop();
}

// ---------- Pausa por falta de mano ----------

function updateNoHandPause() {
  if (game.state !== 'PLAYING') return;
  const now = millis();
  const found = rawTip && rawTip.found && now - rawTip.t < 600;

  if (!found) {
    if (!game.noHandSince) game.noHandSince = now;
    else if (now - game.noHandSince > CONFIG.noHandPauseMs) {
      game.state = 'PAUSED';
      stopDetection();
    }
  } else {
    game.noHandSince = null;
    if (game.state === 'PAUSED') {
      game.state = 'PLAYING';
    }
  }
}

// ---------- Entrada (ratón solo como conveniencia para menús) ----------

function mousePressed() {
  if (game.state === 'START' && game.startBtn && insideRect(mouseX, mouseY, game.startBtn)) {
    game.start();
  }
  if (game.state === 'GAMEOVER' && game.restartBtn && insideRect(mouseX, mouseY, game.restartBtn)) {
    game.start();
  }
}

function insideRect(x, y, b) {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

function keyPressed() {
  if (key === ' ' || keyCode === 13) {
    if (game.state === 'START' || game.state === 'GAMEOVER') game.start();
  }
}
