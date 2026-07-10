class AudioEngine {
  constructor() { this.ctx = null; this.enabled = true; this.step = 0; }
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === "suspended") this.ctx.resume(); }
  tone(freq, duration = .08, type = "square", volume = .045, endFreq = freq) {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(this.ctx.destination); osc.start(now); osc.stop(now + duration);
  }
  shoot() { this.tone(780, .1, "square", .035, 180); }
  alienShoot() { this.tone(180, .13, "sawtooth", .025, 420); }
  move() { this.tone([90, 105, 125, 150][this.step++ % 4], .055, "square", .018); }
  hit() { this.tone(130, .12, "sawtooth", .04, 45); }
  bonus() { [660, 880, 1100].forEach((f, i) => setTimeout(() => this.tone(f, .1, "square", .035), i * 70)); }
  win() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.tone(f, .25, "triangle", .05), i * 130)); }
  lose() { [330, 247, 196, 110].forEach((f, i) => setTimeout(() => this.tone(f, .3, "sawtooth", .04), i * 160)); }
}

class Bullet {
  constructor(x, y, speed, enemy = false) { Object.assign(this, { x, y, speed, enemy, width: enemy ? 5 : 4, height: 13 }); }
  update(dt) { this.y += this.speed * dt; }
  draw(ctx) { ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = this.enemy ? "#ff4f9a" : "#66f6ff"; ctx.fillStyle = this.enemy ? "#ff79b5" : "#d9ffff"; ctx.fillRect(this.x, this.y, this.width, this.height); ctx.restore(); }
}

class Player {
  constructor(x, y) { Object.assign(this, { x, y, width: 46, height: 25, speed: 5.5 }); }
  draw(ctx) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.shadowBlur = 16; ctx.shadowColor = "#28e7ff";
    ctx.fillStyle = "#55ecff"; ctx.beginPath(); ctx.moveTo(23, 0); ctx.lineTo(30, 10); ctx.lineTo(43, 15); ctx.lineTo(46, 25); ctx.lineTo(0, 25); ctx.lineTo(3, 15); ctx.lineTo(16, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2b3872"; ctx.fillRect(18, 8, 10, 11); ctx.fillStyle = "#fff"; ctx.fillRect(21, 5, 4, 9); ctx.restore();
  }
}

