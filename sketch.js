// sketch.js — Manos: cuadrícula neón con melodía
// p5.js 2.3.2 + ml5.js 1.4.0 (handPose con maxHands: 2)

// --- Configuración ---
const CAM_W = 640; // ancho de captura
const CAM_H = 480; // alto de captura

const COLS = 13; // columnas de la cuadrícula
const ROWS = 16; // filas de la cuadrícula
const MARGIN = 64; // margen máximo respecto del borde
const DOT_START = 1.5; // radio inicial (apagado)
const DOT_MAX = 12; // radio final máximo
const GROWTH = 0.12; // suavizado del crecimiento
const REACH = 80; // radio de pintado alrededor del índice
const DIM = "#2a2f38"; // gris oscuro apagado
const FADE_SEC = 20; // apagado lento: segundos de tamaño máximo a mínimo
const CLEAR_SPEED = 0.15; // lerp del borrado suave

const TIP_SMOOTH = 0.35; // suavizado de la punta del índice
const PINCH_RATIO = 0.45; // pellizco: distancia 4↔8 / largo de la palma
const MAX_SPEED = 1400; // px/s del neón más cálido
const SPEED_TAU = 120; // constante de tiempo del suavizado de velocidad
const HAND_TIMEOUT = 500; // gracia sin detección antes de ocultar el esqueleto

// Melodía: una nota por columna, pentatónica de Do en dos octavas (Do4 → Mi6)
const NOTES = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0,
  1046.5, 1174.66, 1318.51,
];
const NOTE_GAP = 250; // máximo 4 notas por segundo
const TRIGGER_LO = 0.7; // fracción de tamaño que dispara la nota
const REARM_LO = 0.35; // por debajo de esto la nota se vuelve a armar

// Borrado
const FIST_MS = 1000; // puño cerrado para borrar
const CLAP_RATIO = 1.5; // aplauso: distancia entre palmas / suma de largos de palma
const CLAP_GAP = 1000; // enfriamiento del aplauso

// Paletas neón por velocidad: [lenta, media, rápida]
const NEON = [
  ["#00F5FF", "#B6FF00", "#FF2BD6"], // mano 0 (base cian)
  ["#9D4DFF", "#FFE600", "#FF9100"], // mano 1 (base morado)
];
const HAND_COLORS = ["#00F5FF", "#FF2BD6"]; // esqueleto: cian y magenta

// Conexiones del esqueleto por índice de keypoint
const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17], [17, 0], // palma
];
const TIPS = [4, 8, 12, 16, 20]; // puntas de los dedos (más grandes)

// --- Estado ---
let started = false;
let video = null;
let cameraReady = false;
let handPose = null;
let modelReady = false;
let hands = []; // última detección cruda
let lastHandTime = 0;
let errorMsg = "";

let dots = []; // cuadrícula
let neon = []; // NEON como {r, g, b}
let handColor = []; // colores del esqueleto
let dimRGB = { r: 42, g: 47, b: 56 }; // DIM como números
let tipSmooth = [null, null]; // punta del índice suavizada por mano
let speeds = [0, 0]; // velocidad suavizada 0..1 por mano
let prev = [null, null]; // posición y tiempo previos por mano
let prevCount = 0; // manos visibles en el frame anterior

let audioCtx = null;
let lastNoteAt = -1000;
let fistStart = 0;
let fistArmed = true;
let lastClapAt = -1000;
let prevPalmDist = null;

// --- p5 ---
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  neon = NEON.map((pal) =>
    pal.map((c) => {
      const col = color(c);
      return { r: red(col), g: green(col), b: blue(col) };
    }),
  );
  handColor = HAND_COLORS.map((c) => color(c));

  const dim = color(DIM);
  dimRGB = { r: red(dim), g: green(dim), b: blue(dim) };

  createDots();
  layoutGrid();

  document.getElementById("start-btn").addEventListener("click", begin);
}

