// sketch.js — Pintar en el aire con el dedo índice
// p5.js 2.3.2 + ml5.js 1.4.0 (handPose)
// Gestos: el dedo índice pinta y el puño borra.

// --- Configuración ---
const CAM_W = 640; // ancho de captura
const CAM_H = 480; // alto de captura
const SMOOTH = 0.35; // suavizado de la posición (0.3–0.4)
const WIDTH_SMOOTH = 0.15; // suavizado del grosor
const BRUSH_MIN = 4; // grosor con movimiento rápido
const BRUSH_MAX = 16; // grosor con movimiento lento (2x el original)
const MAX_JUMP = 300; // salto mayor = se corta el trazo
const PAINT_NOTE_MS = 380; // repetición de la nota mientras se pinta
const HAND_TIMEOUT = 500; // sin detección por este tiempo = sin mano

const FIST_MS = 1000; // tiempo de puño para borrar
const MAX_SPEED = 1400; // px/s que corresponden al color más cálido
const SPEED_TAU = 120; // constante de tiempo del suavizado de velocidad (ms)
const MAX_SPARKS = 60; // partículas reutilizadas
const SPARK_LIFE = 900; // vida de una chispa (ms)

// Gradiente frío → cálido (lento → rápido)
const COLOR_STOPS = [
  "#7c3aed", // violeta
  "#3b82f6", // azul
  "#22c55e", // verde
  "#facc15", // amarillo
  "#fb923c", // naranja
  "#ef4444", // rojo
];

// Una nota por rango de velocidad (frío → cálido)
const NOTE_FREQS = [261.63, 293.66, 329.63, 392.0, 440.0]; // do re mi sol la

// --- Estado ---
let started = false;
let video = null;
let cameraReady = false;
let handPose = null;
let modelReady = false;
let hands = [];
let lastHandTime = 0;
let errorMsg = "";

let layer; // lienzo donde queda el trazo
let smooth = null; // posición suavizada de la punta
let strokeActive = false; // hay un trazo en curso
let prevPoint = null; // último punto suavizado del trazo
let prevMid = null; // punto medio anterior de la curva
let widthSmooth = BRUSH_MAX; // grosor suavizado

let stopColors = []; // COLOR_STOPS como p5.Color
let speed = 0; // velocidad suavizada 0..1
let lastRaw = null; // última posición cruda
let lastMoveTime = 0;

let lastNote = -1;
let lastNoteTime = 0;

let fistStart = 0; // inicio del puño
let fistCleared = false; // ya se borró en este puño

let sparks = [];
let sparkCursor = 0;

let audioCtx = null;

// --- p5 ---
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  prepLayer();
  initSparks();

  stopColors = COLOR_STOPS.map((c) => color(c));

  document
    .getElementById("start-btn")
    .addEventListener("click", startExperience);
}

function draw() {
  background(8);

  if (!started) return; // la pantalla de inicio cubre todo

  if (video && video.elt && video.elt.readyState >= 2) drawCamera();
  if (layer) image(layer, 0, 0, width, height);

  if (errorMsg) {
    drawMessage(errorMsg);
    return;
  }
  if (!cameraReady) {
    drawMessage("Iniciando cámara…");
    return;
  }
  if (!modelReady) {
    drawMessage("Cargando modelo…");
    return;
  }

  const hand = readHand();

  // Puño real: ningún dedo extendido (señalar con el índice no borra)
  const isFist = hand ? hand.extended === 0 : false;
  updateFist(isFist);

  updateSpeed(hand ? hand.tip : null);

  // Se pinta con el dedo apenas hay mano (el puño no pinta: borra)
  const painting = !!hand && !isFist;
  drawBrush(hand, painting);
  drawSparks();
  drawHint();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  prepLayer();
  smooth = null;
  strokeActive = false;
  prevPoint = null;
  prevMid = null;
  lastRaw = null;
  speed = 0;
}

// Crea/recrea el lienzo del trazo (fondo transparente)
function prepLayer() {
  layer = createGraphics(width, height);
  layer.clear();
  layer.strokeCap(ROUND);
  layer.strokeJoin(ROUND);
}

// Tecla C: borra el lienzo
function keyPressed() {
  if (key === "c" || key === "C" || keyCode === 67) {
    layer.clear();
  }
}

// --- Inicio de la experiencia ---
async function startExperience() {
  if (started) return;
  started = true;

  initAudio(); // debe ocurrir dentro del clic para habilitar el sonido
  document.getElementById("start-screen").classList.add("hidden");

  try {
    await initCamera();
    await initModel();
    startDetection();
  } catch (err) {
    errorMsg = "No se pudo iniciar la cámara o el modelo.";
    console.error(err);
  }
}

