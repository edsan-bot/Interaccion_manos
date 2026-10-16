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

// fruit.js — Sistema de frutas, bombas, especiales, mitades y partículas
// Todas las frutas comparten la misma estructura de datos (espec. §6, §14.4).

const TYPE_NAMES = ['watermelon', 'orange', 'apple', 'banana', 'strawberry', 'pineapple'];

function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return [255, 255, 255];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function fruitTypeTable() {
  return {
    watermelon: { fill: '#2e7d32', fill2: '#1b5e20', score: CONFIG.pointsFruit, kind: 'fruit', prob: 1.00 },
    orange:     { fill: '#fb8c00', fill2: '#ef6c00', score: CONFIG.pointsFruit, kind: 'fruit', prob: 1.00 },
    apple:      { fill: '#d32f2f', fill2: '#b71c1c', score: CONFIG.pointsFruit, kind: 'fruit', prob: 1.00 },
    banana:     { fill: '#fdd835', fill2: '#fbc02d', score: CONFIG.pointsFruit, kind: 'fruit', prob: 1.00 },
    strawberry: { fill: '#e53935', fill2: '#c62828', score: CONFIG.pointsFruit, kind: 'fruit', prob: 1.00 },
    pineapple:  { fill: '#fbc02d', fill2: '#f9a825', score: CONFIG.pointsFruit, kind: 'fruit', prob: 1.00 },
    bomb:       { fill: '#212121', fill2: '#000000', score: 0,                 kind: 'bomb',    prob: CONFIG.probBomb },
    golden:     { fill: '#ffd600', fill2: '#fff176', score: CONFIG.pointsGolden, kind: 'golden', prob: CONFIG.probGolden },
    heart:      { fill: '#ec407a', fill2: '#c2185b', score: 0,                 kind: 'heart',   prob: CONFIG.probHeart }
  };
}

function pickFruitType() {
  const r = random();
  const t = fruitTypeTable();
  if (r < t.heart.prob) return 'heart';
  if (r < t.heart.prob + t.golden.prob) return 'golden';
  if (r < t.heart.prob + t.golden.prob + t.bomb.prob) return 'bomb';
  return TYPE_NAMES[floor(random(TYPE_NAMES.length))];
}

function FruitSystem() {
  this.items = [];
  this.halves = [];
  this.particles = null; // se asigna desde sketch.js
}

FruitSystem.prototype.spawn = function (speedBonus) {
  const kind = pickFruitType();
  const t = fruitTypeTable()[kind];
  const r = kind === 'banana' ? random(18, 28) : random(20, 30);
  const x = random(r, width - r);
  const y = height + r + random(0, 50);
  const vx = random(-1.3, 1.3);
  const vy = -(random(CONFIG.spawnSpeedBase, CONFIG.spawnSpeedMax) + speedBonus);
  this.items.push({
    x, y, vx, vy,
    type: kind,
    kind: kind,
    r: r,
    angle: random(TWO_PI),
    spin: random(-0.07, 0.07),
    alive: true,
    cut: false,
    born: millis(),
    color: t.fill,
    fill2: t.fill2,
    score: t.score
  });
};

FruitSystem.prototype.update = function () {
  for (let i = this.items.length - 1; i >= 0; i--) {
    const f = this.items[i];
    if (!f.alive) {
      this.items.splice(i, 1);
      continue;
    }
    f.x += f.vx;
    f.y += f.vy;
    f.vy += CONFIG.gravity;
    f.angle += f.spin;
    if (f.y > height + 220) f.alive = false;
  }
  for (let i = this.halves.length - 1; i >= 0; i--) {
    const h = this.halves[i];
    if (!h.alive) {
      this.halves.splice(i, 1);
      continue;
    }
    h.x += h.vx;
    h.y += h.vy;
    h.vy += CONFIG.gravity * 0.7;
    h.angle += h.spin;
    h.life--;
    if (h.life <= 0 || h.y > height + 260) h.alive = false;
  }
};

