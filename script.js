const LEVELS = [
  {
    name: "Outer Patrol",
    background: "assets/level-1-background.webp",
    rows: 3,
    columns: 8,
    fleetSpeed: 24,
    drop: 16,
    enemyFireDelay: [1.1, 2.1],
    boss: {
      kind: "sentinel",
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
    background: "assets/level-2-background.webp",
    rows: 4,
    columns: 9,
    fleetSpeed: 31,
    drop: 18,
    enemyFireDelay: [0.8, 1.65],
    boss: {
      kind: "twin-core",
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
    background: "assets/level-3-background.webp",
    rows: 4,
    columns: 10,
    fleetSpeed: 38,
    drop: 20,
    enemyFireDelay: [0.62, 1.35],
    boss: {
      kind: "sovereign",
      name: "Void Sovereign",
      health: 14,
      speed: 112,
      fireDelay: 0.64,
      score: 2_000,
      color: "#54e8ff",
    },
  },
];

const INVADER_COLORS = ["#ff70d2", "#a77aff", "#54e8ff", "#ffd95a"];

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

  enemyDefeat(row) {
    const frequency = [520, 440, 360, 620][row % 4];
    this.tone(frequency, 0.11, "square", 0.035, frequency * 0.35);
    this.tone(frequency * 1.5, 0.07, "triangle", 0.018, frequency * 0.8);
  }

  bossAppear(levelIndex) {
    const sequences = [
      [[82, 0], [123, 110], [185, 220]],
      [[110, 0], [165, 0], [98, 150], [196, 300]],
      [[220, 0], [147, 100], [98, 200], [55, 320]],
    ];

    sequences[levelIndex].forEach(([frequency, delay], noteIndex) => {
      setTimeout(() => {
        const type = levelIndex === 2 ? "sawtooth" : noteIndex % 2 ? "square" : "triangle";
        this.tone(frequency, 0.28, type, 0.055, frequency * 0.7);
      }, delay);
    });
  }

  bossShoot(levelIndex) {
    if (levelIndex === 0) {
      this.tone(310, 0.18, "sawtooth", 0.045, 75);
    } else if (levelIndex === 1) {
      this.tone(190, 0.16, "square", 0.035, 95);
      this.tone(285, 0.16, "square", 0.028, 140);
    } else {
      this.tone(92, 0.24, "sawtooth", 0.055, 38);
      this.tone(740, 0.09, "square", 0.022, 260);
    }
  }

  bossHit(levelIndex) {
    const frequencies = [170, 125, 76];
    this.tone(frequencies[levelIndex], 0.14, "sawtooth", 0.05, 34);
  }

  bossDefeat(levelIndex) {
    const roots = [220, 174, 130];
    [1, 0.75, 0.5, 0.25].forEach((ratio, index) => {
      setTimeout(() => {
        this.tone(roots[levelIndex] * ratio, 0.34, "sawtooth", 0.06, 30);
      }, index * 105);
    });
  }

  bonus() {
    [660, 880, 1_100].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.1, "square", 0.035), index * 70);
    });
  }

  campaignWin() {
    [523, 659, 784, 1_047, 1_319].forEach((frequency, index) => {
      setTimeout(() => {
        this.tone(frequency, index === 4 ? 0.55 : 0.2, "triangle", 0.05);
        if (index === 4) this.tone(659, 0.55, "sine", 0.035);
      }, 420 + index * 125);
    });
  }

  lose() {
    [330, 247, 196, 110].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.3, "sawtooth", 0.04), index * 160);
    });
  }
}

class Bullet {
  constructor(x, y, speed, enemy = false, horizontalSpeed = 0) {
    Object.assign(this, {
      x,
      y,
      speed,
      horizontalSpeed,
      enemy,
      width: enemy ? 5 : 4,
      height: 13,
    });
  }

  update(deltaTime) {
    this.x += this.horizontalSpeed * deltaTime;
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
    const color = INVADER_COLORS[this.row % INVADER_COLORS.length];

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

class Explosion {
  constructor(x, y, color, random = Math.random) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.duration = 0.48;
    this.particles = Array.from({ length: 14 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 14 + (random() - 0.5) * 0.3;
      const speed = 45 + random() * 95;
      return {
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + random() * 2.5,
        color: index % 3 === 0 ? "#ffffff" : color,
      };
    });
  }

  update(deltaTime) {
    this.age += deltaTime;
    this.particles.forEach((particle) => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vx *= Math.pow(0.04, deltaTime);
      particle.vy *= Math.pow(0.04, deltaTime);
    });
  }