// --- Cámara ---
async function initCamera() {
  // p5 2.x: primer argumento = constraints, sin micrófono
  let capture = createCapture({
    video: { width: CAM_W, height: CAM_H },
    audio: false,
  });
  // Por compatibilidad, si p5 devolviera una promesa
  if (capture && typeof capture.then === "function") capture = await capture;

  video = capture;
  video.size(CAM_W, CAM_H);
  video.hide();

  const elt = video.elt;
  elt.muted = true;
  elt.setAttribute("playsinline", "");

  // Esperar a que el video tenga dimensiones
  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    if (elt.videoWidth > 0) return finish();
    elt.addEventListener("loadedmetadata", finish, { once: true });
    setTimeout(finish, 8000); // respaldo
  });

  const play = elt.play();
  if (play && typeof play.catch === "function") await play.catch(() => {});

  // Si no hay imagen, la cámara no está disponible
  if (!elt.videoWidth) throw new Error("No se pudo acceder a la cámara");

  cameraReady = true;
}

// --- Modelo de manos ---
async function initModel() {
  if (typeof ml5 === "undefined") {
    throw new Error("ml5 no está disponible");
  }
  // ml5 1.4.0: la fábrica puede devolver una promesa
  handPose = await ml5.handPose({ maxHands: 1, modelType: "lite" });
  if (handPose && handPose.ready) await handPose.ready;
  modelReady = true;
}

function startDetection() {
  if (!handPose || !video) return;
  try {
    // El ejemplo oficial de ml5 pasa el elemento de p5 directamente
    handPose.detectStart(video, (results) => {
      hands = results || [];
      if (hands.length > 0) lastHandTime = millis();
    });
  } catch (err) {
    errorMsg = "No se pudo iniciar la detección de manos.";
    console.error(err);
  }
}

// --- Mano y gestos ---
// Devuelve los datos de la mano en coordenadas del canvas, o null
function readHand() {
  if (!modelReady || hands.length === 0) return null;
  if (millis() - lastHandTime > HAND_TIMEOUT) return null;

  const h = hands[0];
  const idx = h.index_finger_tip;
  if (!idx) return null;

  return {
    tip: toCanvas(idx.x, idx.y),
    extended: extendedFingers(h),
  };
}

// Cuenta dedos extendidos (índice, medio, anular y meñique)
function extendedFingers(h) {
  const wrist = h.wrist;
  if (!wrist) return 4;

  const pairs = [
    ["index_finger_tip", "index_finger_pip"],
    ["middle_finger_tip", "middle_finger_pip"],
    ["ring_finger_tip", "ring_finger_pip"],
    ["pinky_tip", "pinky_pip"],
  ];

  let valid = 0;
  let extended = 0;
  for (const [tipName, pipName] of pairs) {
    const tip = h[tipName];
    const pip = h[pipName];
    if (!tip || !pip) continue;
    valid++;
    const dTip = dist(wrist.x, wrist.y, tip.x, tip.y);
    const dPip = dist(wrist.x, wrist.y, pip.x, pip.y);
    if (dTip > dPip) extended++;
  }

  // Sin datos suficientes no se considera puño
  return valid < 4 ? 4 : extended;
}

// Puño mantenido ~1 s: borra una sola vez
function updateFist(isFist) {
  if (!isFist) {
    fistStart = 0;
    fistCleared = false;
    return;
  }
  if (fistStart === 0) fistStart = millis();
  if (!fistCleared && millis() - fistStart >= FIST_MS) {
    layer.clear();
    // El puño también corta el trazo en curso
    strokeActive = false;
    prevPoint = null;
    prevMid = null;
    fistCleared = true;
  }
}

// Velocidad en px/s, normalizada 0..1 y suavizada
function updateSpeed(tip) {
  const now = millis();
  if (!tip) {
    speed = 0;
    lastRaw = null;
    return;
  }
  if (!lastRaw) {
    lastRaw = { x: tip.x, y: tip.y };
    lastMoveTime = now;
    return;
  }

  const moved = dist(lastRaw.x, lastRaw.y, tip.x, tip.y);
  if (moved > 0.5) {
    // Solo se actualiza con movimiento nuevo, para no castigar los FPS de ml5
    const dt = max(now - lastMoveTime, 1);
    const v = (moved / dt) * 1000;
    const k = 1 - Math.exp(-dt / SPEED_TAU); // suavizado por tiempo
    speed = lerp(speed, constrain(v / MAX_SPEED, 0, 1), k);
    lastRaw = { x: tip.x, y: tip.y };
    lastMoveTime = now;
  } else if (now - lastMoveTime > 150) {
    // Mano quieta: el color vuelve suave a los tonos fríos
    speed = lerp(speed, 0, 0.05);
  }
}