// Corta una fruta: crea dos mitades y devuelve datos para puntuación/partículas.
FruitSystem.prototype.cut = function (f, knifeAngle) {
  f.cut = true;
  f.alive = false;
  const nx = -Math.sin(knifeAngle);
  const ny = Math.cos(knifeAngle);
  const sep = 7;
  const pushSpd = 4.5;
  this.halves.push({
    x: f.x + nx * sep, y: f.y + ny * sep,
    vx: f.vx - nx * pushSpd, vy: f.vy - ny * pushSpd - 1.5,
    r: f.r, angle: f.angle, spin: f.spin * 1.6 + 0.05,
    life: 90, maxLife: 90,
    color: f.color, fill2: f.fill2, kind: f.kind, side: 1
  });
  this.halves.push({
    x: f.x - nx * sep, y: f.y - ny * sep,
    vx: f.vx + nx * pushSpd, vy: f.vy + ny * pushSpd - 1.5,
    r: f.r, angle: f.angle + PI, spin: f.spin * 1.6 - 0.05,
    life: 90, maxLife: 90,
    color: f.color, fill2: f.fill2, kind: f.kind, side: -1
  });
  if (this.particles) {
    const n = f.kind === 'golden' ? 30 : f.kind === 'heart' ? 25 : 20;
    this.particles.spawn(f.x, f.y, f.color, n);
  }
  return { kind: f.kind, score: f.score };
};

FruitSystem.prototype.drawFruit = function (f) {
  const t = fruitTypeTable()[f.kind];
  const d = f.r * 2;
  push();
  translate(f.x, f.y);
  rotate(f.angle);
  noStroke();

  // cuerpo según tipo
  if (f.kind === 'banana') {
    fill(t.fill);
    ellipse(0, 0, d, d * 0.62);
    fill(t.fill2);
    ellipse(-f.r * 0.28, 0, f.r * 0.55, f.r * 0.3);
    rect(-f.r * 0.22, -f.r * 0.28, f.r * 0.45, f.r * 0.14);
  } else if (f.kind === 'pineapple') {
    fill(t.fill);
    circle(0, 0, d);
    fill(0, 0, 0, 40);
    for (let j = -1; j <= 1; j++) {
      line(-f.r * 0.7, j * f.r * 0.35, f.r * 0.7, j * f.r * 0.35);
      line(j * f.r * 0.35, -f.r * 0.7, j * f.r * 0.35, f.r * 0.7);
    }
    fill('#388e3c');
    rect(-f.r * 0.35, -f.r * 1.05, f.r * 0.7, f.r * 0.5);
  } else if (f.kind === 'bomb') {
    fill(t.fill);
    circle(0, 0, d);
    fill('#ff9800');
    rect(-f.r * 0.12, -f.r * 1.12, f.r * 0.24, f.r * 0.28);
    fill(255, 220, 0, 180);
    circle(-f.r * 0.28, -f.r * 1.18, f.r * 0.14);
  } else if (f.kind === 'heart') {
    fill(t.fill);
    const s = f.r * 0.55;
    circle(-s * 0.55, -s * 0.25, s);
    circle(s * 0.55, -s * 0.25, s);
    triangle(-s * 1.05, s * 0.05, s * 1.05, s * 0.05, 0, s * 1.45);
  } else if (f.kind === 'strawberry') {
    fill(t.fill);
    ellipse(0, 0, d * 0.9, d * 1.05);
    fill('#388e3c');
    rect(-f.r * 0.22, -f.r * 1.02, f.r * 0.44, f.r * 0.34);
    fill(0, 0, 0, 45);
    for (let j = 0; j < 5; j++) {
      circle(random(-f.r * 0.5, f.r * 0.5), random(-f.r * 0.5, f.r * 0.5), f.r * 0.12);
    }
  } else {
    // watermelon, orange, apple, golden
    fill(t.fill);
    circle(0, 0, d);
    if (f.kind === 'watermelon') {
      fill(t.fill2);
      arc(0, 0, d * 0.85, d * 0.85, 0.2 * PI, 0.8 * PI);
      fill('#ff5252');
      circle(-f.r * 0.35, -f.r * 0.1, f.r * 0.5);
    } else {
      fill(255, 255, 255, 55);
      ellipse(-f.r * 0.3, -f.r * 0.3, f.r * 0.55, f.r * 0.35);
    }
  }

  pop();
};