class Invader {
  constructor(x, y, row) { Object.assign(this, { x, y, row, width: 34, height: 24 }); }
  draw(ctx, frame) {
    const colors = ["#ff70d2", "#a77aff", "#54e8ff"]; ctx.save(); ctx.translate(this.x, this.y); ctx.shadowBlur = 9; ctx.shadowColor = colors[this.row]; ctx.fillStyle = colors[this.row];
    ctx.fillRect(8, 3, 18, 4); ctx.fillRect(4, 7, 26, 12); ctx.fillRect(0, 11, 34, 6); ctx.fillRect(7, 19, 6, 5); ctx.fillRect(21, 19, 6, 5);
    ctx.fillStyle = "#101126"; ctx.fillRect(8, 10, 5, 5); ctx.fillRect(21, 10, 5, 5);
    if (frame) { ctx.fillStyle = colors[this.row]; ctx.fillRect(1, 20, 5, 4); ctx.fillRect(28, 20, 5, 4); } ctx.restore();
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.audio = new AudioEngine(); this.keys = {}; this.running = false; this.lastTime = 0;
    this.ui = { score: document.querySelector("#score"), lives: document.querySelector("#lives"), status: document.querySelector("#status"), panel: document.querySelector("#start-panel"), kicker: document.querySelector("#panel-kicker"), title: document.querySelector("#panel-title"), copy: document.querySelector("#panel-copy"), action: document.querySelector("#action-button") };
    this.background = new Image(); this.background.src = "assets/space-background.png"; this.setupControls(); this.reset();
  }
  reset() {
    this.player = new Player(this.canvas.width / 2 - 23, 430); this.bullets = []; this.enemyBullets = []; this.invaders = []; this.score = 0; this.lives = 3; this.direction = 1; this.speed = 25; this.drop = 17; this.shootCooldown = 0; this.enemyTimer = 1.1; this.moveSoundTimer = 0; this.ufo = null; this.ufoTimer = 6 + Math.random() * 5; this.ended = false; this.createInvaders(); this.updateHud();
  }
  createInvaders() { for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) this.invaders.push(new Invader(92 + col * 59, 68 + row * 47, row)); }
  setupControls() {
    addEventListener("keydown", e => { if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault(); this.keys[e.code] = true; if (e.code === "Space" && !e.repeat) this.shoot(); });
    addEventListener("keyup", e => { this.keys[e.code] = false; });
    document.querySelectorAll("[data-control]").forEach(button => {
      const control = button.dataset.control;
      const press = e => {
        e.preventDefault();
        button.setPointerCapture?.(e.pointerId);
        button.classList.add("is-active");
        if (control === "fire") this.shoot();
        else this.keys[control === "left" ? "ArrowLeft" : "ArrowRight"] = true;
      };
      const release = e => {
        e.preventDefault();
        button.classList.remove("is-active");
        if (control !== "fire") this.keys[control === "left" ? "ArrowLeft" : "ArrowRight"] = false;
      };
      button.addEventListener("pointerdown", press);
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => button.addEventListener(type, release));
    });
    const resetInputs = () => {
      this.keys.ArrowLeft = false;
      this.keys.ArrowRight = false;
      document.querySelectorAll(".touch-button.is-active").forEach(button => button.classList.remove("is-active"));
    };
    const syncViewport = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
      document.documentElement.dataset.orientation = innerWidth > innerHeight ? "landscape" : "portrait";
      resetInputs();
    };
    let viewportTimer;
    const scheduleViewportSync = () => {
      syncViewport();
      clearTimeout(viewportTimer);
      viewportTimer = setTimeout(syncViewport, 180);
    };
    addEventListener("blur", resetInputs);
    addEventListener("resize", scheduleViewportSync, { passive: true });
    addEventListener("orientationchange", scheduleViewportSync, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleViewportSync, { passive: true });
    syncViewport();
    this.ui.action.addEventListener("click", () => this.start());
  }
  start() { this.audio.init(); if (this.ended) this.reset(); this.running = true; this.ui.panel.classList.add("hidden"); this.ui.status.textContent = "Mission active"; this.canvas.focus(); }
  shoot() { if (!this.running || this.shootCooldown > 0) return; this.bullets.push(new Bullet(this.player.x + 21, this.player.y - 9, -350)); this.shootCooldown = .32; this.audio.shoot(); }
  update(dt) {
    if (!this.running) return;
    this.shootCooldown -= dt; const movement = (this.keys.ArrowRight ? 1 : 0) - (this.keys.ArrowLeft ? 1 : 0); this.player.x = Math.max(8, Math.min(this.canvas.width - this.player.width - 8, this.player.x + movement * this.player.speed * 60 * dt));
    [...this.bullets, ...this.enemyBullets].forEach(b => b.update(dt)); this.bullets = this.bullets.filter(b => b.y > -20); this.enemyBullets = this.enemyBullets.filter(b => b.y < this.canvas.height + 20);
    let edge = false; this.invaders.forEach(i => { i.x += this.speed * this.direction * dt; if (i.x < 18 || i.x + i.width > this.canvas.width - 18) edge = true; });
    if (edge) { this.direction *= -1; this.invaders.forEach(i => { i.y += this.drop; i.x = Math.max(20, Math.min(this.canvas.width - i.width - 20, i.x)); }); }
    this.moveSoundTimer -= dt; if (this.moveSoundTimer <= 0) { this.audio.move(); this.moveSoundTimer = Math.max(.18, .52 - (27 - this.invaders.length) * .011); }
    this.enemyTimer -= dt; if (this.enemyTimer <= 0 && this.invaders.length) { const shooter = this.bottomInvader(); this.enemyBullets.push(new Bullet(shooter.x + 15, shooter.y + 24, 175, true)); this.audio.alienShoot(); this.enemyTimer = .9 + Math.random() * 1.35; }
    this.ufoTimer -= dt; if (!this.ufo && this.ufoTimer <= 0) this.ufo = { x: -52, y: 25, width: 48, height: 19, speed: 115 };
    if (this.ufo) { this.ufo.x += this.ufo.speed * dt; if (this.ufo.x > this.canvas.width + 10) { this.ufo = null; this.ufoTimer = 8 + Math.random() * 6; } }
    this.collisions(); if (this.invaders.some(i => i.y + i.height >= this.player.y)) this.finish(false); if (!this.invaders.length) this.finish(true);
  }
  bottomInvader() { const columns = {}; this.invaders.forEach(i => { const key = Math.round(i.x / 50); if (!columns[key] || i.y > columns[key].y) columns[key] = i; }); return Object.values(columns)[Math.floor(Math.random() * Object.values(columns).length)]; }
  collisions() {
    this.bullets = this.bullets.filter(b => { const index = this.invaders.findIndex(i => this.hit(b, i)); if (index >= 0) { this.score += [30, 20, 10][this.invaders[index].row]; this.invaders.splice(index, 1); this.speed += .9; this.audio.hit(); this.updateHud(); return false; } if (this.ufo && this.hit(b, this.ufo)) { this.score += 500; this.ufo = null; this.ufoTimer = 9; this.audio.bonus(); this.updateHud(); return false; } return true; });
    this.enemyBullets = this.enemyBullets.filter(b => { if (!this.hit(b, this.player)) return true; this.lives--; this.audio.hit(); this.updateHud(); this.player.x = this.canvas.width / 2 - 23; if (this.lives <= 0) this.finish(false); return false; });
  }
  hit(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
  updateHud() { this.ui.score.textContent = String(this.score).padStart(5, "0"); this.ui.lives.textContent = "♥ ".repeat(this.lives).trim() || "—"; }
  finish(win) { if (this.ended) return; this.running = false; this.ended = true; const lifeBonus = win ? this.lives * 1000 : 0; this.score += lifeBonus; this.updateHud(); this.ui.kicker.textContent = win ? "Sector cleared" : "Signal lost"; this.ui.title.textContent = win ? "Mission complete" : "Game over"; this.ui.copy.textContent = win ? `Score: ${this.score} · Bonus vite: +${lifeBonus}` : `La flotta ha resistito. Score: ${this.score}`; this.ui.action.textContent = "Retry mission"; this.ui.status.textContent = win ? "Victory" : "Mission failed"; this.ui.panel.classList.remove("hidden"); win ? this.audio.win() : this.audio.lose(); }
  draw() {
    const c = this.ctx; c.clearRect(0, 0, this.canvas.width, this.canvas.height); if (this.background.complete) { c.globalAlpha = .7; c.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height); c.globalAlpha = 1; }
    const grad = c.createLinearGradient(0, 0, 0, this.canvas.height); grad.addColorStop(0, "rgba(2,3,12,.08)"); grad.addColorStop(1, "rgba(2,3,12,.55)"); c.fillStyle = grad; c.fillRect(0,0,this.canvas.width,this.canvas.height);
    this.player.draw(c); this.invaders.forEach(i => i.draw(c, Math.floor(performance.now() / 300) % 2)); this.bullets.forEach(b => b.draw(c)); this.enemyBullets.forEach(b => b.draw(c)); if (this.ufo) this.drawUfo(c);
  }
  drawUfo(c) { c.save(); c.translate(this.ufo.x, this.ufo.y); c.shadowBlur = 18; c.shadowColor = "#ffd95a"; c.fillStyle = "#ffd95a"; c.beginPath(); c.ellipse(24, 12, 24, 7, 0, 0, Math.PI*2); c.fill(); c.fillStyle = "#fff3a0"; c.beginPath(); c.ellipse(24, 7, 11, 7, 0, Math.PI, Math.PI*2); c.fill(); c.fillStyle = "#7c4800"; c.fillRect(10, 11, 5, 3); c.fillRect(33, 11, 5, 3); c.restore(); }
  loop(time = 0) { const dt = Math.min((time - this.lastTime) / 1000 || 0, .033); this.lastTime = time; this.update(dt); this.draw(); requestAnimationFrame(t => this.loop(t)); }
}

const game = new Game(document.querySelector("#game")); game.loop();
document.querySelector("#sound-toggle").addEventListener("click", function () { game.audio.enabled = !game.audio.enabled; this.setAttribute("aria-pressed", String(game.audio.enabled)); this.setAttribute("aria-label", game.audio.enabled ? "Disattiva suoni" : "Attiva suoni"); this.innerHTML = game.audio.enabled ? "♪ <span>Sound on</span>" : "× <span>Sound off</span>"; });
document.querySelector("#theme-toggle").addEventListener("click", function () { const light = document.documentElement.dataset.theme !== "light"; document.documentElement.dataset.theme = light ? "light" : "dark"; this.setAttribute("aria-pressed", String(light)); this.setAttribute("aria-label", light ? "Passa al tema scuro" : "Passa al tema chiaro"); this.querySelector(".theme-label").textContent = light ? "Dark mode" : "Light mode"; });
