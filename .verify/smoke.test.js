// Smoke test de lógica del juego (sin navegador ni cámara)
// Carga fruit.js y game.js en un sandbox con stubs mínimos de p5 y ml5.

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const sandbox = {
  width: 640,
  height: 480,
  console,
  // stubs de p5 usados por fruit.js / game.js
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  random: (a, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
  floor: Math.floor,
  constrain: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  TWO_PI: Math.PI * 2,
  PI: Math.PI,
  HALF_PI: Math.PI / 2,
  millis: (() => { let t = Date.now(); return () => Date.now() - t; })(),
  CONFIG: {
    canvasW: 640, canvasH: 480,
    maxHands: 1, modelType: 'lite', flipHorizontal: true,
    smoothingAlpha: 0.4, minCutSpeed: 130, noHandPauseMs: 1200,
    gravity: 0.38, spawnSpeedBase: 7.5, spawnSpeedMax: 12,
    spawnInterval: 750, spawnIntervalMin: 330, maxFruits: 9, missGraceMs: 700,
    difficultyEveryCuts: 12, difficultySpeedStep: 1.5, difficultySpawnStep: 0.88,
    maxLives: 3, pointsFruit: 100, pointsGolden: 300, streakThreshold: 5, streakBonus: 250,
    probBomb: 0.07, probGolden: 0.05, probHeart: 0.04,
    maxParticles: 240, particleLifeFrames: 42
  },
  // minúsculas que p5 expone y algunos archivos usan en draw (no las llamamos, pero las definimos por si acaso)
  createCanvas: () => {},
  image: () => {},
  fill: () => {},
  noStroke: () => {},
  rect: () => {},
  circle: () => {},
  ellipse: () => {},
  triangle: () => {},
  arc: () => {},
  push: () => {},
  pop: () => {},
  translate: () => {},
  rotate: () => {},
  stroke: () => {},
  strokeWeight: () => {},
  text: () => {},
  textSize: () => {},
  textStyle: () => {},
  textAlign: () => {},
  line: () => {},
};

vm.createContext(sandbox);
sandbox.fruits = undefined;
sandbox.particles = undefined;
sandbox.knife = undefined;
function load(file) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  return vm.runInContext(code, sandbox, { filename: file });
}

load('fruit.js');
load('game.js');

const FruitSystem = sandbox.FruitSystem;
const ParticleSystem = sandbox.ParticleSystem;
const Game = sandbox.Game;
const distSegmentPoint = sandbox.distSegmentPoint;

let errors = 0;
function check(name, fn) {
  try {
    fn();
    console.log('PASS:', name);
  } catch (e) {
    errors++;
    console.error('FAIL:', name, '->', e.message);
  }
}

// --- Inicializar sistemas ---
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
  console.log('   tipo spawnado:', f.kind, 'r=', f.r);
});

check('particles spawn y update no rompen', () => {
  const ps = new ParticleSystem();
  ps.spawn(100, 100, '#ff0000', 10);
  let act = ps.pool.filter(p => p.active).length;
  if (act !== 10) throw new Error('esperaba 10 activas, hay ' + act);
  ps.update();
  ps.update();
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
  // particles spawnó
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
  // tras varios updates cae
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
  f.y = 10000; // fuera de pantalla
  f.born = Date.now() - 2000;
  fsys.update();
  if (f.alive) throw new Error('fruta fuera de pantalla sigue viva');
});

check('distSegmentPoint detecta colisión', () => {
  // segmento horizontal y=100 de x=0 a x=100, punto en (50,100) -> distancia 0
  const d0 = distSegmentPoint(0, 100, 100, 100, 50, 100);
  if (d0 !== 0) throw new Error('distancia debería ser 0, es ' + d0);
  // punto lejos -> distancia > 0
  const d1 = distSegmentPoint(0, 100, 100, 100, 200, 100);
  if (d1 <= 0) throw new Error('distancia debería ser >0');
  // punto cerca del extremo
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
  sandbox.fruits = fsys;
  sandbox.particles = ps;
  sandbox.knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  fsys.spawn(0);
  const f = fsys.items[0];
  f.x = 300; f.y = 200; f.r = 25;
  const s0 = g.score;
  g.update();
  if (g.score <= s0) throw new Error('puntuación no aumentó tras cortar');
  if (f.cut !== true) throw new Error('fruta no cortada');
  // segundo update: ya no debe sumar (cut=true)
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
  sandbox.fruits = fsys;
  sandbox.particles = ps;
  sandbox.knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'bomb'; f.type = 'bomb'; f.x = 300; f.y = 200; f.r = 25;
  const v0 = g.lives;
  g.update();
  if (g.lives !== v0 - 1) throw new Error('bomba no restó vida: ' + g.lives + '/' + v0);
  if (g.state !== 'PLAYING' && g.lives > 0) throw new Error('estado inesperado tras bomba');
  console.log('   vidas tras bomba:', g.lives);
});

check('fruta que se escapa resta vida', () => {
  const g = new Game();
  g.start();
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  sandbox.fruits = fsys;
  sandbox.particles = ps;
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'apple'; f.x = 300; f.y = 2000; f.r = 25; f.vy = 50; f.born = Date.now() - 2000;
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
  sandbox.fruits = fsys;
  sandbox.particles = ps;
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'apple'; f.x = 300; f.y = 2000; f.r = 25; f.vy = 50; f.born = Date.now() - 2000;
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
  sandbox.fruits = fsys;
  sandbox.particles = ps;
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'bomb'; f.x = 300; f.y = 2000; f.r = 25; f.vy = 50; f.born = Date.now() - 2000;
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
  sandbox.fruits = fsys;
  sandbox.particles = ps;
  sandbox.knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
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
  sandbox.fruits = fsys;
  sandbox.particles = ps;
  sandbox.knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  fsys.spawn(0);
  const f = fsys.items[0];
  f.kind = 'heart'; f.x = 300; f.y = 200; f.r = 25;
  g.update();
  if (g.lives !== 3) throw new Error('corazón debería subir a 3, es ' + g.lives);
  g.update(); // otra corazón con vida llena no supera el max
  if (g.lives !== 3) throw new Error('corazón excede el máximo de vidas');
  console.log('   vidas tras corazón:', g.lives);
});

check('racha otorga bono', () => {
  const g = new Game();
  g.start();
  const fsys = new FruitSystem();
  const ps = new ParticleSystem();
  fsys.particles = ps;
  sandbox.fruits = fsys;
  sandbox.particles = ps;
  sandbox.knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  // cortar 5 frutas rápido (misma posición, nuevas frutas cada vez)
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
  sandbox.fruits = fsys;
  sandbox.particles = ps;
  sandbox.knife = { active: true, speed: 500, prev: { x: 300, y: 200 }, x: 300, y: 200, angle: 0 };
  const iv0 = g.spawnInterval;
  const sb0 = g.speedBonus;
  for (let i = 0; i < 25; i++) {
    fsys.spawn(0);
    const f = fsys.items[0];
    f.kind = 'apple'; f.x = 300; f.y = 200; f.r = 25;
    g.update();
  }
  if (g.speedBonus <= sb0) throw new Error('dificultad no aumentó (speedBonus)');
  if (g.spawnInterval >= iv0) throw new Error('dificultad no aumentó (spawnInterval)');
  console.log('   speedBonus:', g.speedBonus, 'spawnInterval:', g.spawnInterval.toFixed(0));
});

console.log('\n=== RESULTADO: ' + (errors === 0 ? 'TODOS LOS TESTS PASARON' : errors + ' TESTS FALLARON') + ' ===');
process.exit(errors === 0 ? 0 : 1);