FruitSystem.prototype.drawHalf = function (h) {
  push();
  translate(h.x, h.y);
  rotate(h.angle);
  noStroke();
  fill(h.color);
  const d = h.r * 1.85;
  const start = h.side === 1 ? -HALF_PI : HALF_PI;
  const stop = h.side === 1 ? HALF_PI : 3 * HALF_PI;
  arc(0, 0, d, d, start, stop);
  // detalle interno suave
  fill(255, 255, 255, 30);
  arc(0, 0, d * 0.65, d * 0.65, start, stop);
  pop();
};

FruitSystem.prototype.draw = function () {
  for (const f of this.items) {
    if (!f.alive || f.cut) continue;
    this.drawFruit(f);
  }
  for (const h of this.halves) {
    if (!h.alive) continue;
    const a = h.life / h.maxLife;
    const rgb = hexToRgb(h.color);
    push();
    translate(h.x, h.y);
    rotate(h.angle);
    noStroke();
    fill(rgb[0], rgb[1], rgb[2], a * 255);
    const d = h.r * 1.85;
    const start = h.side === 1 ? -HALF_PI : HALF_PI;
    const stop = h.side === 1 ? HALF_PI : 3 * HALF_PI;
    arc(0, 0, d, d, start, stop);
    pop();
  }
};

// ---------- Partículas (pool reutilizable, espec. §10) ----------

function ParticleSystem() {
  this.max = CONFIG.maxParticles;
  this.pool = [];
  for (let i = 0; i < this.max; i++) this.pool.push(this.newDead());
}

ParticleSystem.prototype.newDead = function () {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, r: 0, g: 0, b: 0, active: false };
};

ParticleSystem.prototype.spawn = function (x, y, color, count) {
  const rgb = Array.isArray(color) ? color : hexToRgb(color || '#ffffff');
  let spawned = 0;
  for (const p of this.pool) {
    if (!p.active) {
      p.x = x;
      p.y = y;
      p.vx = random(-5, 5);
      p.vy = random(-7, -0.5);
      p.life = random(CONFIG.particleLifeFrames * 0.6, CONFIG.particleLifeFrames);
      p.maxLife = p.life;
      p.r = rgb[0];
      p.g = rgb[1];
      p.b = rgb[2];
      p.active = true;
      spawned++;
    }
    if (spawned >= count) break;
  }
};

ParticleSystem.prototype.update = function () {
  for (const p of this.pool) {
    if (!p.active) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.14;
    p.life--;
    if (p.life <= 0) p.active = false;
  }
};

ParticleSystem.prototype.draw = function () {
  noStroke();
  for (const p of this.pool) {
    if (!p.active) continue;
    const a = p.life / p.maxLife;
    fill(p.r, p.g, p.b, a * 220);
    const s = 3 + a * 2;
    rect(p.x, p.y, s, s);
  }
};

// game.js — Estado del juego, puntuación, dificultad, colisiones de corte (espec. §5, §7, §15)
// Está desacoplado de handTracking.js: solo recibe la posición del cuchillo.

function distSegmentPoint(x1, y1, x2, y2, px, py) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = constrain(t, 0, 1);
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

function Game() {
  this.reset();
}

Game.prototype.reset = function () {
  this.state = 'START'; // START | PLAYING | PAUSED | GAMEOVER
  this.score = 0;
  this.best = 0;
  this.lives = CONFIG.maxLives;
  this.streak = 0;
  this.cuts = 0;
  this.cutsSinceDifficulty = 0;
  this.speedBonus = 0;
  this.spawnInterval = CONFIG.spawnInterval;
  this.lastSpawn = 0;
  this.msg = '';
  this.msgUntil = 0;
  this.noHandSince = null;
  this.startBtn = null;
  this.restartBtn = null;
};

Game.prototype.start = function () {
  this.state = 'PLAYING';
  this.score = 0;
  this.best = Math.max(this.best, this.score); // se actualiza al morir realmente; aquí solo conserva
  this.lives = CONFIG.maxLives;
  this.streak = 0;
  this.cuts = 0;
  this.cutsSinceDifficulty = 0;
  this.speedBonus = 0;
  this.spawnInterval = CONFIG.spawnInterval;
  this.msg = '';
  this.noHandSince = null;
  fruits.items = [];
  fruits.halves = [];
  particles.pool.forEach(p => (p.active = false));
  this.lastSpawn = millis();
};

