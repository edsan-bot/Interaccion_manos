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
  this.state = "START"; // START | PLAYING | PAUSED | GAMEOVER
  this.score = 0;
  this.best = 0;
  this.lives = CONFIG.maxLives;
  this.streak = 0;
  this.cuts = 0;
  this.cutsSinceDifficulty = 0;
  this.speedBonus = 0;
  this.spawnInterval = CONFIG.spawnInterval;
  this.lastSpawn = 0;
  this.msg = "";
  this.msgUntil = 0;
  this.noHandSince = null;
  this.startBtn = null;
  this.restartBtn = null;
};

Game.prototype.start = function () {
  this.state = "PLAYING";
  this.score = 0;
  this.best = Math.max(this.best, this.score); // se actualiza al morir realmente; aquí solo conserva
  this.lives = CONFIG.maxLives;
  this.streak = 0;
  this.cuts = 0;
  this.cutsSinceDifficulty = 0;
  this.speedBonus = 0;
  this.spawnInterval = CONFIG.spawnInterval;
  this.msg = "";
  this.noHandSince = null;
  fruits.items = [];
  fruits.halves = [];
  particles.pool.forEach((p) => (p.active = false));
  this.lastSpawn = millis();
};

Game.prototype.isPlaying = function () {
  return this.state === "PLAYING";
};

Game.prototype.addScore = function (pts) {
  this.score += pts;
  this.cuts++;
  this.streak++;
  if (this.streak % CONFIG.streakThreshold === 0) {
    this.score += CONFIG.streakBonus;
    this.showMsg("Racha x" + this.streak);
  }
  this.maybeRiseDifficulty();
};

Game.prototype.maybeRiseDifficulty = function () {
  this.cutsSinceDifficulty++;
  if (this.cutsSinceDifficulty >= CONFIG.difficultyEveryCuts) {
    this.cutsSinceDifficulty = 0;
    // Tope: con más de +3 la fruta sale disparada por encima del canvas y deja
    // de ser alcanzable. La dificultad sigue subiendo por frecuencia de aparición.
    this.speedBonus = min(
      this.speedBonus + CONFIG.difficultySpeedStep,
      CONFIG.difficultySpeedMaxBonus,
    );
    this.spawnInterval = max(
      CONFIG.spawnIntervalMin,
      this.spawnInterval * CONFIG.difficultySpawnStep,
    );
  }
};

Game.prototype.loseLife = function () {
  this.lives--;
  this.streak = 0;
  if (this.lives <= 0) {
    this.lives = 0;
    this.state = "GAMEOVER";
    this.best = Math.max(this.best, this.score);
    stopDetection();
  }
};

Game.prototype.missFruit = function (f) {
  f.alive = false;
  this.loseLife();
  this.showMsg("Fruta perdida");
};

Game.prototype.showMsg = function (msg, t) {
  this.msg = msg;
  this.msgUntil = millis() + (t || 1400);
};

Game.prototype.cutFruit = function (f) {
  const result = fruits.cut(f, knife.angle);
  if (f.kind === "bomb") {
    this.loseLife();
    particles.spawn(f.x, f.y, [120, 120, 120], 10);
    this.showMsg("¡Bomba! -1 vida");
  } else if (f.kind === "golden") {
    this.addScore(CONFIG.pointsGolden);
    this.showMsg("Fruta dorada ×3");
  } else if (f.kind === "heart") {
    this.lives = constrain(this.lives + 1, 0, CONFIG.maxLives);
    this.showMsg("¡+1 vida!");
  } else {
    this.addScore(CONFIG.pointsFruit);
  }
};

