// Smoke test de lógica del juego (sin navegador ni cámara).
// Usa eval para ejecutar fruit.js y game.js en el scope del módulo,
// con stubs mínimos de p5 definidos como variables del módulo.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// ---------- Stubs de p5 ----------
let width = 640, height = 480;
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const random = (a, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const floor = Math.floor;
const constrain = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const TWO_PI = Math.PI * 2;
const PI = Math.PI;
const HALF_PI = Math.PI / 2;
let _t0 = Date.now();
const millis = () => Date.now() - _t0;

// stubs de dibujo (no se llaman en estos tests, pero existen por si acaso)
const createCanvas = () => {};
const image = () => {};
const fill = () => {};
const noStroke = () => {};
const rect = () => {};
const circle = () => {};
const ellipse = () => {};
const triangle = () => {};
const arc = () => {};
const push = () => {};
const pop = () => {};
const translate = () => {};
const rotate = () => {};
const stroke = () => {};
const strokeWeight = () => {};
const text = () => {};
const textSize = () => {};
const textStyle = () => {};
const textAlign = () => {};
const line = () => {};

// ---------- Cargar archivos ----------
function load(name) {
  const code = fs.readFileSync(path.join(root, name), 'utf8');
  return eval(code); // ejecuta en el scope de este módulo (no-strict)
}

load('fruit.js');
load('game.js');

const FruitSystem = globalThis.FruitSystem;
const ParticleSystem = globalThis.ParticleSystem;
const Game = globalThis.Game;
const distSegmentPoint = globalThis.distSegmentPoint;

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