Game.prototype.isPlaying = function () {
  return this.state === 'PLAYING';
};

Game.prototype.addScore = function (pts) {
  this.score += pts;
  this.cuts++;
  this.streak++;
  if (this.streak % CONFIG.streakThreshold === 0) {
    this.score += CONFIG.streakBonus;
    this.showMsg('Racha x' + this.streak);
  }
  this.maybeRiseDifficulty();
};

Game.prototype.maybeRiseDifficulty = function () {
  this.cutsSinceDifficulty++;
  if (this.cutsSinceDifficulty >= CONFIG.difficultyEveryCuts) {
    this.cutsSinceDifficulty = 0;
    this.speedBonus += CONFIG.difficultySpeedStep;
    this.spawnInterval = max(
      CONFIG.spawnIntervalMin,
      this.spawnInterval * CONFIG.difficultySpawnStep
    );
  }
};

Game.prototype.loseLife = function () {
  this.lives--;
  this.streak = 0;
  if (this.lives <= 0) {
    this.lives = 0;
    this.state = 'GAMEOVER';
    this.best = Math.max(this.best, this.score);
    stopDetection();
  }
};

Game.prototype.missFruit = function (f) {
  f.alive = false;
  this.loseLife();
  this.showMsg('Fruta perdida');
};

Game.prototype.showMsg = function (msg, t) {
  this.msg = msg;
  this.msgUntil = millis() + (t || 1400);
};

Game.prototype.cutFruit = function (f) {
  const result = fruits.cut(f, knife.angle);
  if (f.kind === 'bomb') {
    this.loseLife();
    particles.spawn(f.x, f.y, [120, 120, 120], 10);
    this.showMsg('¡Bomba! -1 vida');
  } else if (f.kind === 'golden') {
    this.addScore(CONFIG.pointsGolden);
    this.showMsg('Fruta dorada ×3');
  } else if (f.kind === 'heart') {
    this.lives = constrain(this.lives + 1, 0, CONFIG.maxLives);
    this.showMsg('¡+1 vida!');
  } else {
    this.addScore(CONFIG.pointsFruit);
  }
};

Game.prototype.update = function () {
  if (this.state === 'START' || this.state === 'GAMEOVER') return;
  if (this.state === 'PAUSED') return;

  const now = millis();

  // Aparición de frutas (espec. §6)
  if (
    now - this.lastSpawn > this.spawnInterval &&
    fruits.items.length < CONFIG.maxFruits
  ) {
    fruits.spawn(this.speedBonus);
    this.lastSpawn = now;
    this.spawnInterval = constrain(
      random(CONFIG.spawnIntervalMin, this.spawnInterval * 0.96 + 80),
      CONFIG.spawnIntervalMin,
      CONFIG.spawnInterval
    );
  }

  // Detección de cortes: segmento del cuchillo vs zona de colisión de cada fruta (espec. §5, §14.4)
  if (
    knife.active &&
    knife.speed >= CONFIG.minCutSpeed &&
    knife.prev
  ) {
    for (let i = fruits.items.length - 1; i >= 0; i--) {
      const f = fruits.items[i];
      if (!f.alive || f.cut) continue;
      const d = distSegmentPoint(
        knife.prev.x,
        knife.prev.y,
        knife.x,
        knife.y,
        f.x,
        f.y
      );
      if (d <= f.r + 6) this.cutFruit(f);
    }
  }

  // Frutas que salen de la pantalla sin cortar = fallo (excepto bombas, espec. §15)
  for (let i = fruits.items.length - 1; i >= 0; i--) {
    const f = fruits.items[i];
    if (!f.alive) continue;
    if (
      f.y > height + f.r + 45 &&
      now - f.born > CONFIG.missGraceMs &&
      f.kind !== 'bomb'
    ) {
      this.missFruit(f);
    }
  }

  fruits.update();
  particles.update();
};