// El clic habilita el audio y arranca cámara + modelo
async function begin() {
  if (started) return;
  started = true;

  initAudio(); // debe ocurrir dentro del clic para habilitar el sonido
  document.getElementById("start-screen").classList.add("hidden");
  await startCamera();
}

function draw() {
  background(0); // fondo negro total, sin video

  keepCanvasSize();

  const detected = currentHands();
  const now = millis();

  updateSpeeds(detected);

  // Qué puntos se están pintando en este frame
  for (const d of dots) d.painting = false;
  for (const h of detected) if (h.pinch) paintAt(h);

  updateDots(min(deltaTime, 250), now);
  drawDots(); // la cuadrícula se ve desde el primer frame
  drawSkeletons(detected);
  drawCursors(detected);
  checkClearGestures(detected, now);
  drawStatus();
}

// Mantiene el canvas pegado a la ventana (por si se pierde el evento resize)
function keepCanvasSize() {
  if (width === windowWidth && height === windowHeight) return;
  resizeCanvas(windowWidth, windowHeight);
  layoutGrid(); // conserva el progreso de cada punto
  tipSmooth = [null, null];
  prev = [null, null];
  speeds = [0, 0];
}

// --- Cuadrícula ---
function createDots() {
  dots = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      dots.push({
        i,
        j,
        x: 0,
        y: 0,
        r: DOT_START, // radio actual
        // Final aleatorio: muchos chicos y algunos grandes
        rMax: 2 + (DOT_MAX - 2) * pow(random(), 2.3),
        cr: dimRGB.r, // color actual
        cg: dimRGB.g,
        cb: dimRGB.b,
        tr: dimRGB.r, // color objetivo
        tg: dimRGB.g,
        tb: dimRGB.b,
        armed: true, // lista para sonar
        painting: false, // pintándose en este frame
        fading: false, // borrado rápido en curso
      });
    }
  }
}

// Centra la cuadrícula y recalcula las posiciones (sin perder el progreso)
function layoutGrid() {
  const m = min(MARGIN, min(width, height) * 0.06);
  const cell = min((width - m * 2) / (COLS - 1), (height - m * 2) / (ROWS - 1));
  const ox = (width - cell * (COLS - 1)) / 2;
  const oy = (height - cell * (ROWS - 1)) / 2;

  for (const d of dots) {
    d.x = ox + d.i * cell;
    d.y = oy + d.j * cell;
  }
}

function updateDots(dtMs, now) {
  const dt = dtMs / 1000;
  let best = null; // nota candidata del frame

  for (const d of dots) {
    if (d.fading) {
      // Borrado suave: vuelve rápido al estado inicial
      d.r = lerp(d.r, DOT_START, CLEAR_SPEED);
      if (d.r < DOT_START + 0.05) {
        d.r = DOT_START;
        d.fading = false;
        d.armed = true;
      }
    } else if (d.painting) {
      d.r = lerp(d.r, d.rMax, GROWTH);
    } else if (d.r > DOT_START) {
      // Apagado lento: de su tamaño máximo a mínimo en FADE_SEC segundos
      d.r = max(DOT_START, d.r - ((d.rMax - DOT_START) / FADE_SEC) * dt);
    }

    // El color acompaña al tamaño
    const p = d.rMax > DOT_START ? (d.r - DOT_START) / (d.rMax - DOT_START) : 0;
    d.cr = lerp(dimRGB.r, d.tr, p);
    d.cg = lerp(dimRGB.g, d.tg, p);
    d.cb = lerp(dimRGB.b, d.tb, p);

    // Nota de la columna al cruzar el umbral
    if (!d.fading) {
      if (p >= TRIGGER_LO && d.armed) {
        d.armed = false;
        if (!best || d.r > best.size) best = { col: d.i, size: d.r };
      } else if (p < REARM_LO) {
        d.armed = true;
      }
    }
  }

  // Una sola nota por ventana de 250 ms: suena el punto más grande
  if (best && now - lastNoteAt >= NOTE_GAP) {
    lastNoteAt = now;
    playNote(NOTES[best.col], map(best.size, 2, 12, 0.06, 0.2));
  }
}