Game.prototype.update = function () {
  if (this.state === "START" || this.state === "GAMEOVER") return;
  if (this.state === "PAUSED") return;

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
      CONFIG.spawnInterval,
    );
  }

  // Detección de cortes: segmento del cuchillo vs zona de colisión de cada fruta (espec. §5, §14.4)
  if (knife.active && knife.speed >= CONFIG.minCutSpeed && knife.prev) {
    for (let i = fruits.items.length - 1; i >= 0; i--) {
      const f = fruits.items[i];
      if (!f.alive || f.cut) continue;
      const d = distSegmentPoint(
        knife.prev.x,
        knife.prev.y,
        knife.x,
        knife.y,
        f.x,
        f.y,
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
      f.kind !== "bomb"
    ) {
      this.missFruit(f);
    }
  }

  fruits.update();
  particles.update();
};

Game.prototype.drawHUD = function () {
  const now = millis();

  // Puntuación (izquierda: centrada en x=30 se salía del canvas)
  fill(255);
  textSize(20);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text("Puntos: " + this.score, 16, 30);

  // Vidas
  textSize(16);
  textStyle(NORMAL);
  fill(255, 120, 140);
  textAlign(CENTER, CENTER);
  text("Vidas", width - 90, 30);
  for (let i = 0; i < this.lives; i++) {
    fill(255, 80, 100);
    noStroke();
    circle(width - 60 + i * 18, 30, 12);
  }

  // Racha
  if (this.streak >= CONFIG.streakThreshold) {
    fill("#ffd600");
    textSize(16);
    textStyle(BOLD);
    text("Racha ×" + this.streak, width / 2, 30);
  }

  // Mensaje flotante
  if (this.msg && now < this.msgUntil) {
    fill(255);
    textSize(15);
    textStyle(NORMAL);
    text(this.msg, width / 2, height - 70);
  }

  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
};

// ---------- Pantallas ----------

Game.prototype.drawStart = function () {
  fill(0, 0, 0, 165);
  rect(0, 0, width, height);
  fill(255);
  textSize(46);
  textStyle(BOLD);
  text("FRUIT NINJA", width / 2, height / 2 - 70);
  textSize(17);
  fill("#bbcaff");
  textStyle(NORMAL);
  text("Corta frutas con la punta del índice", width / 2, height / 2 - 20);
  text(
    "Evita las bombas y no dejes caer las frutas",
    width / 2,
    height / 2 + 2,
  );
  this.startBtn = this.drawButton(
    "INICIAR PARTIDA",
    width / 2,
    height / 2 + 62,
    270,
    48,
  );
  fill("#8b98c4");
  textSize(14);
  text("CLIC o ESPACIO para empezar", width / 2, height - 34);
};

Game.prototype.drawGameOver = function () {
  fill(0, 0, 0, 175);
  rect(0, 0, width, height);
  fill("#ff6b6b");
  textSize(42);
  textStyle(BOLD);
  text("FIN DE PARTIDA", width / 2, height / 2 - 70);
  fill(255);
  textSize(20);
  textStyle(NORMAL);
  text("Puntuación: " + this.score, width / 2, height / 2 - 20);
  text("Mejor: " + this.best, width / 2, height / 2 + 10);
  this.restartBtn = this.drawButton(
    "JUGAR DE NUEVO",
    width / 2,
    height / 2 + 62,
    270,
    48,
  );
  fill("#8b98c4");
  textSize(14);
  text("CLIC o ESPACIO para reiniciar", width / 2, height - 34);
};

Game.prototype.drawPaused = function () {
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  fill(255);
  textSize(20);
  textStyle(BOLD);
  text("PAUSADO — mano no detectada", width / 2, height / 2 - 10);
  textSize(15);
  fill("#bbcaff");
  textStyle(NORMAL);
  text("Mostrá la mano para continuar", width / 2, height / 2 + 20);
};

Game.prototype.drawButton = function (label, x, y, w, h) {
  const mx = mouseX;
  const my = mouseY;
  const over =
    mx >= x - w / 2 && mx <= x + w / 2 && my >= y - h / 2 && my <= y + h / 2;
  fill(over ? "#7c5cff" : "#4a3fa0");
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