Game.prototype.drawHUD = function () {
  const now = millis();

  // Puntuación
  fill(255);
  textSize(20);
  textStyle(BOLD);
  text('Puntos: ' + this.score, 30, 30);

  // Vidas
  textSize(16);
  textStyle(NORMAL);
  fill(255, 120, 140);
  text('Vidas', width - 90, 30);
  for (let i = 0; i < this.lives; i++) {
    fill(255, 80, 100);
    noStroke();
    circle(width - 60 + i * 18, 30, 12);
  }

  // Racha
  if (this.streak >= CONFIG.streakThreshold) {
    fill('#ffd600');
    textSize(16);
    textStyle(BOLD);
    text('Racha ×' + this.streak, width / 2, 30);
  }

  // Mensaje flotante
  if (this.msg && now < this.msgUntil) {
    fill(255);
    textSize(15);
    textStyle(NORMAL);
    text(this.msg, width / 2, height - 70);
  }

  textStyle(NORMAL);
};

// ---------- Pantallas ----------

Game.prototype.drawStart = function () {
  fill(0, 0, 0, 165);
  rect(0, 0, width, height);
  fill(255);
  textSize(46);
  textStyle(BOLD);
  text('FRUIT NINJA', width / 2, height / 2 - 70);
  textSize(17);
  fill('#bbcaff');
  textStyle(NORMAL);
  text('Corta frutas con la punta del índice', width / 2, height / 2 - 20);
  text('Evita las bombas y no dejes caer las frutas', width / 2, height / 2 + 2);
  this.startBtn = this.drawButton('INICIAR PARTIDA', width / 2, height / 2 + 62, 270, 48);
  fill('#8b98c4');
  textSize(14);
  text('CLIC o ESPACIO para empezar', width / 2, height - 34);
};

Game.prototype.drawGameOver = function () {
  fill(0, 0, 0, 175);
  rect(0, 0, width, height);
  fill('#ff6b6b');
  textSize(42);
  textStyle(BOLD);
  text('FIN DE PARTIDA', width / 2, height / 2 - 70);
  fill(255);
  textSize(20);
  textStyle(NORMAL);
  text('Puntuación: ' + this.score, width / 2, height / 2 - 20);
  text('Mejor: ' + this.best, width / 2, height / 2 + 10);
  this.restartBtn = this.drawButton('JUGAR DE NUEVO', width / 2, height / 2 + 62, 270, 48);
  fill('#8b98c4');
  textSize(14);
  text('CLIC o ESPACIO para reiniciar', width / 2, height - 34);
};

Game.prototype.drawPaused = function () {
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  fill(255);
  textSize(20);
  textStyle(BOLD);
  text('PAUSADO — mano no detectada', width / 2, height / 2 - 10);
  textSize(15);
  fill('#bbcaff');
  textStyle(NORMAL);
  text('Mostrá la mano para continuar', width / 2, height / 2 + 20);
};

Game.prototype.drawButton = function (label, x, y, w, h) {
  const mx = mouseX;
  const my = mouseY;
  const over = mx >= x - w / 2 && mx <= x + w / 2 && my >= y - h / 2 && my <= y + h / 2;
  fill(over ? '#7c5cff' : '#4a3fa0');
  noStroke();
  rect(x - w / 2, y - h / 2, w, h, 10);
  fill(255);
  textSize(17);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(label, x, y);
  textAlign(CENTER, CENTER);
  return { x: x - w / 2, y: y - h / 2, w: w, h: h };
};

let errors = 0;
// Globales que game.js lee como bare identifiers (espec. desacoplamiento §5)
var fruits = new FruitSystem();
var particles = new ParticleSystem();
fruits.particles = particles;
var knife = { active: false, speed: 0, prev: { x: 0, y: 0 }, x: 0, y: 0, angle: 0 };

function check(name, fn) {
  try {
    fn();
    console.log('PASS:', name);
  } catch (e) {
    errors++;
    console.error('FAIL:', name, '->', e.message);
  }
}

// ---------- Tests ----------
check('FruitSystem + ParticleSystem construyen', () => {
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  if (!fsys.items || !ps.pool) throw new Error('estructuras vacías');
});

check('spawn crea fruta viva', () => {
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fsys.spawn(0);
  if (fsys.items.length !== 1) throw new Error('no se spawnó: ' + fsys.items.length);
  const f = fsys.items[0];
  if (!f.alive || !f.x || !f.y || !f.r || !f.kind) throw new Error('fruta inválida');
  console.log('   tipo spawnado:', f.kind, 'r=', f.r.toFixed(1));
});