// Marca los puntos dentro del radio del índice
function paintAt(h) {
  const c = neonColor(h.idx, speeds[h.idx]);
  for (const d of dots) {
    if (dist(d.x, d.y, h.tip.x, h.tip.y) < REACH) {
      d.painting = true;
      d.fading = false;
      d.tr = c.r;
      d.tg = c.g;
      d.tb = c.b;
    }
  }
}

function drawDots() {
  noStroke();
  for (const d of dots) {
    if (d.r > DOT_START + 0.3) {
      // Brillo: dos halos translúcidos detrás del punto (sin shadowBlur)
      fill(d.cr, d.cg, d.cb, 26);
      circle(d.x, d.y, d.r * 3.4);
      fill(d.cr, d.cg, d.cb, 60);
      circle(d.x, d.y, d.r * 2);
    }
    fill(d.cr, d.cg, d.cb);
    circle(d.x, d.y, d.r * 2);
  }
}

// --- Esqueleto ---
function currentHands() {
  if (!modelReady || hands.length === 0) return [];
  if (millis() - lastHandTime > HAND_TIMEOUT) return [];

  // 21 keypoints por mano, ya pasados a coordenadas de canvas
  const mapped = [];
  for (const h of hands.slice(0, 2)) {
    const kp = h.keypoints;
    if (!kp || kp.length < 21) continue;
    mapped.push(kp.slice(0, 21).map((k) => toCanvas(k.x, k.y)));
  }

  // Orden estable por X en pantalla: evita que los colores parpadeen
  mapped.sort((a, b) => a[0].x - b[0].x);

  const out = [];
  for (let i = 0; i < mapped.length; i++) {
    const pts = mapped[i];
    const tip = pts[8];

    // Suavizado de la punta del índice
    if (!tipSmooth[i]) tipSmooth[i] = { x: tip.x, y: tip.y };
    else {
      tipSmooth[i].x = lerp(tipSmooth[i].x, tip.x, TIP_SMOOTH);
      tipSmooth[i].y = lerp(tipSmooth[i].y, tip.y, TIP_SMOOTH);
    }

    out.push({
      idx: i,
      pts,
      tip: tipSmooth[i],
      pinch: isPinch(pts),
      fist: isFist(pts),
      palmLen: dist(pts[0].x, pts[0].y, pts[9].x, pts[9].y),
      palm: {
        x: (pts[0].x + pts[5].x + pts[9].x + pts[13].x + pts[17].x) / 5,
        y: (pts[0].y + pts[5].y + pts[9].y + pts[13].y + pts[17].y) / 5,
      },
    });
  }

  // Las ranuras sin mano vuelven a empezar (evita saltos al reaparecer)
  for (let i = mapped.length; i < tipSmooth.length; i++) tipSmooth[i] = null;

  return out;
}

// Pellizco: pulgar (4) cerca del índice (8), relativo al tamaño de la palma
function isPinch(pts) {
  const palm = dist(pts[0].x, pts[0].y, pts[9].x, pts[9].y);
  const gap = dist(pts[4].x, pts[4].y, pts[8].x, pts[8].y);
  return gap < max(palm, 60) * PINCH_RATIO;
}

// Puño: ningún dedo extendido (la punta queda más cerca de la muñeca que su nudillo)
function isFist(pts) {
  const pairs = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ];
  let extended = 0;
  for (const [tip, pip] of pairs) {
    const dTip = dist(pts[0].x, pts[0].y, pts[tip].x, pts[tip].y);
    const dPip = dist(pts[0].x, pts[0].y, pts[pip].x, pts[pip].y);
    if (dTip > dPip) extended++;
  }
  return extended === 0;
}

