// handTracking.js — Detección de manos con ml5 HandPose (espec. §4, §14.2, §14.3)
// Solo provee la posición de la punta del índice ("cuchillo") al ciclo de p5.
// Nunca toca la lógica del juego: esa vive en game.js.

let handPoseModel = null;
let modelReady = false;
let modelError = null;
let videoReady = false;
let video = null;
let hands = [];
let rawTip = null; // {x, y, t, found} en píxeles del video (ml5 ya los espeja con flipHorizontal)

function initCamera() {
  try {
    // audio: false para que el navegador no pida el micrófono (espec. §14.2)
    video = createCapture({ video: true, audio: false }, onVideoReady);
    video.size(CONFIG.canvasW, CONFIG.canvasH);
    video.hide();
  } catch (err) {
    modelError = 'No se pudo iniciar la captura de video.';
    console.error(err);
    updateStatus('Cámara no disponible.');
  }
}

function onVideoReady() {
  videoReady = true;
  updateStatus('Cámara lista.');
}

function initHandPose() {
  handPoseModel = ml5.handPose({
    maxHands: CONFIG.maxHands,
    modelType: CONFIG.modelType,
    flipHorizontal: CONFIG.flipHorizontal
  });
  handPoseModel.ready
    .then(() => {
      modelReady = true;
      updateStatus('Modelo de manos listo.');
    })
    .catch(err => {
      modelError = err;
      updateStatus('Error cargando el modelo de manos.');
      console.error(err);
    });
}

function startDetection() {
  if (handPoseModel && modelReady && videoReady && !handPoseModel.detecting) {
    handPoseModel.detectStart(video, onHands);
  }
}

function stopDetection() {
  if (handPoseModel) {
    handPoseModel.detectStop();
  }
}

function onHands(results) {
  hands = results || [];
  const now = millis();
  const tip = hands.length > 0 ? hands[0].index_finger_tip : null;
  if (tip) {
    // Salvaguarda: si ml5 devolviera coordenadas normalizadas (0-1), escalarlas al video.
    const sx = tip.x < 2 ? video.elt.videoWidth : 1;
    const sy = tip.y < 2 ? video.elt.videoHeight : 1;
    rawTip = { x: tip.x * sx, y: tip.y * sy, t: now, found: true };
  } else {
    rawTip = { found: false, t: now };
  }
}

// Píxeles del video → píxeles del canvas.
// El video se renderiza espejado y ml5 recibe flipHorizontal: true, por lo que
// los landmarks ya vienen espejados: el mapeo es 1:1 escalado al canvas.
function videoToCanvas(x, y) {
  const vw = max(1, video ? video.elt.videoWidth : CONFIG.canvasW);
  const vh = max(1, video ? video.elt.videoHeight : CONFIG.canvasH);
  return {
    x: (x / vw) * CONFIG.canvasW,
    y: (y / vh) * CONFIG.canvasH
  };
}