// Video (píxeles, sin espejar) → canvas (espejado y cubriendo la pantalla)
function toCanvas(x, y) {
  const vw = (video && video.elt && video.elt.videoWidth) || CAM_W;
  const vh = (video && video.elt && video.elt.videoHeight) || CAM_H;

  // Por si el modelo entregara coordenadas normalizadas
  let px = x;
  let py = y;
  if (px <= 1.5 && py <= 1.5) {
    px *= vw;
    py *= vh;
  }

  const s = max(width / vw, height / vh);
  const dw = vw * s;
  const dh = vh * s;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;

  return {
    x: dx + (1 - px / vw) * dw, // espejo horizontal
    y: dy + (py / vh) * dh,
  };
}

// --- Dibujo ---
function drawCamera() {
  const vw = video.elt.videoWidth || CAM_W;
  const vh = video.elt.videoHeight || CAM_H;
  const s = max(width / vw, height / vh);
  const dw = vw * s;
  const dh = vh * s;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;

  push();
  translate(width, 0);
  scale(-1, 1); // espejo
  image(video, dx, dy, dw, dh);
  pop();
}

// Color interpolado según la velocidad (frío → cálido)
function colorForSpeed(t) {
  const x = constrain(t, 0, 1) * (stopColors.length - 1);
  const i = min(floor(x), stopColors.length - 2);
  return lerpColor(stopColors[i], stopColors[i + 1], x - i);
}

// Grosor: lento = grueso, rápido = fino
function brushWidth() {
  return map(speed, 0, 1, BRUSH_MAX, BRUSH_MIN);
}

function drawBrush(hand, painting) {
  if (!hand) {
    // Sin mano: no se dibuja y se corta el trazo
    smooth = null;
    strokeActive = false;
    prevPoint = null;
    prevMid = null;
    lastNote = -1;
    drawMessage("Muestra tu mano");
    return;
  }

  const tip = hand.tip;
  if (!smooth) {
    smooth = { x: tip.x, y: tip.y };
  } else {
    // Interpolación hacia la posición detectada (sin saltos)
    smooth.x = lerp(smooth.x, tip.x, SMOOTH);
    smooth.y = lerp(smooth.y, tip.y, SMOOTH);
  }

  const c = colorForSpeed(speed);
  widthSmooth = lerp(widthSmooth, brushWidth(), WIDTH_SMOOTH);

  if (painting) {
    if (!strokeActive) {
      // Inicio del trazo: se guarda el punto y se espera el siguiente
      strokeActive = true;
      prevPoint = { x: smooth.x, y: smooth.y };
      prevMid = null;
    } else if (!prevMid) {
      // Segundo punto: se prepara el primer punto medio (sin tramo recto)
      prevMid = {
        x: (prevPoint.x + smooth.x) / 2,
        y: (prevPoint.y + smooth.y) / 2,
      };
      prevPoint = { x: smooth.x, y: smooth.y };
    } else {
      const moved = dist(prevPoint.x, prevPoint.y, smooth.x, smooth.y);

      if (moved > MAX_JUMP) {
        // Salto brusco del tracking: se reinicia el trazo sin línea
        prevPoint = { x: smooth.x, y: smooth.y };
        prevMid = null;
      } else {
        // Curva suave entre el punto medio anterior y el nuevo
        if (moved > 0.3) {
          const mid = {
            x: (prevPoint.x + smooth.x) / 2,
            y: (prevPoint.y + smooth.y) / 2,
          };
          drawSmooth(prevMid, prevPoint, mid, c, widthSmooth);
          prevMid = mid;
          prevPoint = { x: smooth.x, y: smooth.y };
        }

        if (moved > 1) {
          emitSpark(smooth.x, smooth.y, c);
          maybePlayNote();
        }
      }
    }
  } else {
    // Sin mano o con puño se cierra el trazo y se corta
    finishStroke(c, widthSmooth);
    lastNote = -1;
  }

  // Cursor: relleno al pintar, hueco con la mano abierta
  if (painting) {
    noStroke();
    fill(c);
    circle(smooth.x, smooth.y, 14);
    noFill();
    stroke(c);
    strokeWeight(2);
    circle(smooth.x, smooth.y, widthSmooth + 8);
  } else {
    noFill();
    stroke(c);
    strokeWeight(2);
    circle(smooth.x, smooth.y, 22);
  }
}

