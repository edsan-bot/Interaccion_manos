var fruits = new FruitSystem();
var particles = new ParticleSystem();
fruits.particles = particles;
var knife = { active: false, speed: 0, prev: { x: 0, y: 0 }, x: 0, y: 0, angle: 0 };
var g = new Game();
g.start();
console.log('tras start: state=', g.state, 'lives=', g.lives);
g.lives = 1;
console.log('tras set lives=1: lives=', g.lives);

fruits = new FruitSystem();
particles = new ParticleSystem();
fruits.particles = particles;
fruits.spawn(0);
var f = fruits.items[0];
f.kind = 'apple'; f.x = 300; f.y = 2000; f.r = 25; f.vy = 50; f.born = millis() - 2000;
console.log('fruta: y=', f.y, 'born=', f.born, 'now=', millis(), 'now-born=', millis() - f.born);
console.log('condicion miss:', f.y > height + f.r + 45, (millis() - f.born) > CONFIG.missGraceMs, f.kind !== 'bomb');

g.update();
console.log('tras update: state=', g.state, 'lives=', g.lives);