function drawSkeletons(list) {
  for (const h of list) {
    const base = handColor[h.idx];
    const pts = h.pts;

    // Huesos
    stroke(red(base), green(base), blue(base), 170);
    strokeWeight(1.5);
    noFill();
    for (const [a, b] of BONES) {
      const pa = pts[a];
      const pb = pts[b];
      if (pa && pb) line(pa.x, pa.y, pb.x, pb.y);
    }

    // Keypoints: las puntas de los dedos, más grandes
    noStroke();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p) continue;
      fill(base);
      circle(p.x, p.y, TIPS.includes(i) ? 9 : 5);
    }
  }
}

function drawCursors(list) {
  for (const h of list) {
    const c = neonColor(h.idx, speeds[h.idx]);

    if (h.pinch) {
      // Pintando: halo del radio de influencia + núcleo lleno
      noStroke();
      fill(c.r, c.g, c.b, 40);
      circle(h.tip.x, h.tip.y, REACH * 0.75);
      fill(c.r, c.g, c.b);
      circle(h.tip.x, h.tip.y, 14);
    } else {
      // Solo cursor: hueco
      noFill();
      stroke(c.r, c.g, c.b, 150);
      strokeWeight(1.5);
      circle(h.tip.x, h.tip.y, 16);
    }
  }
}

// --- Borrado ---
function checkClearGestures(detected, now) {
  // Puño sostenido 1 s: se ejecuta una vez y hay que abrir la mano
  const anyFist = detected.some((h) => h.fist);
  if (!anyFist) {
    fistStart = 0;
    fistArmed = true;
  } else {
    if (fistStart === 0) fistStart = now;
    if (fistArmed && now - fistStart >= FIST_MS) {
      clearCanvas();
      fistArmed = false;
    }
  }

  // Aplauso: las dos palmas se juntan rápido (con enfriamiento)
  if (detected.length < 2) {
    prevPalmDist = null;
    return;
  }
  const [a, b] = detected;
  const d = dist(a.palm.x, a.palm.y, b.palm.x, b.palm.y);
  const cerca = (a.palmLen + b.palmLen) * CLAP_RATIO;
  const acercando = prevPalmDist !== null && d < prevPalmDist - 0.5;

  if (d < cerca && acercando && now - lastClapAt >= CLAP_GAP) {
    lastClapAt = now;
    clearCanvas();
  }
  prevPalmDist = d;
}

// Todo vuelve al estado inicial con una animación suave
function clearCanvas() {
  for (const d of dots) d.fading = true;
}

function keyPressed() {
  if (key === "c" || key === "C" || keyCode === 67) clearCanvas();
}

// --- Velocidad y color ---
function updateSpeeds(list) {
  const now = millis();

  // Si cambia la cantidad de manos, se reinicia para evitar saltos
  if (list.length !== prevCount) {
    speeds = [0, 0];
    prev = [null, null];
    prevCount = list.length;
  }

  for (let i = 0; i < speeds.length; i++) {
    const h = list[i];
    if (!h) {
      speeds[i] = lerp(speeds[i], 0, 0.05);
      prev[i] = null;
      continue;
    }

    const p = prev[i];
    if (p) {
      const dt = max(now - p.t, 1);
      const v = (dist(p.x, p.y, h.tip.x, h.tip.y) / dt) * 1000; // px/s
      const k = 1 - Math.exp(-dt / SPEED_TAU);
      speeds[i] = lerp(speeds[i], constrain(v / MAX_SPEED, 0, 1), k);
    }
    prev[i] = { x: h.tip.x, y: h.tip.y, t: now };
  }
}

