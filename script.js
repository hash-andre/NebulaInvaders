const LEVELS = [
  {
    name: "Outer Patrol",
    background: "assets/level-1-background.png",
    rows: 3,
    columns: 8,
    fleetSpeed: 24,
    drop: 16,
    enemyFireDelay: [1.1, 2.1],
    boss: {
      name: "Orbital Sentinel",
      health: 6,
      speed: 72,
      fireDelay: 1.05,
      score: 800,
      color: "#ff70d2",
    },
  },
  {
    name: "Meteor Foundry",
    background: "assets/level-2-background.png",
    rows: 4,
    columns: 9,
    fleetSpeed: 31,
    drop: 18,
    enemyFireDelay: [0.8, 1.65],
    boss: {
      name: "Twin Core",
      health: 10,
      speed: 92,
      fireDelay: 0.82,
      score: 1_200,
      color: "#a77aff",
    },
  },
  {
    name: "Nebula Throne",
    background: "assets/level-3-background.png",
    rows: 4,
    columns: 10,
    fleetSpeed: 38,
    drop: 20,
    enemyFireDelay: [0.62, 1.35],
    boss: {
      name: "Void Sovereign",
      health: 14,
      speed: 112,
      fireDelay: 0.64,
      score: 2_000,
      color: "#54e8ff",
    },
  },
];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.step = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  tone(frequency, duration = 0.08, type = "square", volume = 0.045, endFrequency = frequency) {
    if (!this.enabled) return;

    this.init();
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  shoot() { this.tone(780, 0.1, "square", 0.035, 180); }
  alienShoot() { this.tone(180, 0.13, "sawtooth", 0.025, 420); }
  move() { this.tone([90, 105, 125, 150][this.step++ % 4], 0.055, "square", 0.018); }
  hit() { this.tone(130, 0.12, "sawtooth", 0.04, 45); }

  bonus() {
    [660, 880, 1_100].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.1, "square", 0.035), index * 70);
    });
  }

  win() {
    [440, 554, 659, 880].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.25, "triangle", 0.05), index * 130);
    });
  }

  lose() {
    [330, 247, 196, 110].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.3, "sawtooth", 0.04), index * 160);
    });
  }
}

class Bullet {
  constructor(x, y, speed, enemy = false) {
    Object.assign(this, {
      x,
      y,
      speed,
      enemy,
      width: enemy ? 5 : 4,
      height: 13,
    });
  }

  update(deltaTime) {
    this.y += this.speed * deltaTime;
  }

  draw(context) {
    context.save();
    context.shadowBlur = 12;
    context.shadowColor = this.enemy ? "#ff4f9a" : "#66f6ff";
    context.fillStyle = this.enemy ? "#ff79b5" : "#d9ffff";
    context.fillRect(this.x, this.y, this.width, this.height);
    context.restore();
  }
}

class Player {
  constructor(x, y) {
    Object.assign(this, { x, y, width: 46, height: 25, speed: 5.5 });
  }

  draw(context) {
    context.save();
    context.translate(this.x, this.y);
    context.shadowBlur = 16;
    context.shadowColor = "#28e7ff";
    context.fillStyle = "#55ecff";
    context.beginPath();
    context.moveTo(23, 0);
    context.lineTo(30, 10);
    context.lineTo(43, 15);
    context.lineTo(46, 25);
    context.lineTo(0, 25);
    context.lineTo(3, 15);
    context.lineTo(16, 10);
    context.closePath();
    context.fill();
    context.fillStyle = "#2b3872";
    context.fillRect(18, 8, 10, 11);
    context.fillStyle = "#fff";
    context.fillRect(21, 5, 4, 9);
    context.restore();
  }
}

class Invader {
  constructor(x, y, row) {
    Object.assign(this, { x, y, row, width: 34, height: 24 });
  }

  draw(context, frame) {
    const colors = ["#ff70d2", "#a77aff", "#54e8ff", "#ffd95a"];
    const color = colors[this.row % colors.length];

    context.save();
    context.translate(this.x, this.y);
    context.shadowBlur = 9;
    context.shadowColor = color;
    context.fillStyle = color;
    context.fillRect(8, 3, 18, 4);
    context.fillRect(4, 7, 26, 12);
    context.fillRect(0, 11, 34, 6);
    context.fillRect(7, 19, 6, 5);
    context.fillRect(21, 19, 6, 5);
    context.fillStyle = "#101126";
    context.fillRect(8, 10, 5, 5);
    context.fillRect(21, 10, 5, 5);

    if (frame) {
      context.fillStyle = color;
      context.fillRect(1, 20, 5, 4);
      context.fillRect(28, 20, 5, 4);
    }

    context.restore();
  }
}