  draw(context) {
    const progress = Math.min(1, this.age / this.duration);
    context.save();
    context.translate(this.x, this.y);
    context.globalAlpha = 1 - progress;
    context.globalCompositeOperation = "lighter";
    context.shadowBlur = 12;
    this.particles.forEach((particle) => {
      context.shadowColor = particle.color;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius * (1 - progress * 0.5), 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }

  get finished() {
    return this.age >= this.duration;
  }
}

class Boss {
  constructor(config, canvasWidth) {
    const sizes = {
      sentinel: [126, 56],
      "twin-core": [144, 60],
      sovereign: [160, 68],
    };
    const [width, height] = sizes[config.kind];

    Object.assign(this, config, {
      x: canvasWidth / 2 - width / 2,
      y: 52,
      width,
      height,
      direction: 1,
      targetX: canvasWidth / 2 - width / 2,
      targetTimer: 0,
      speedFactor: 1,
      fireTimer: config.fireDelay,
      maxHealth: config.health,
    });
  }

  update(deltaTime, canvasWidth, player, random = Math.random) {
    this.targetTimer -= deltaTime;
    if (this.targetTimer <= 0) {
      const playerCenter = player.x + player.width / 2;
      const pursuitOffset = (random() * 2 - 1) * Math.min(150, canvasWidth * 0.2);
      this.targetX = Math.max(22, Math.min(
        canvasWidth - this.width - 22,
        playerCenter - this.width / 2 + pursuitOffset,
      ));
      this.targetTimer = 0.42 + random() * 0.9;
      this.speedFactor = 0.7 + random() * 0.65;
    }

    const distance = this.targetX - this.x;
    if (Math.abs(distance) > 3) this.direction = Math.sign(distance);
    const step = Math.min(Math.abs(distance), this.speed * this.speedFactor * deltaTime);
    this.x += step * this.direction;
    this.x = Math.max(22, Math.min(canvasWidth - this.width - 22, this.x));

    this.fireTimer -= deltaTime;
  }

  draw(context, time) {
    const center = this.width / 2;
    const pulse = 0.78 + Math.sin(time / 140) * 0.22;

    context.save();
    context.translate(this.x, this.y);
    context.shadowBlur = 20 + pulse * 10;
    context.shadowColor = this.color;

    if (this.kind === "sentinel") this.drawSentinel(context, center, pulse);
    else if (this.kind === "twin-core") this.drawTwinCore(context, pulse);
    else this.drawSovereign(context, center, pulse);

    context.restore();
  }

  drawSentinel(context, center, pulse) {
    context.fillStyle = this.color;
    context.beginPath();
    context.moveTo(0, 34);
    context.lineTo(24, 17);
    context.lineTo(center, 9);
    context.lineTo(this.width - 24, 17);
    context.lineTo(this.width, 34);
    context.lineTo(this.width - 30, 42);
    context.lineTo(30, 42);
    context.closePath();
    context.fill();

    context.fillStyle = "#111326";
    context.beginPath();
    context.ellipse(center, 28, 31, 22, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#fff0fa";
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(center, 28, 21 + pulse * 2, 14 + pulse, 0, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(center, 28, 7 + pulse * 2, 0, Math.PI * 2);
    context.fill();
  }

  drawTwinCore(context, pulse) {
    context.fillStyle = "#18142f";
    context.fillRect(38, 22, this.width - 76, 18);

    [34, this.width - 34].forEach((center) => {
      context.fillStyle = this.color;
      context.beginPath();
      context.moveTo(center, 0);
      context.lineTo(center + 29, 15);
      context.lineTo(center + 25, 48);
      context.lineTo(center, 60);
      context.lineTo(center - 25, 48);
      context.lineTo(center - 29, 15);
      context.closePath();
      context.fill();
      context.fillStyle = "#15132b";
      context.beginPath();
      context.arc(center, 29, 17, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(center, 29, 5 + pulse * 2, 0, Math.PI * 2);
      context.fill();
    });

    context.fillStyle = this.color;
    context.fillRect(this.width / 2 - 9, 13, 18, 36);
  }

  drawSovereign(context, center, pulse) {
    context.fillStyle = this.color;
    context.beginPath();
    context.moveTo(center, 0);
    context.lineTo(center + 18, 17);
    context.lineTo(this.width - 13, 5);
    context.lineTo(this.width - 34, 31);
    context.lineTo(this.width, 43);
    context.lineTo(this.width - 48, 52);
    context.lineTo(this.width - 62, this.height);
    context.lineTo(center, 56);
    context.lineTo(62, this.height);
    context.lineTo(48, 52);
    context.lineTo(0, 43);
    context.lineTo(34, 31);
    context.lineTo(13, 5);
    context.lineTo(center - 18, 17);
    context.closePath();
    context.fill();

    context.fillStyle = "#081622";
    context.beginPath();
    context.moveTo(center, 10);
    context.lineTo(center + 22, 34);
    context.lineTo(center, 58);
    context.lineTo(center - 22, 34);
    context.closePath();
    context.fill();
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.moveTo(center, 18 - pulse * 2);
    context.lineTo(center + 9, 34);
    context.lineTo(center, 49 + pulse * 2);
    context.lineTo(center - 9, 34);
    context.closePath();
    context.fill();
  }
}

class Game {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audio = options.audio || new AudioEngine();
    this.random = options.random || Math.random;
    this.vibrate = options.vibrate || ((pattern) => {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(pattern);
      }
    });
    this.keys = {};
    this.running = false;
    this.lastTime = 0;
    this.bindControls = options.bindControls !== false;
    this.ui = options.ui || this.findUi();
    this.backgrounds = this.preloadBackgrounds();
    this.background = null;

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

  preloadBackgrounds() {
    const backgrounds = new Map();
    if (typeof Image === "undefined") return backgrounds;

    LEVELS.forEach(({ background }) => {
      const image = new Image();
      image.src = background;
      const decoding = image.decode?.();
      decoding?.catch(() => {});
      backgrounds.set(background, image);
    });
    return backgrounds;
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

    this.background = this.backgrounds.get(level.background) || null;

    if (this.canvas.style) {
      this.canvas.style.backgroundImage = `url("${level.background}")`;
    }

    this.player = new Player(this.canvas.width / 2 - 23, 430);
    this.bullets = [];
    this.enemyBullets = [];
    this.effects = [];
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
    this.vibrate(12);
  }

  update(deltaTime) {
    if (!this.running) return;

    this.updatePlayer(deltaTime);
    this.updateBullets(deltaTime);
    this.updateEffects(deltaTime);

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

  updateEffects(deltaTime) {
    this.effects.forEach((effect) => effect.update(deltaTime));
    this.effects = this.effects.filter((effect) => !effect.finished);
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
      this.audio.bossShoot(this.levelIndex);
      this.resetEnemyTimer();
    }
  }

  updateBoss(deltaTime) {
    if (!this.boss) return;

    this.boss.update(deltaTime, this.canvas.width, this.player, this.random);
    if (this.boss.fireTimer <= 0) {
      const bulletSpeed = 195 + this.levelIndex * 25;
      const origins = this.levelIndex === 0 ? [this.boss.width / 2] : [30, this.boss.width - 30];

      origins.forEach((offset) => {
        const originX = this.boss.x + offset;
        const originY = this.boss.y + this.boss.height;
        const targetX = this.player.x + this.player.width / 2;
        const targetY = this.player.y + this.player.height / 2;
        const travelTime = Math.max(0.1, (targetY - originY) / bulletSpeed);
        const horizontalSpeed = (targetX - originX) / travelTime;
        this.enemyBullets.push(new Bullet(originX, originY, bulletSpeed, true, horizontalSpeed));
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
    this.ui.status.textContent = `BOSS · ${this.boss.name} · ${this.boss.health} HP`;
    this.audio.bossAppear(this.levelIndex);
  }

  collisions() {
    this.bullets = this.bullets.filter((bullet) => {
      if (this.phase === "boss" && this.boss && this.hit(bullet, this.boss)) {
        this.damageBoss();
        return false;
      }

      const invaderIndex = this.invaders.findIndex((invader) => this.hit(bullet, invader));
      if (invaderIndex >= 0) {
        const invader = this.invaders[invaderIndex];
        this.score += [30, 20, 10, 40][invader.row];
        this.effects.push(new Explosion(
          invader.x + invader.width / 2,
          invader.y + invader.height / 2,
          INVADER_COLORS[invader.row % INVADER_COLORS.length],
          this.random,
        ));
        this.invaders.splice(invaderIndex, 1);
        this.speed += 0.75;
        this.audio.enemyDefeat(invader.row);
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
      this.vibrate([45, 35, 80]);
      this.updateHud();
      this.player.x = this.canvas.width / 2 - 23;
      if (this.lives <= 0) this.finish(false);
      return false;
    });
  }

  damageBoss() {
    this.boss.health -= 1;

    if (this.boss.health <= 0) {
      this.audio.bossDefeat(this.levelIndex);
      this.score += this.boss.score;
      this.boss = null;
      this.updateHud();
      this.completeLevel();
      return;
    }

    this.audio.bossHit(this.levelIndex);
    this.ui.status.textContent = `BOSS · ${this.boss.name} · ${this.boss.health} HP`;
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
    if (win) this.audio.campaignWin();
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
    this.effects.forEach((effect) => effect.draw(context));
    this.boss?.draw(context, performance.now());
    this.bullets.forEach((bullet) => bullet.draw(context));
    this.enemyBullets.forEach((bullet) => bullet.draw(context));
    if (this.ufo) this.drawUfo(context);
    if (this.boss) this.drawBossHealth(context);
  }

  drawBossHealth(context) {
    const width = 210;
    const healthRatio = this.boss.health / this.boss.maxHealth;
    const x = (this.canvas.width - width) / 2;

    context.save();
    context.font = '700 10px "Space Mono", monospace';
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.shadowBlur = 8;
    context.shadowColor = this.boss.color;
    context.fillText(`LEVEL BOSS · ${this.boss.name.toUpperCase()}`, this.canvas.width / 2, 15);
    context.shadowBlur = 0;
    context.fillStyle = "rgba(5, 5, 15, .75)";
    context.fillRect(x, 22, width, 8);
    context.fillStyle = this.boss.color;
    context.fillRect(x, 22, width * healthRatio, 8);
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
  module.exports = { LEVELS, AudioEngine, Bullet, Player, Invader, Explosion, Boss, Game };
}

if (typeof document !== "undefined") {
  bootstrap();
}