// Color neón continuo entre las tres paradas de la mano
function neonColor(idx, speed) {
  const pal = neon[idx];
  const t = Number.isFinite(speed) ? constrain(speed, 0, 1) : 0; // por si la velocidad sale NaN
  const x = t * (pal.length - 1);
  const i = min(floor(x), pal.length - 2);
  const f = x - i;

  return {
    r: lerp(pal[i].r, pal[i + 1].r, f),
    g: lerp(pal[i].g, pal[i + 1].g, f),
    b: lerp(pal[i].b, pal[i + 1].b, f),
  };
}

// Video (píxeles) → canvas (espejado y cubriendo la pantalla)
function toCanvas(x, y) {
  const vw = videoWidth();
  const vh = videoHeight();
  const s = max(width / vw, height / vh);
  const dw = vw * s;
  const dh = vh * s;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;

  return {
    x: dx + (1 - x / vw) * dw, // espejo horizontal
    y: dy + (y / vh) * dh,
  };
}

// --- Texto de estado ---
function drawStatus() {
  noStroke();
  textAlign(LEFT, TOP);
  textSize(12);
  fill(150);
  text(`Cámara: ${cameraReady ? "lista" : "no"}`, 16, 14);
  text(`Modelo: ${modelReady ? "cargado" : "no"}`, 16, 30);
  text(`Manos detectadas: ${hands.length}`, 16, 46);
  if (errorMsg) {
    fill(255, 120, 120);
    text(errorMsg, 16, 62);
  }
}

// --- Audio (Web Audio API, sin archivos externos) ---
function initAudio() {
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  audioCtx = new AC();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

// Nota suave tipo piano: ataque rápido, caída corta, dos osciladores
function playNote(freq, volume) {
  if (!audioCtx || audioCtx.state !== "running") return;

  const t = audioCtx.currentTime;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01); // ataque
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); // caída
  gain.connect(audioCtx.destination);

  const osc = audioCtx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  osc.connect(gain);
  osc.start(t);
  osc.stop(t + 0.65);

  // Armónico suave, un poco por encima, para que no suene a seno puro
  const harm = audioCtx.createOscillator();
  const harmGain = audioCtx.createGain();
  harm.type = "sine";
  harm.frequency.value = freq * 2;
  harmGain.gain.value = 0.15;
  harm.connect(harmGain);
  harmGain.connect(gain);
  harm.start(t);
  harm.stop(t + 0.65);
}

// --- Cámara y modelo ---
async function startCamera() {
  // Cámara y modelo en paralelo: no se suman los tiempos de carga
  const [cam, model] = await Promise.allSettled([initCamera(), initModel()]);

  if (cam.status === "rejected") {
    errorMsg = "No se pudo acceder a la cámara.";
    console.error(cam.reason);
  } else if (model.status === "rejected") {
    errorMsg = "No se pudo cargar el modelo de manos.";
    console.error(model.reason);
  } else {
    startDetection();
  }
}

async function initCamera() {
  // p5 2.x: primer argumento = constraints, sin micrófono
  let capture = createCapture({
    video: { width: CAM_W, height: CAM_H },
    audio: false,
  });
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
  if (play && typeof play.catch === "function") play.catch(() => {}); // sin await: sin cámara nunca resuelve

  if (!elt.videoWidth) throw new Error("No se pudo acceder a la cámara");

  cameraReady = true;
}

async function initModel() {
  if (typeof ml5 === "undefined") throw new Error("ml5 no está disponible");

  handPose = await ml5.handPose({ maxHands: 2, modelType: "lite" });
  if (handPose && handPose.ready) await handPose.ready;
  modelReady = true;
}

function startDetection() {
  if (!handPose || !video) return;
  try {
    handPose.detectStart(video, (results) => {
      hands = results || [];
      if (hands.length > 0) lastHandTime = millis();
    });
  } catch (err) {
    errorMsg = "No se pudo iniciar la detección de manos.";
    console.error(err);
  }
}

function videoWidth() {
  return (video && video.elt && video.elt.videoWidth) || CAM_W;
}

function videoHeight() {
  return (video && video.elt && video.elt.videoHeight) || CAM_H;
}
