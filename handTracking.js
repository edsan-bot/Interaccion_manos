// handTracking.js — Detección de manos con ml5 HandPose (espec. §4, §14.2, §14.3)
// Solo provee la posición de la punta del índice ("cuchillo") al ciclo de p5.
// Nunca toca la lógica del juego: esa vive en game.js.

let handPoseModel = null;
let modelReady = false;
let modelError = null;
let videoReady = false;
let videoDimensionsReady = false;
let video = null;
let hands = [];
let rawTip = null; // {x, y, t, found} en píxeles del video

function initCamera() {
  try {
    // p5 2.3.2: createCapture con constraints para evitar prompt de micrófono.
    // Usar objeto { audio: false, video: true } en lugar de VIDEO constante,
    // ya que p5 2.3.2 espera el segundo parámetro como objeto de constraints
    // cuando se pasa el tipo de captura así.
    video = createCapture({ audio: false, video: true }, onVideoReady);
    video.size(CONFIG.canvasW, CONFIG.canvasH);
    video.hide();

    // Si el video ya tiene metadatos, marcar dimensiones listas
    if (video.elt && video.elt.videoWidth > 0) {
      videoDimensionsReady = true;
      if (modelReady) {
        startDetection();
      }
    } else if (video.elt) {
      video.elt.addEventListener(
        "loadedmetadata",
        () => {
          videoDimensionsReady = true;
          if (modelReady) {
            startDetection();
          }
        },
        { once: true },
      );
    }
  } catch (err) {
    modelError = err;
    updateStatus("No se pudo iniciar la captura de video.");
    console.error(err);
  }
}

function onVideoReady(stream) {
  videoReady = true;
  updateStatus("Cámara lista.");
  // Las dimensiones se marcan en loadedmetadata; si ya estaban listas y el
  // modelo también, startDetection ya se disparó desde initCamera.
}

// OJO: con p5 2.x, ml5 1.4.0 promisifica sus factories.
// setupP5Integration() llama a registerAsyncConstructors() porque checkP5() busca
// prototype.registerMethod, que p5 2.x eliminó. Resultado: ml5.handPose() devuelve
// una Promise que resuelve a la instancia, NO la instancia. Con `await` funciona en
// ambas ramas (una Promise se espera; una instancia se devuelve tal cual).
async function initHandPose() {
  try {
    const model = ml5.handPose({
      maxHands: CONFIG.maxHands,
      modelType: CONFIG.modelType,
    });
    handPoseModel = model && typeof model.then === "function" ? await model : model;
    if (handPoseModel && handPoseModel.ready) await handPoseModel.ready;
    modelReady = true;
    updateStatus("Modelo de manos listo.");
    if (videoReady) {
      startDetection();
    }
  } catch (err) {
    modelError = err;
    updateStatus("Error cargando el modelo de manos.");
    console.error(err);
  }
}

function startDetection() {
  if (modelError) return;
  if (!handPoseModel || !modelReady || !videoReady || !videoDimensionsReady)
    return;
  // Con p5 2.x el modelo llega por Promise; si algo se coló sin resolver, no
  // reventar el ciclo de dibujo cada frame.
  if (typeof handPoseModel.detectStart !== "function") {
    modelError = new Error("ml5: el modelo no expone detectStart()");
    updateStatus("Error iniciando la detección de manos.");
    console.error(modelError, handPoseModel);
    return;
  }
  if (handPoseModel.detecting) return;
  // ml5 necesita el elemento HTML nativo <video>, no el wrapper de p5.
  const videoElt = video && video.elt ? video.elt : video;
  if (!videoElt || videoElt.videoWidth <= 0) return;
  try {
    // Asegurar que el video esté reproduciendo para que ml5 pueda leer frames.
    if (typeof videoElt.play === "function") {
      videoElt.play().catch(() => {
        // El navegador puede bloquear autoplay sin interacción del usuario;
        // no es fatal: ml5 intentará leer frames igual cuando esté disponible.
      });
    }
    handPoseModel.detectStart(videoElt, onHands);
  } catch (err) {
    // Nunca dejar que un error de ml5 congele el ciclo de p5.
    modelError = err;
    updateStatus("Error iniciando la detección de manos.");
    console.error(err);
  }
}

function stopDetection() {
  if (handPoseModel) {
    try {
      // ml5 1.4.0: detectStop no siempre es una función; usar signalStop como fallback.
      if (typeof handPoseModel.detectStop === "function") {
        handPoseModel.detectStop();
      } else {
        handPoseModel.signalStop = true;
      }
    } catch (err) {
      // Fallback defensivo si detectStop falla en algún entorno.
      try {
        handPoseModel.signalStop = true;
      } catch (err2) {
        // Secundary error ignored
      }
    }
  }
}

function onHands(results) {
  hands = results || [];
  const now = millis();
  const tip = hands.length > 0 ? hands[0].index_finger_tip : null;
  if (tip && video && video.elt) {
    const vw = video.elt.videoWidth || CONFIG.canvasW;
    const vh = video.elt.videoHeight || CONFIG.canvasH;
    // Salvaguarda: si ml5 devolviera coordenadas normalizadas (0-1), escalarlas al video.
    const sx = tip.x < 2 ? vw : 1;
    const sy = tip.y < 2 ? vh : 1;
    rawTip = { x: tip.x * sx, y: tip.y * sy, t: now, found: true };
  } else {
    rawTip = { found: false, t: now };
  }
}

// Píxeles del video → píxeles del canvas.
// ml5 entrega los landmarks sin espejar (flipHorizontal queda en false) y el
// video se dibuja espejado. La transformación vive acá y solo acá, para poder
// cumplir CONFIG.flipHorizontal sin duplicar el espejado (espec. §14.3).
function videoToCanvas(x, y) {
  const vw = max(1, video && video.elt ? video.elt.videoWidth : CONFIG.canvasW);
  const vh = max(
    1,
    video && video.elt ? video.elt.videoHeight : CONFIG.canvasH,
  );
  const nx = x / vw;
  return {
    x: (CONFIG.flipHorizontal ? 1 - nx : nx) * CONFIG.canvasW,
    y: (y / vh) * CONFIG.canvasH,
  };
}

// Indica si la cámara está lista para usarse (sin errores y con dimensiones)
function cameraIsReady() {
  return videoReady && videoDimensionsReady && video && video.elt;
}
