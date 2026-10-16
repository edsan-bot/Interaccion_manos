// ---------- Stubs de p5 ----------
var width = 640, height = 480;
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
function random(a, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); }
function max(a, b) { return a > b ? a : b; }
function min(a, b) { return a < b ? a : b; }
var floor = Math.floor;
function constrain(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
var TWO_PI = Math.PI * 2;
var PI = Math.PI;
var HALF_PI = Math.PI / 2;
var _t0 = Date.now();
function millis() { return Date.now() - _t0; }
function createCanvas() {}
function image() {}
function fill() {}
function noStroke() {}
function rect() {}
function circle() {}
function ellipse() {}
function triangle() {}
function arc() {}
function push() {}
function pop() {}
function translate() {}
function rotate() {}
function stroke() {}
function strokeWeight() {}
function text() {}
function textSize() {}
function textStyle() {}
function textAlign() {}
function line() {}
function startDetection() {}
function stopDetection() {}

// ---------- CONFIG (definido en sketch.js) ----------
var CONFIG = {
  canvasW: 640, canvasH: 480,
  maxHands: 1, modelType: 'lite', flipHorizontal: true,
  smoothingAlpha: 0.4, minCutSpeed: 130, noHandPauseMs: 1200,
  gravity: 0.38, spawnSpeedBase: 7.5, spawnSpeedMax: 12,
  spawnInterval: 750, spawnIntervalMin: 330, maxFruits: 9, missGraceMs: 700,
  difficultyEveryCuts: 12, difficultySpeedStep: 1.5, difficultySpawnStep: 0.88,
  maxLives: 3, pointsFruit: 100, pointsGolden: 300, streakThreshold: 5, streakBonus: 250,
  probBomb: 0.07, probGolden: 0.05, probHeart: 0.04,
  maxParticles: 240, particleLifeFrames: 42
};
