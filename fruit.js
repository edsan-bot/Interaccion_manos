// fruit.js — Sistema de frutas, bombas, especiales, mitades y partículas
// Todas las frutas comparten la misma estructura de datos (espec. §6, §14.4).

const TYPE_NAMES = [
  "watermelon",
  "orange",
  "apple",
  "banana",
  "strawberry",
  "pineapple",
];

function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return [255, 255, 255];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function fruitTypeTable() {
  return {
    watermelon: {
      fill: "#2e7d32",
      fill2: "#1b5e20",
      score: CONFIG.pointsFruit,
      kind: "fruit",
      prob: 1.0,
    },
    orange: {
      fill: "#fb8c00",
      fill2: "#ef6c00",
      score: CONFIG.pointsFruit,
      kind: "fruit",
      prob: 1.0,
    },
    apple: {
      fill: "#d32f2f",
      fill2: "#b71c1c",
      score: CONFIG.pointsFruit,
      kind: "fruit",
      prob: 1.0,
    },
    banana: {
      fill: "#fdd835",
      fill2: "#fbc02d",
      score: CONFIG.pointsFruit,
      kind: "fruit",
      prob: 1.0,
    },
    strawberry: {
      fill: "#e53935",
      fill2: "#c62828",
      score: CONFIG.pointsFruit,
      kind: "fruit",
      prob: 1.0,
    },
    pineapple: {
      fill: "#fbc02d",
      fill2: "#f9a825",
      score: CONFIG.pointsFruit,
      kind: "fruit",
      prob: 1.0,
    },
    bomb: {
      fill: "#212121",
      fill2: "#000000",
      score: 0,
      kind: "bomb",
      prob: CONFIG.probBomb,
    },
    golden: {
      fill: "#ffd600",
      fill2: "#fff176",
      score: CONFIG.pointsGolden,
      kind: "golden",
      prob: CONFIG.probGolden,
    },
    heart: {
      fill: "#ec407a",
      fill2: "#c2185b",
      score: 0,
      kind: "heart",
      prob: CONFIG.probHeart,
    },
  };
}

function pickFruitType() {
  const r = random();
  const t = fruitTypeTable();
  if (r < t.heart.prob) return "heart";
  if (r < t.heart.prob + t.golden.prob) return "golden";
  if (r < t.heart.prob + t.golden.prob + t.bomb.prob) return "bomb";
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
  const r = kind === "banana" ? random(18, 28) : random(20, 30);
  const x = random(r, width - r);
  const y = height + r + random(0, 50);
  const vx = random(-1.3, 1.3);
  const vy = -(
    random(CONFIG.spawnSpeedBase, CONFIG.spawnSpeedMax) + speedBonus
  );
  // Semillas de la fresa: se calculan una sola vez al aparecer. Si se sortearan
  // en drawFruit() cambiarían en cada frame y la fruta parpadearía.
  const speckles = [];
  if (kind === "strawberry") {
    for (let i = 0; i < 5; i++) {
      speckles.push({ x: random(-0.5, 0.5), y: random(-0.5, 0.5) });
    }
  }
  this.items.push({
    x,
    y,
    vx,
    vy,
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
    score: t.score,
    speckles: speckles,
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
    x: f.x + nx * sep,
    y: f.y + ny * sep,
    vx: f.vx - nx * pushSpd,
    vy: f.vy - ny * pushSpd - 1.5,
    r: f.r,
    angle: f.angle,
    spin: f.spin * 1.6 + 0.05,
    life: 90,
    maxLife: 90,
    color: f.color,
    fill2: f.fill2,
    kind: f.kind,
    side: 1,
  });
  this.halves.push({
    x: f.x - nx * sep,
    y: f.y - ny * sep,
    vx: f.vx + nx * pushSpd,
    vy: f.vy + ny * pushSpd - 1.5,
    r: f.r,
    angle: f.angle + PI,
    spin: f.spin * 1.6 - 0.05,
    life: 90,
    maxLife: 90,
    color: f.color,
    fill2: f.fill2,
    kind: f.kind,
    side: -1,
  });
  if (this.particles) {
    const n = f.kind === "golden" ? 30 : f.kind === "heart" ? 25 : 20;
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
  if (f.kind === "banana") {
    fill(t.fill);
    ellipse(0, 0, d, d * 0.62);
    fill(t.fill2);
    ellipse(-f.r * 0.28, 0, f.r * 0.55, f.r * 0.3);
    rect(-f.r * 0.22, -f.r * 0.28, f.r * 0.45, f.r * 0.14);
  } else if (f.kind === "pineapple") {
    fill(t.fill);
    circle(0, 0, d);
    fill(0, 0, 0, 40);
    for (let j = -1; j <= 1; j++) {
      line(-f.r * 0.7, j * f.r * 0.35, f.r * 0.7, j * f.r * 0.35);
      line(j * f.r * 0.35, -f.r * 0.7, j * f.r * 0.35, f.r * 0.7);
    }
    fill("#388e3c");
    rect(-f.r * 0.35, -f.r * 1.05, f.r * 0.7, f.r * 0.5);
  } else if (f.kind === "bomb") {
    fill(t.fill);
    circle(0, 0, d);
    fill("#ff9800");
    rect(-f.r * 0.12, -f.r * 1.12, f.r * 0.24, f.r * 0.28);
    fill(255, 220, 0, 180);
    circle(-f.r * 0.28, -f.r * 1.18, f.r * 0.14);
  } else if (f.kind === "heart") {
    fill(t.fill);
    const s = f.r * 0.55;
    circle(-s * 0.55, -s * 0.25, s);
    circle(s * 0.55, -s * 0.25, s);
    triangle(-s * 1.05, s * 0.05, s * 1.05, s * 0.05, 0, s * 1.45);
  } else if (f.kind === "strawberry") {
    fill(t.fill);
    ellipse(0, 0, d * 0.9, d * 1.05);
    fill("#388e3c");
    rect(-f.r * 0.22, -f.r * 1.02, f.r * 0.44, f.r * 0.34);
    fill(0, 0, 0, 45);
    for (const s of f.speckles) {
      circle(s.x * f.r, s.y * f.r, f.r * 0.12);
    }
  } else {
    // watermelon, orange, apple, golden
    fill(t.fill);
    circle(0, 0, d);
    if (f.kind === "watermelon") {
      fill(t.fill2);
      arc(0, 0, d * 0.85, d * 0.85, 0.2 * PI, 0.8 * PI);
      fill("#ff5252");
      circle(-f.r * 0.35, -f.r * 0.1, f.r * 0.5);
    } else {
      fill(255, 255, 255, 55);
      ellipse(-f.r * 0.3, -f.r * 0.3, f.r * 0.55, f.r * 0.35);
    }
  }

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
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0,
    r: 0,
    g: 0,
    b: 0,
    active: false,
  };
};

ParticleSystem.prototype.spawn = function (x, y, color, count) {
  const rgb = Array.isArray(color) ? color : hexToRgb(color || "#ffffff");
  let spawned = 0;
  for (const p of this.pool) {
    if (!p.active) {
      p.x = x;
      p.y = y;
      p.vx = random(-5, 5);
      p.vy = random(-7, -0.5);
      p.life = random(
        CONFIG.particleLifeFrames * 0.6,
        CONFIG.particleLifeFrames,
      );
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