class Boss {
  constructor(config, canvasWidth) {
    Object.assign(this, config, {
      x: canvasWidth / 2 - 58,
      y: 48,
      width: 116,
      height: 48,
      direction: 1,
      fireTimer: config.fireDelay,
      maxHealth: config.health,
    });
  }

  update(deltaTime, canvasWidth) {
    this.x += this.speed * this.direction * deltaTime;

    if (this.x <= 22 || this.x + this.width >= canvasWidth - 22) {
      this.direction *= -1;
      this.x = Math.max(22, Math.min(canvasWidth - this.width - 22, this.x));
    }

    this.fireTimer -= deltaTime;
  }

  draw(context, levelIndex) {
    const center = this.width / 2;

    context.save();
    context.translate(this.x, this.y);
    context.shadowBlur = 20;
    context.shadowColor = this.color;
    context.fillStyle = this.color;
    context.beginPath();
    context.moveTo(center, 0);
    context.lineTo(this.width - 12, 12);
    context.lineTo(this.width, 34);
    context.lineTo(this.width - 24, this.height);
    context.lineTo(24, this.height);
    context.lineTo(0, 34);
    context.lineTo(12, 12);
    context.closePath();
    context.fill();
    context.fillStyle = "#16152d";
    context.fillRect(20, 17, this.width - 40, 18);
    context.fillStyle = "#fff";
    context.fillRect(center - 5, 12, 10, 24);

    if (levelIndex >= 1) {
      context.fillStyle = "#16152d";
      context.fillRect(8, 25, 16, 12);
      context.fillRect(this.width - 24, 25, 16, 12);
    }

    context.restore();
  }
}

class Game {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audio = options.audio || new AudioEngine();
    this.random = options.random || Math.random;
    this.keys = {};
    this.running = false;
    this.lastTime = 0;
    this.bindControls = options.bindControls !== false;
    this.ui = options.ui || this.findUi();
    this.background = typeof Image === "undefined" ? null : new Image();

    if (this.bindControls) {
      this.setupControls();
    }