check('particles spawn y update no rompen', () => {
  const ps = new ParticleSystem();
  ps.spawn(100, 100, '#ff0000', 10);
  let act = ps.pool.filter(p => p.active).length;
  if (act !== 10) throw new Error('esperaba 10 activas, hay ' + act);
  ps.update(); ps.update();
  act = ps.pool.filter(p => p.active).length;
  if (act !== 10) throw new Error('partículas murieron demasiado rápido');
});

check('cut crea dos mitades y partículas', () => {
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fsys.spawn(0);
  const f = fsys.items[0];
  f.x = 300; f.y = 200;
  const res = fsys.cut(f, 0);
  if (!res) throw new Error('cut no devolvió resultado');
  if (fsys.halves.length !== 2) throw new Error('esperaba 2 mitades, hay ' + fsys.halves.length);
  if (f.cut !== true) throw new Error('fruta no marcada como cut');
  let act = ps.pool.filter(p => p.active).length;
  if (act === 0) throw new Error('no se spawnaron partículas');
  console.log('   resultado cut:', JSON.stringify(res), 'mitades:', fsys.halves.length, 'partículas:', act);
});

check('update de frutas mueve y cae por gravedad', () => {
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fsys.spawn(0);
  const f = fsys.items[0];
  const y0 = f.y, vy0 = f.vy;
  fsys.update();
  if (f.y >= y0) throw new Error('fruta no subió (vy debería ser negativa)');
  for (let i = 0; i < 40; i++) fsys.update();
  if (f.vy <= vy0) throw new Error('gravedad no aceleró la caída');
  console.log('   vy inicial:', vy0.toFixed(2), 'vy tras 40 frames:', f.vy.toFixed(2));
});

check('fruta que sale de pantalla se marca muerta (miss)', () => {
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fsys.spawn(0);
  const f = fsys.items[0];
  f.y = 10000;
  f.born = Date.now() - 2000;
  fsys.update();
  if (f.alive) throw new Error('fruta fuera de pantalla sigue viva');
});

check('distSegmentPoint detecta colisión', () => {
  const d0 = distSegmentPoint(0, 100, 100, 100, 50, 100);
  if (d0 !== 0) throw new Error('distancia debería ser 0, es ' + d0);
  const d1 = distSegmentPoint(0, 100, 100, 100, 200, 100);
  if (d1 <= 0) throw new Error('distancia debería ser >0');
  const d2 = distSegmentPoint(0, 100, 100, 100, 100, 105);
  if (d2 > 6) throw new Error('distancia al extremo debería ser pequeña, es ' + d2);
  console.log('   d0=', d0, 'd1=', d1.toFixed(2), 'd2=', d2.toFixed(2));
});

// --- Lógica de juego ---
check('Game resetea y comienza', () => {
  const g = new Game();
  if (g.state !== 'START') throw new Error('estado inicial debería ser START, es ' + g.state);
  if (g.score !== 0 || g.lives !== 3) throw new Error('score/vidas iniciales erróneas');
  g.start();
  if (g.state !== 'PLAYING') throw new Error('tras start debería ser PLAYING');
  if (g.lives !== 3) throw new Error('vidas al iniciar deberían ser 3');
});

check('cortar fruta suma puntos una vez', () => {
  const g = new Game();
  g.start();
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fruits = fsys; particles = ps;
  knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  fsys.spawn(0);
  const f = fsys.items[0];
  f.x = 300; f.y = 200; f.r = 25;
  const s0 = g.score;
  g.update();
  if (g.score <= s0) throw new Error('puntuación no aumentó tras cortar');
  if (f.cut !== true) throw new Error('fruta no cortada');
  const s1 = g.score;
  g.update();
  if (g.score !== s1) throw new Error('puntuación sumó dos veces la misma fruta');
  console.log('   score tras corte:', s1);
});

check('cortar bomba resta una vida', () => {
  const g = new Game();
  g.start();
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fruits = fsys; particles = ps;
  knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'bomb'; f.type = 'bomb'; f.x = 300; f.y = 200; f.r = 25;
  const v0 = g.lives;
  g.update();
  if (g.lives !== v0 - 1) throw new Error('bomba no restó vida: ' + g.lives + '/' + v0);
  console.log('   vidas tras bomba:', g.lives);
});