// Dibuja una curva cuadrática subdividida en tramos cortos,
// para que no queden huecos ni esquinas al mover la mano rápido.
function drawSmooth(a, control, b, color, weight) {
  const steps = max(1, ceil(dist(a.x, a.y, b.x, b.y) / 3));
  layer.stroke(color);
  layer.strokeWeight(weight);

  let px = a.x;
  let py = a.y;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * a.x + 2 * mt * t * control.x + t * t * b.x;
    const y = mt * mt * a.y + 2 * mt * t * control.y + t * t * b.y;
    layer.line(px, py, x, y);
    px = x;
    py = y;
  }
}

// Cierra el último tramo con una prolongación curva y corta el trazo
function finishStroke(color, weight) {
  if (strokeActive && prevMid && prevPoint) {
    // Control extrapolado: la curva continúa la dirección, sin tramo recto
    const cx = 2 * prevPoint.x - prevMid.x;
    const cy = 2 * prevPoint.y - prevMid.y;
    drawSmooth(prevMid, { x: cx, y: cy }, prevPoint, color, weight);
  }
  strokeActive = false;
  prevPoint = null;
  prevMid = null;
}

// Nota del rango de velocidad; solo se llama mientras se pinta
function maybePlayNote() {
  const note = constrain(
    floor(speed * NOTE_FREQS.length),
    0,
    NOTE_FREQS.length - 1,
  );
  if (note !== lastNote || millis() - lastNoteTime > PAINT_NOTE_MS) {
    playNote(NOTE_FREQS[note], 0.5, 0.09);
    lastNote = note;
    lastNoteTime = millis();
  }
}

// --- Chispas ---
function initSparks() {
  sparks = [];
  for (let i = 0; i < MAX_SPARKS; i++) {
    sparks.push({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      born: 0,
      size: 0,
      r: 0,
      g: 0,
      b: 0,
    });
  }
}

function emitSpark(x, y, c) {
  const p = sparks[sparkCursor];
  sparkCursor = (sparkCursor + 1) % sparks.length;

  p.alive = true;
  p.x = x + random(-4, 4);
  p.y = y + random(-4, 4);
  p.vx = random(-1.6, 1.6);
  p.vy = random(-2.4, -0.4);
  p.born = millis();
  p.size = random(2, 5);
  p.r = red(c);
  p.g = green(c);
  p.b = blue(c);
}

function drawSparks() {
  noStroke();
  for (const p of sparks) {
    if (!p.alive) continue;
    const age = millis() - p.born;
    if (age > SPARK_LIFE) {
      p.alive = false;
      continue;
    }
    const k = 1 - age / SPARK_LIFE;
    p.x += p.vx;
    p.y += p.vy;
    fill(p.r, p.g, p.b, 220 * k);
    circle(p.x, p.y, p.size * k + 1);
  }
}

function drawHint() {
  noStroke();
  fill(255, 255, 255, 150);
  textAlign(LEFT, BOTTOM);
  textSize(13);
  text("Mueve el dedo para pintar · Puño 1 s o C: borrar", 20, height - 18);
}

function drawMessage(msg) {
  textAlign(CENTER, CENTER);
  textSize(18);

  const w = textWidth(msg) + 48;
  noStroke();
  fill(0, 0, 0, 150);
  rect(width / 2 - w / 2, height / 2 - 22, w, 44, 22);

  fill(255);
  text(msg, width / 2, height / 2);
}

// --- Audio (Web Audio API, sin archivos externos) ---
function initAudio() {
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  audioCtx = new AC();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

// Nota de piano sintetizada: triángulo + armónico suave
function playNote(freq, duration = 0.9, volume = 0.2) {
  if (!audioCtx || audioCtx.state !== "running") return;

  const t = audioCtx.currentTime;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  gain.connect(audioCtx.destination);

  const osc = audioCtx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  osc.connect(gain);
  osc.start(t);
  osc.stop(t + duration + 0.05);

  const harm = audioCtx.createOscillator();
  const harmGain = audioCtx.createGain();
  harm.type = "sine";
  harm.frequency.value = freq * 2;
  harmGain.gain.value = 0.18;
  harm.connect(harmGain);
  harmGain.connect(gain);
  harm.start(t);
  harm.stop(t + duration + 0.05);
}