    this.resetCampaign();
  }

  findUi() {
    return {
      score: document.querySelector("#score"),
      lives: document.querySelector("#lives"),
      level: document.querySelector("#level"),
      status: document.querySelector("#status"),
      panel: document.querySelector("#start-panel"),
      kicker: document.querySelector("#panel-kicker"),
      title: document.querySelector("#panel-title"),
      copy: document.querySelector("#panel-copy"),
      action: document.querySelector("#action-button"),
    };
  }

  resetCampaign() {
    this.score = 0;
    this.lives = 3;
    this.levelIndex = 0;
    this.ended = false;
    this.pendingNextLevel = false;
    this.loadLevel();
  }

  loadLevel() {
    const level = LEVELS[this.levelIndex];

    if (this.background) {
      this.background.src = level.background;
    }

    if (this.canvas.style) {
      this.canvas.style.backgroundImage = `url("${level.background}")`;
    }

    this.player = new Player(this.canvas.width / 2 - 23, 430);
    this.bullets = [];
    this.enemyBullets = [];
    this.invaders = [];
    this.boss = null;
    this.phase = "fleet";
    this.direction = 1;
    this.speed = level.fleetSpeed;
    this.drop = level.drop;
    this.shootCooldown = 0;
    this.enemyTimer = level.enemyFireDelay[0];
    this.moveSoundTimer = 0;
    this.ufo = null;
    this.ufoTimer = 6 + this.random() * 5;
    this.createInvaders(level);
    this.updateHud();
  }

  createInvaders(level = LEVELS[this.levelIndex]) {
    const horizontalGap = Math.min(59, 570 / Math.max(1, level.columns - 1));
    const formationWidth = (level.columns - 1) * horizontalGap + 34;
    const startX = (this.canvas.width - formationWidth) / 2;

    for (let row = 0; row < level.rows; row += 1) {
      for (let column = 0; column < level.columns; column += 1) {
        this.invaders.push(new Invader(startX + column * horizontalGap, 68 + row * 42, row));
      }
    }
  }

  setupControls() {
    addEventListener("keydown", (event) => {
      if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
        event.preventDefault();
      }

      this.keys[event.code] = true;
      if (event.code === "Space" && !event.repeat) this.shoot();
    });

    addEventListener("keyup", (event) => {
      this.keys[event.code] = false;
    });

    document.querySelectorAll("[data-control]").forEach((button) => {
      const control = button.dataset.control;
      const movementKey = control === "left" ? "ArrowLeft" : "ArrowRight";

      const press = (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        button.classList.add("is-active");

        if (control === "fire") this.shoot();
        else this.keys[movementKey] = true;
      };

      const release = (event) => {
        event.preventDefault();
        button.classList.remove("is-active");
        if (control !== "fire") this.keys[movementKey] = false;
      };

      button.addEventListener("pointerdown", press);
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
        button.addEventListener(type, release);
      });
    });

    const resetInputs = () => {
      this.keys.ArrowLeft = false;
      this.keys.ArrowRight = false;
      document.querySelectorAll(".touch-button.is-active").forEach((button) => {
        button.classList.remove("is-active");
      });
    };

    const syncViewport = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
      document.documentElement.dataset.orientation = innerWidth > innerHeight ? "landscape" : "portrait";
      resetInputs();
    };

    let viewportFrame;
    const scheduleViewportSync = () => {
      cancelAnimationFrame(viewportFrame);
      viewportFrame = requestAnimationFrame(syncViewport);
    };

    addEventListener("blur", resetInputs);
    addEventListener("resize", scheduleViewportSync, { passive: true });
    addEventListener("orientationchange", scheduleViewportSync, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleViewportSync, { passive: true });
    this.ui.action.addEventListener("click", () => this.start());
    syncViewport();
  }

  start() {
    this.audio.init();

    if (this.ended) {
      this.resetCampaign();
    } else if (this.pendingNextLevel) {
      this.levelIndex += 1;
      this.pendingNextLevel = false;
      this.loadLevel();
    }

    this.running = true;
    this.ui.panel.classList.add("hidden");
    this.ui.status.textContent = "Mission active";
    this.canvas.focus();
  }

  shoot() {
    if (!this.running || this.shootCooldown > 0) return;

    this.bullets.push(new Bullet(this.player.x + 21, this.player.y - 9, -350));
    this.shootCooldown = 0.3;
    this.audio.shoot();
  }

  update(deltaTime) {
    if (!this.running) return;

    this.updatePlayer(deltaTime);
    this.updateBullets(deltaTime);

    if (this.phase === "fleet") this.updateFleet(deltaTime);
    else this.updateBoss(deltaTime);

    this.updateUfo(deltaTime);
    this.collisions();

    if (!this.running) return;

    if (this.phase === "fleet" && this.invaders.some((invader) => invader.y + invader.height >= this.player.y)) {
      this.finish(false);
    } else if (this.phase === "fleet" && this.invaders.length === 0) {
      this.spawnBoss();
    }
  }

  updatePlayer(deltaTime) {
    this.shootCooldown -= deltaTime;
    const movement = (this.keys.ArrowRight ? 1 : 0) - (this.keys.ArrowLeft ? 1 : 0);
    const nextX = this.player.x + movement * this.player.speed * 60 * deltaTime;
    this.player.x = Math.max(8, Math.min(this.canvas.width - this.player.width - 8, nextX));
  }

  updateBullets(deltaTime) {
    [...this.bullets, ...this.enemyBullets].forEach((bullet) => bullet.update(deltaTime));
    this.bullets = this.bullets.filter((bullet) => bullet.y > -20);
    this.enemyBullets = this.enemyBullets.filter((bullet) => bullet.y < this.canvas.height + 20);
  }

  updateFleet(deltaTime) {
    let reachedEdge = false;

    this.invaders.forEach((invader) => {
      invader.x += this.speed * this.direction * deltaTime;
      if (invader.x < 18 || invader.x + invader.width > this.canvas.width - 18) reachedEdge = true;
    });

    if (reachedEdge) {
      this.direction *= -1;
      this.invaders.forEach((invader) => {
        invader.y += this.drop;
        invader.x = Math.max(20, Math.min(this.canvas.width - invader.width - 20, invader.x));
      });
    }

    this.moveSoundTimer -= deltaTime;
    if (this.moveSoundTimer <= 0 && this.invaders.length) {
      this.audio.move();
      this.moveSoundTimer = Math.max(0.16, 0.5 - (LEVELS[this.levelIndex].rows * LEVELS[this.levelIndex].columns - this.invaders.length) * 0.008);
    }

    this.enemyTimer -= deltaTime;
    if (this.enemyTimer <= 0 && this.invaders.length) {
      const shooter = this.bottomInvader();
      this.enemyBullets.push(new Bullet(shooter.x + 15, shooter.y + 24, 175 + this.levelIndex * 20, true));
      this.audio.alienShoot();
      this.resetEnemyTimer();
    }
  }

  updateBoss(deltaTime) {
    if (!this.boss) return;

    this.boss.update(deltaTime, this.canvas.width);
    if (this.boss.fireTimer <= 0) {
      const bulletSpeed = 195 + this.levelIndex * 25;
      const origins = this.levelIndex === 0 ? [this.boss.width / 2] : [30, this.boss.width - 30];

      origins.forEach((offset) => {
        this.enemyBullets.push(new Bullet(this.boss.x + offset, this.boss.y + this.boss.height, bulletSpeed, true));
      });

      this.audio.alienShoot();
      this.boss.fireTimer = this.boss.fireDelay;
    }
  }

  updateUfo(deltaTime) {
    this.ufoTimer -= deltaTime;
    if (!this.ufo && this.ufoTimer <= 0 && this.phase === "fleet") {
      this.ufo = { x: -52, y: 25, width: 48, height: 19, speed: 115 + this.levelIndex * 12 };
    }

    if (!this.ufo) return;

    this.ufo.x += this.ufo.speed * deltaTime;
    if (this.ufo.x > this.canvas.width + 10) {
      this.ufo = null;
      this.ufoTimer = 8 + this.random() * 6;
    }
  }

  resetEnemyTimer() {
    const [minimum, maximum] = LEVELS[this.levelIndex].enemyFireDelay;
    this.enemyTimer = minimum + this.random() * (maximum - minimum);
  }

  bottomInvader() {
    const columns = {};
    this.invaders.forEach((invader) => {
      const key = Math.round(invader.x / 50);
      if (!columns[key] || invader.y > columns[key].y) columns[key] = invader;
    });

    const candidates = Object.values(columns);
    return candidates[Math.floor(this.random() * candidates.length)];
  }

  spawnBoss() {
    this.phase = "boss";
    this.ufo = null;
    this.bullets = [];
    this.boss = new Boss(LEVELS[this.levelIndex].boss, this.canvas.width);
    this.ui.status.textContent = `${this.boss.name} · ${this.boss.health} HP`;
  }

  collisions() {
    this.bullets = this.bullets.filter((bullet) => {
      if (this.phase === "boss" && this.boss && this.hit(bullet, this.boss)) {
        this.damageBoss();
        return false;
      }

      const invaderIndex = this.invaders.findIndex((invader) => this.hit(bullet, invader));
      if (invaderIndex >= 0) {
        this.score += [30, 20, 10, 40][this.invaders[invaderIndex].row];
        this.invaders.splice(invaderIndex, 1);
        this.speed += 0.75;
        this.audio.hit();
        this.updateHud();
        return false;
      }

      if (this.ufo && this.hit(bullet, this.ufo)) {
        this.score += 500;
        this.ufo = null;
        this.ufoTimer = 9;
        this.audio.bonus();
        this.updateHud();
        return false;
      }

      return true;
    });

    this.enemyBullets = this.enemyBullets.filter((bullet) => {
      if (!this.hit(bullet, this.player)) return true;

      this.lives -= 1;
      this.audio.hit();
      this.updateHud();
      this.player.x = this.canvas.width / 2 - 23;
      if (this.lives <= 0) this.finish(false);
      return false;
    });
  }

  damageBoss() {
    this.boss.health -= 1;
    this.audio.hit();

    if (this.boss.health <= 0) {
      this.score += this.boss.score;
      this.boss = null;
      this.updateHud();
      this.completeLevel();
      return;
    }

    this.ui.status.textContent = `${this.boss.name} · ${this.boss.health} HP`;
  }

  completeLevel() {
    if (this.levelIndex === LEVELS.length - 1) {
      this.finish(true);
      return;
    }

    this.running = false;
    this.pendingNextLevel = true;
    this.enemyBullets = [];
    this.ui.kicker.textContent = `Level ${this.levelIndex + 1} cleared`;
    this.ui.title.textContent = "Boss destroyed";
    this.ui.copy.textContent = `${LEVELS[this.levelIndex + 1].name} is waiting. Score: ${this.score}`;
    this.ui.action.textContent = "Next level";
    this.ui.status.textContent = "Sector secure";
    this.ui.panel.classList.remove("hidden");
    this.audio.bonus();
  }

  hit(first, second) {
    return first.x < second.x + second.width
      && first.x + first.width > second.x
      && first.y < second.y + second.height
      && first.y + first.height > second.y;
  }

  updateHud() {
    this.ui.score.textContent = String(this.score).padStart(5, "0");
    this.ui.lives.textContent = "♥ ".repeat(this.lives).trim() || "—";
    this.ui.level.textContent = `Level ${this.levelIndex + 1}/${LEVELS.length}`;
  }

  finish(win) {
    if (this.ended) return;

    this.running = false;
    this.ended = true;
    const lifeBonus = win ? this.lives * 1_000 : 0;
    this.score += lifeBonus;
    this.updateHud();
    this.ui.kicker.textContent = win ? "Campaign cleared" : "Signal lost";
    this.ui.title.textContent = win ? "Galaxy saved" : "Game over";
    this.ui.copy.textContent = win
      ? `Score: ${this.score} · Life bonus: +${lifeBonus}`
      : `The fleet prevailed. Score: ${this.score}`;
    this.ui.action.textContent = "Restart campaign";
    this.ui.status.textContent = win ? "Victory" : "Mission failed";
    this.ui.panel.classList.remove("hidden");
    if (win) this.audio.win();
    else this.audio.lose();
  }

  draw() {
    const context = this.ctx;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.background?.complete && this.background.naturalWidth) {
      context.globalAlpha = 0.7;
      context.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);
      context.globalAlpha = 1;
    }

    const gradient = context.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "rgba(2,3,12,.08)");
    gradient.addColorStop(1, "rgba(2,3,12,.55)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.player.draw(context);

    const animationFrame = Math.floor(performance.now() / 300) % 2;
    this.invaders.forEach((invader) => invader.draw(context, animationFrame));
    this.boss?.draw(context, this.levelIndex);
    this.bullets.forEach((bullet) => bullet.draw(context));
    this.enemyBullets.forEach((bullet) => bullet.draw(context));
    if (this.ufo) this.drawUfo(context);
    if (this.boss) this.drawBossHealth(context);
  }

  drawBossHealth(context) {
    const width = 180;
    const healthRatio = this.boss.health / this.boss.maxHealth;
    const x = (this.canvas.width - width) / 2;

    context.save();
    context.fillStyle = "rgba(5, 5, 15, .75)";
    context.fillRect(x, 12, width, 8);
    context.fillStyle = this.boss.color;
    context.fillRect(x, 12, width * healthRatio, 8);
    context.restore();
  }

  drawUfo(context) {
    context.save();
    context.translate(this.ufo.x, this.ufo.y);
    context.shadowBlur = 18;
    context.shadowColor = "#ffd95a";
    context.fillStyle = "#ffd95a";
    context.beginPath();
    context.ellipse(24, 12, 24, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#fff3a0";
    context.beginPath();
    context.ellipse(24, 7, 11, 7, 0, Math.PI, Math.PI * 2);
    context.fill();
    context.fillStyle = "#7c4800";
    context.fillRect(10, 11, 5, 3);
    context.fillRect(33, 11, 5, 3);
    context.restore();
  }

  loop(time = 0) {
    const deltaTime = Math.min((time - this.lastTime) / 1_000 || 0, 0.033);
    this.lastTime = time;
    this.update(deltaTime);
    this.draw();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }
}

function bootstrap() {
  const game = new Game(document.querySelector("#game"));
  game.loop();

  document.querySelector("#sound-toggle").addEventListener("click", function toggleSound() {
    game.audio.enabled = !game.audio.enabled;
    this.setAttribute("aria-pressed", String(game.audio.enabled));
    this.setAttribute("aria-label", game.audio.enabled ? "Disable sound" : "Enable sound");
    this.innerHTML = game.audio.enabled ? "♪ <span>Sound on</span>" : "× <span>Sound off</span>";
  });

  document.querySelector("#theme-toggle").addEventListener("click", function toggleTheme() {
    const light = document.documentElement.dataset.theme !== "light";
    document.documentElement.dataset.theme = light ? "light" : "dark";
    this.setAttribute("aria-pressed", String(light));
    this.setAttribute("aria-label", light ? "Use dark theme" : "Use light theme");
    this.querySelector(".theme-label").textContent = light ? "Dark mode" : "Light mode";
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEVELS, AudioEngine, Bullet, Player, Invader, Boss, Game };
}

if (typeof document !== "undefined") {
  bootstrap();
}