check('fruta que se escapa resta vida', () => {
  const g = new Game();
  g.start();
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fruits = fsys; particles = ps;
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'apple'; f.x = 300; f.y = 2000; f.r = 25; f.vy = 50; f.born = millis() - 2000;
  const v0 = g.lives;
  g.update();
  if (g.lives !== v0 - 1) throw new Error('fruta escape no restó vida: ' + g.lives + '/' + v0);
  console.log('   vidas tras escape:', g.lives);
});

check('agotar vidas -> GAMEOVER y puede reiniciar', () => {
  const g = new Game();
  g.start();
  g.lives = 1;
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fruits = fsys; particles = ps;
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'apple'; f.x = 300; f.y = 2000; f.r = 25; f.vy = 50; f.born = millis() - 2000;
  g.update();
  if (g.state !== 'GAMEOVER') throw new Error('debería ser GAMEOVER, es ' + g.state);
  g.start();
  if (g.state !== 'PLAYING') throw new Error('no se reinició');
  if (g.lives !== 3) throw new Error('vidas tras reinicio deberían ser 3');
  console.log('   tras reinicio: state=', g.state, 'vidas=', g.lives);
});

check('bomba que se escapa NO resta vida (espec. §15)', () => {
  const g = new Game();
  g.start();
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fruits = fsys; particles = ps;
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'bomb'; f.x = 300; f.y = 2000; f.r = 25; f.vy = 50; f.born = millis() - 2000;
  const v0 = g.lives;
  g.update();
  if (g.lives !== v0) throw new Error('bomba escape no debería restar vida: ' + g.lives + '/' + v0);
  console.log('   vidas tras escape de bomba:', g.lives);
});

check('fruta dorada da puntos extra', () => {
  const g = new Game();
  g.start();
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fruits = fsys; particles = ps;
  knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'golden'; f.x = 300; f.y = 200; f.r = 25;
  const s0 = g.score;
  g.update();
  if (g.score !== s0 + 300) throw new Error('dorada debería dar 300, score=' + g.score);
  console.log('   score tras dorada:', g.score);
});

check('fruta corazón recupera vida (hasta el máximo)', () => {
  const g = new Game();
  g.start();
  g.lives = 2;
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fruits = fsys; particles = ps;
  knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'heart'; f.x = 300; f.y = 200; f.r = 25;
  g.update();
  if (g.lives !== 3) throw new Error('corazón debería subir a 3, es ' + g.lives);
  g.update();
  if (g.lives !== 3) throw new Error('corazón excede el máximo de vidas');
  console.log('   vidas tras corazón:', g.lives);
});

check('racha otorga bono', () => {
  const g = new Game();
  g.start();
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fruits = fsys; particles = ps;
  knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  for (let i = 0; i < 5; i++) {
    fsys.spawn(0);
    const f = fsys.items[0];
    f.kind = 'apple'; f.x = 300; f.y = 200; f.r = 25;
    g.update();
  }
  if (g.streak < 5) throw new Error('racha debería ser >=5, es ' + g.streak);
  console.log('   racha:', g.streak, 'score:', g.score);
});

check('dificultad aumenta tras N cortes', () => {
  const g = new Game();
  g.start();
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  fruits = fsys; particles = ps;
  knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  const iv0 = g.spawnInterval;
  const sb0 = g.speedBonus;
  for (let i = 0; i < 40; i++) {
    fsys.spawn(0);
    const f = fsys.items[0];
    f.kind = 'apple'; f.x = 300; f.y = 200; f.r = 25; // bajo el cuchillo → se corta
    g.update();
  }
  if (g.speedBonus <= sb0) throw new Error('dificultad no aumentó (speedBonus)');
  if (g.spawnInterval >= iv0) throw new Error('dificultad no aumentó (spawnInterval)');
  console.log('   speedBonus:', g.speedBonus, 'spawnInterval:', g.spawnInterval.toFixed(0));
});

console.log('\n=== RESULTADO: ' + (errors === 0 ? 'TODOS LOS TESTS PASARON' : errors + ' TESTS FALLARON') + ' ===');
process.exit(errors === 0 ? 0 : 1);

