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
    columns: 9,
    fleetSpeed: 35,
    drop: 20,
    enemyFireDelay: [0.62, 1.35],
    preBoss: {
      kind: "sovereign",
      name: "Void Sovereign",
      health: 10,
      speed: 102,
      fireDelay: 0.84,
      score: 1_250,
      color: "#54e8ff",
    },
    boss: {
      kind: "harbinger",
      name: "Rift Harbinger",
      health: 12,
      speed: 132,
      fireDelay: 0.98,
      score: 2_000,
      color: "#ffb84d",
    },
  },
];

const INVADER_COLORS = ["#ff70d2", "#a77aff", "#54e8ff", "#ffd95a"];
const RESPAWN_INVULNERABILITY = 2;
const JOYSTICK_DEAD_ZONE = 0.2;
const JOYSTICK_TRAVEL_RATIO = 0.32;

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.step = 0;
    this.sfxBus = null;
    this.musicBus = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicLevel = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.gain.value = 1;
      this.musicBus.gain.value = 0.22;
      this.sfxBus.connect(this.ctx.destination);
      this.musicBus.connect(this.ctx.destination);
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
    oscillator.connect(gain).connect(this.sfxBus);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  musicTone(frequency, duration, type, volume, endFrequency = frequency) {
    if (!this.enabled || !this.musicBus) return;

    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.musicBus);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  playMusicStep() {
    const roots = [55, 65.41, 73.42];
    const sequences = [
      [0, 7, 12, 7, 3, 10, 12, 15],
      [0, 12, 7, 15, 3, 12, 10, 7],
      [0, 3, 10, 15, 12, 7, 17, 10],
    ];
    const root = roots[this.musicLevel] || roots[0];
    const sequence = sequences[this.musicLevel] || sequences[0];
    const note = root * Math.pow(2, sequence[this.musicStep % sequence.length] / 12);

    this.musicTone(note * 2, 0.16, "triangle", 0.032, note * 1.96);
    if (this.musicStep % 2 === 0) this.musicTone(root, 0.2, "sine", 0.045, root * 0.72);
    if (this.musicStep % 4 === 2) this.musicTone(1_400, 0.035, "square", 0.008, 520);
    this.musicStep += 1;
  }

  startMusic(levelIndex = this.musicLevel) {
    this.musicLevel = levelIndex;
    if (!this.enabled) return;
    this.init();
    if (this.musicTimer) return;
    this.musicStep = 0;
    this.playMusicStep();
    this.musicTimer = setInterval(() => this.playMusicStep(), 240);
  }

  stopMusic() {
    if (!this.musicTimer) return;
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stopMusic();
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

  harbingerAppear() {
    [[196, 0], [294, 90], [147, 190], [392, 285]].forEach(([frequency, delay], index) => {
      setTimeout(() => this.tone(frequency, 0.2, index % 2 ? "square" : "triangle", 0.045, frequency * 0.55), delay);
    });
  }

  harbingerShoot() {
    this.tone(410, 0.12, "triangle", 0.035, 120);
    this.tone(205, 0.18, "sawtooth", 0.025, 70);
  }

  harbingerHit() {
    this.tone(240, 0.1, "square", 0.038, 90);
  }

  harbingerDefeat() {
    [392, 294, 196, 98].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.26, "triangle", 0.05, 45), index * 90);
    });
  }

  bonus() {
    [660, 880, 1_100].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.1, "square", 0.035), index * 70);
    });
  }

  campaignWin() {
    const startDelay = 420;
    const melody = [
      [392, 0, 0.14],
      [523.25, 120, 0.16],
      [659.25, 245, 0.18],
      [783.99, 385, 0.22],
      [1_046.5, 555, 0.34],
    ];

    melody.forEach(([frequency, delay, duration], index) => {
      setTimeout(() => {
        this.tone(frequency, duration, index < 2 ? "square" : "triangle", 0.048, frequency * 1.012);
      }, startDelay + delay);
    });

    [[130.81, 0], [196, 385]].forEach(([frequency, delay]) => {
      setTimeout(() => this.tone(frequency, 0.34, "sawtooth", 0.034, frequency * 0.98), startDelay + delay);
    });

    setTimeout(() => {
      [261.63, 329.63, 392, 523.25, 659.25].forEach((frequency, index) => {
        this.tone(frequency, 0.95, index < 2 ? "sine" : "triangle", 0.038 - index * 0.003);
      });
      this.tone(1_046.5, 0.72, "sine", 0.025, 1_318.51);
      this.tone(1_318.51, 0.72, "triangle", 0.02, 1_568);
    }, startDelay + 780);
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

  draw(context, invulnerable = false, time = 0) {
    if (invulnerable && Math.floor(time / 90) % 2 === 1) return;

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
    const variant = this.row % 4;
    const pulse = frame ? 1 : -1;

    context.save();
    context.translate(this.x + 17, this.y + 12 + pulse * 0.6);
    context.shadowBlur = 9;
    context.shadowColor = color;
    context.fillStyle = color;

    if (variant === 0) {
      context.beginPath();
      context.moveTo(-17, 3);
      context.quadraticCurveTo(-7, -11, 0, -7);
      context.quadraticCurveTo(7, -11, 17, 3);
      context.quadraticCurveTo(8, 1, 6, 9);
      context.lineTo(0, 5 + pulse);
      context.lineTo(-6, 9);
      context.quadraticCurveTo(-8, 1, -17, 3);
      context.fill();
    } else if (variant === 1) {
      context.beginPath();
      context.moveTo(0, -11);
      context.lineTo(6, -3);
      context.lineTo(17, -7);
      context.lineTo(11, 3);
      context.lineTo(15, 10);
      context.lineTo(3, 6);
      context.lineTo(0, 11 + pulse);
      context.lineTo(-3, 6);
      context.lineTo(-15, 10);
      context.lineTo(-11, 3);
      context.lineTo(-17, -7);
      context.lineTo(-6, -3);
      context.closePath();
      context.fill();
    } else if (variant === 2) {
      context.beginPath();
      context.arc(0, -2, 11, Math.PI, 0);
      context.quadraticCurveTo(14, 7, 8, 8);
      context.quadraticCurveTo(4, 4 + pulse, 2, 11);
      context.quadraticCurveTo(-1, 5, -4, 10 + pulse);
      context.quadraticCurveTo(-7, 4, -10, 8);
      context.quadraticCurveTo(-14, 7, -11, -2);
      context.fill();
    } else {
      context.rotate(frame ? 0.08 : -0.08);
      context.beginPath();
      context.moveTo(0, -11);
      context.lineTo(7, -5);
      context.lineTo(16, 0);
      context.lineTo(8, 5);
      context.lineTo(0, 11);
      context.lineTo(-8, 5);
      context.lineTo(-16, 0);
      context.lineTo(-7, -5);
      context.closePath();
      context.fill();
    }

    context.fillStyle = "#0b1024";
    context.beginPath();
    context.ellipse(0, 0, variant === 2 ? 5 : 4, variant === 1 ? 6 : 4, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f4ffff";
    context.beginPath();
    context.arc(pulse * 0.8, -0.5, 1.8, 0, Math.PI * 2);
    context.fill();

    context.restore();
  }
}

class Explosion {
  constructor(x, y, color, random = Math.random, options = {}) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.age = 0;
    this.duration = options.duration || 0.48;
    const particleCount = options.particleCount || 14;
    const power = options.power || 1;
    this.particles = Array.from({ length: particleCount }, (_, index) => {
      const angle = (Math.PI * 2 * index) / particleCount + (random() - 0.5) * 0.3;
      const speed = (45 + random() * 95) * power;
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

class BossExplosion extends Explosion {
  constructor(x, y, color, random = Math.random) {
    super(x, y, color, random, { duration: 1.05, particleCount: 42, power: 1.8 });
  }

  draw(context) {
    super.draw(context);
    const progress = Math.min(1, this.age / this.duration);
    context.save();
    context.translate(this.x, this.y);
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 1 - progress;
    context.strokeStyle = this.color;
    context.shadowBlur = 24;
    context.shadowColor = this.color;
    context.lineWidth = 5 * (1 - progress) + 1;
    [0.72, 1].forEach((scale) => {
      context.beginPath();
      context.arc(0, 0, 12 + progress * 100 * scale, 0, Math.PI * 2);
      context.stroke();
    });
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(0, 0, Math.max(0, 22 * (1 - progress * 1.4)), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

class Boss {
  constructor(config, canvasWidth) {
    const sizes = {
      sentinel: [126, 56],
      "twin-core": [144, 60],
      harbinger: [118, 62],
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
      baseY: 52,
      elapsed: 0,
      dashTimer: 0.9,
      attackIndex: 0,
      phaseShift: null,
    });
  }

  update(deltaTime, canvasWidth, player, random = Math.random) {
    this.elapsed += deltaTime;
    this.phaseShift = null;

    if (this.kind === "harbinger") {
      this.updateHarbinger(deltaTime, canvasWidth, player, random);
      this.fireTimer -= deltaTime;
      return;
    }

    this.targetTimer -= deltaTime;
    if (this.targetTimer <= 0) {
      const playerCenter = player.x + player.width / 2;
      const pursuitOffset = (random() * 2 - 1) * Math.min(150, canvasWidth * 0.2);
      this.targetX = Math.max(22, Math.min(
        canvasWidth - this.width - 22,
        playerCenter - this.width / 2 + pursuitOffset,
      ));
      this.targetTimer = this.kind === "sovereign" ? 0.28 + random() * 0.55 : 0.42 + random() * 0.9;
      this.speedFactor = this.kind === "sovereign" ? 0.95 + random() * 0.65 : 0.7 + random() * 0.65;
    }

    const distance = this.targetX - this.x;
    if (Math.abs(distance) > 3) this.direction = Math.sign(distance);
    const step = Math.min(Math.abs(distance), this.speed * this.speedFactor * deltaTime);
    this.x += step * this.direction;
    this.x = Math.max(22, Math.min(canvasWidth - this.width - 22, this.x));
    if (this.kind === "sovereign") this.y = this.baseY + Math.sin(this.elapsed * 2.4) * 20;

    this.fireTimer -= deltaTime;
  }

  updateHarbinger(deltaTime, canvasWidth, player, random) {
    this.dashTimer -= deltaTime;
    this.targetTimer -= deltaTime;

    if (this.dashTimer <= 0) {
      const fromX = this.x;
      const fromY = this.y;
      const playerCenter = player.x + player.width / 2;
      const side = random() < 0.5 ? -1 : 1;
      this.x = Math.max(18, Math.min(canvasWidth - this.width - 18, playerCenter - this.width / 2 + side * (110 + random() * 150)));
      this.y = 42 + random() * 72;
      this.phaseShift = { fromX, fromY, toX: this.x, toY: this.y };
      this.dashTimer = 1.35 + random() * 1.1;
      this.targetTimer = 0.25;
    }

    if (this.targetTimer <= 0) {
      const playerCenter = player.x + player.width / 2;
      this.targetX = Math.max(18, Math.min(
        canvasWidth - this.width - 18,
        playerCenter - this.width / 2 + Math.sin(this.elapsed * 5) * 120,
      ));
      this.targetTimer = 0.22 + random() * 0.28;
      this.speedFactor = 0.9 + random() * 0.7;
    }

    const distance = this.targetX - this.x;
    const step = Math.min(Math.abs(distance), this.speed * this.speedFactor * deltaTime);
    this.x += Math.sign(distance) * step;
    this.y += Math.sin(this.elapsed * 7) * 24 * deltaTime;
    this.y = Math.max(34, Math.min(126, this.y));
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
    else if (this.kind === "harbinger") this.drawHarbinger(context, center, pulse, time);
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

  drawHarbinger(context, center, pulse, time) {
    context.save();
    context.translate(center, this.height / 2);
    context.rotate(time / 850);
    context.strokeStyle = this.color;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(0, -29);
    context.lineTo(30, 0);
    context.lineTo(0, 29);
    context.lineTo(-30, 0);
    context.closePath();
    context.stroke();
    context.rotate(-time / 425);
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, 20 + pulse * 4, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#fff6d5";
    context.beginPath();
    context.arc(0, 0, 7 + pulse * 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
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
    this.isMobileDevice = options.isMobileDevice || (() => (
      typeof window !== "undefined"
      && window.matchMedia("(pointer: coarse)").matches
    ));
    this.portraitRequired = false;
    this.keys = {};
    this.touchAxis = 0;
    this.joystick = null;
    this.joystickThumb = null;
    this.joystickPointer = null;
    this.joystickGeometry = null;
    this.joystickVisualValue = 0;
    this.joystickRenderPending = false;
    this.joystickAriaValue = null;
    this.joystickAriaText = null;
    this.joystickDirection = null;
    this.joystickKeys = new Set();
    this.requestFrame = options.requestFrame || ((callback) => (
      typeof requestAnimationFrame === "function" ? requestAnimationFrame(callback) : callback()
    ));
    this.running = false;
    this.paused = false;
    this.lastTime = 0;
    this.bindControls = options.bindControls !== false;
    this.ui = options.ui || this.findUi();
    this.backgrounds = this.preloadBackgrounds();

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
      pause: document.querySelector("#pause-toggle"),
      shell: document.querySelector("#page-shell"),
      orientation: document.querySelector("#orientation-alert"),
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
    this.paused = false;
    this.loadLevel();
  }

  loadLevel() {
    const level = LEVELS[this.levelIndex];

    if (this.canvas.style) {
      this.canvas.style.backgroundImage = `url("${level.background}")`;
    }

    this.player = new Player(this.canvas.width / 2 - 23, 430);
    this.bullets = [];
    this.enemyBullets = [];
    this.effects = [];
    this.invaders = [];
    this.boss = null;
    this.playerInvulnerability = 0;
    this.preBossDefeated = false;
    this.bossTransitionTimer = 0;
    this.phase = "fleet";
    this.direction = 1;
    this.speed = level.fleetSpeed;
    this.drop = level.drop;
    this.shootCooldown = 0;
    this.resetJoystick();
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
    addEventListener("keydown", (event) => this.handleKeyDown(event));
    addEventListener("keyup", (event) => this.handleKeyUp(event));

    const fireButton = document.querySelector('[data-control="fire"]');
    const firePress = (event) => {
      event.preventDefault();
      fireButton.setPointerCapture?.(event.pointerId);
      fireButton.classList.add("is-active");
      this.shoot();
    };
    const fireRelease = (event) => {
      event.preventDefault();
      fireButton.classList.remove("is-active");
    };
    fireButton.addEventListener("pointerdown", firePress);
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      fireButton.addEventListener(type, fireRelease);
    });

    this.bindJoystickControls();

    const resetInputs = () => {
      this.keys.ArrowLeft = false;
      this.keys.ArrowRight = false;
      this.resetJoystick();
      document.querySelectorAll(".touch-button.is-active").forEach((button) => {
        button.classList.remove("is-active");
      });
    };

    let previousLandscape = null;
    let previousWidth = null;
    const syncViewport = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      const landscape = innerWidth > innerHeight;
      document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
      document.documentElement.dataset.orientation = landscape ? "landscape" : "portrait";
      if (landscape !== previousLandscape || (previousWidth !== null && innerWidth !== previousWidth)) {
        resetInputs();
      }
      previousLandscape = landscape;
      previousWidth = innerWidth;
      this.handleOrientation(landscape);
    };

    let viewportFrame;
    const scheduleViewportSync = () => {
      cancelAnimationFrame(viewportFrame);
      viewportFrame = requestAnimationFrame(syncViewport);
    };

    addEventListener("blur", resetInputs);
    addEventListener("pagehide", resetInputs);
    addEventListener("resize", scheduleViewportSync, { passive: true });
    addEventListener("orientationchange", scheduleViewportSync, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleViewportSync, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) resetInputs();
    });
    this.ui.action.addEventListener("click", () => this.start());
    this.ui.pause.addEventListener("click", () => this.togglePause());
    syncViewport();
  }

  bindJoystickControls(joystick = document.querySelector("#move-joystick")) {
    this.joystick = joystick;
    this.joystickThumb = this.joystick.querySelector(".joystick-thumb");
    this.joystick.addEventListener("pointerdown", (event) => this.handleJoystickStart(event));
    this.joystick.addEventListener("pointermove", (event) => this.handleJoystickMove(event));
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      this.joystick.addEventListener(type, (event) => this.handleJoystickEnd(event));
    });
    this.joystick.addEventListener("keydown", (event) => this.handleJoystickKeyDown(event));
    this.joystick.addEventListener("keyup", (event) => this.handleJoystickKeyUp(event));
    this.joystick.addEventListener("blur", () => {
      if (this.joystickPointer === null) this.resetJoystick();
    });
  }

  measureJoystick() {
    const bounds = this.joystick.getBoundingClientRect();
    this.joystickGeometry = {
      centerX: bounds.left + bounds.width / 2,
      travel: Math.max(1, bounds.width * JOYSTICK_TRAVEL_RATIO),
    };
  }

  handleJoystickStart(event) {
    event.preventDefault();
    if (this.joystickPointer !== null) return;

    this.joystickPointer = event.pointerId;
    this.measureJoystick();
    this.joystick.setPointerCapture?.(event.pointerId);
    this.joystick.classList.add("is-active");
    this.handleJoystickMove(event);
  }

  handleJoystickMove(event) {
    if (event.pointerId !== this.joystickPointer || !this.joystickGeometry) return;
    event.preventDefault();
    const value = (event.clientX - this.joystickGeometry.centerX) / this.joystickGeometry.travel;
    this.setJoystickValue(value);
  }

  handleJoystickEnd(event) {
    if (event.pointerId !== this.joystickPointer) return;
    event.preventDefault();
    this.resetJoystick();
  }

  handleJoystickKeyDown(event) {
    const value = event.code === "ArrowLeft" || event.code === "Home"
      ? -1
      : event.code === "ArrowRight" || event.code === "End" ? 1 : null;
    if (value === null) return;

    event.preventDefault();
    event.stopPropagation();
    if (!this.joystickGeometry) this.measureJoystick();
    this.joystickKeys.add(event.code);
    this.joystick.classList.add("is-active");
    this.setJoystickValue(value);
  }

  handleJoystickKeyUp(event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.code)) return;
    event.preventDefault();
    event.stopPropagation();
    this.joystickKeys.delete(event.code);
    const leftPressed = this.joystickKeys.has("ArrowLeft") || this.joystickKeys.has("Home");
    const rightPressed = this.joystickKeys.has("ArrowRight") || this.joystickKeys.has("End");
    if (!leftPressed && !rightPressed) {
      this.resetJoystick();
    } else if (leftPressed !== rightPressed) {
      this.setJoystickValue(rightPressed ? 1 : -1);
    }
  }

  setJoystickValue(value) {
    const normalized = Math.max(-1, Math.min(1, value));
    const nextAxis = Math.abs(normalized) < JOYSTICK_DEAD_ZONE ? 0 : Math.sign(normalized);
    if (nextAxis === this.touchAxis) return;

    this.touchAxis = nextAxis;
    this.joystickVisualValue = nextAxis;
    if (!this.joystick || !this.joystickThumb) return;

    this.scheduleJoystickRender();
  }

  scheduleJoystickRender() {
    if (this.joystickRenderPending) return;
    this.joystickRenderPending = true;
    this.requestFrame(() => {
      this.joystickRenderPending = false;
      this.renderJoystick();
    });
  }

  renderJoystick() {
    if (!this.joystick || !this.joystickThumb) return;

    const travel = this.joystickGeometry?.travel || 0;
    const offset = this.joystickVisualValue * travel;
    this.joystickThumb.style.transform = `translate3d(calc(-50% + ${offset.toFixed(2)}px), -50%, 0)`;

    const ariaValue = Math.round(this.touchAxis * 100);
    const direction = ariaValue < 0 ? "left" : ariaValue > 0 ? "right" : "center";
    const ariaText = direction === "center"
      ? "Centered"
      : direction === "left" ? "Left" : "Right";

    if (ariaValue !== this.joystickAriaValue) {
      this.joystick.setAttribute("aria-valuenow", String(ariaValue));
      this.joystickAriaValue = ariaValue;
    }
    if (ariaText !== this.joystickAriaText) {
      this.joystick.setAttribute("aria-valuetext", ariaText);
      this.joystickAriaText = ariaText;
    }
    if (direction !== this.joystickDirection) {
      this.joystick.dataset.direction = direction;
      this.joystickDirection = direction;
    }
  }

  resetJoystick() {
    const pointer = this.joystickPointer;
    this.joystickPointer = null;
    this.joystickGeometry = null;
    this.joystickKeys.clear();
    this.joystick?.classList.remove("is-active");
    if (pointer !== null && this.joystick?.hasPointerCapture?.(pointer)) {
      this.joystick.releasePointerCapture(pointer);
    }
    this.setJoystickValue(0);
  }

  handleOrientation(landscape) {
    if (!landscape) {
      this.portraitRequired = false;
      this.setOrientationOverlay(false);
      return;
    }

    if (!this.isMobileDevice()) return;

    this.portraitRequired = true;
    if (this.running && !this.paused) this.togglePause();
    this.setOrientationOverlay(true);
  }

  setOrientationOverlay(visible) {
    this.ui.shell?.classList[visible ? "add" : "remove"]("orientation-hidden");
    this.ui.shell?.setAttribute("aria-hidden", String(visible));
    this.ui.orientation?.classList[visible ? "add" : "remove"]("is-visible");
    this.ui.orientation?.setAttribute("aria-hidden", String(!visible));
  }

  handleKeyDown(event) {
    if (["ArrowLeft", "ArrowRight", "Space", "Escape", "Enter"].includes(event.code)) {
      event.preventDefault();
    }

    if (event.code === "Escape" && !event.repeat) {
      this.togglePause();
      return;
    }

    if (event.code === "Enter" && !event.repeat
      && (this.paused || this.pendingNextLevel || (!this.running && !this.ended))) {
      this.start();
      return;
    }

    this.keys[event.code] = true;
    if (event.code === "Space" && !event.repeat) this.shoot();
  }

  handleKeyUp(event) {
    this.keys[event.code] = false;
  }

  start() {
    if (this.portraitRequired) return;

    this.audio.init();

    if (this.paused) {
      this.audio.startMusic?.(this.levelIndex);
      this.paused = false;
      this.ui.panel.classList.add("hidden");
      this.ui.status.textContent = "Mission active";
      this.updatePauseControl();
      this.canvas.focus();
      return;
    }

    if (this.ended) {
      this.resetCampaign();
    } else if (this.pendingNextLevel) {
      this.levelIndex += 1;
      this.pendingNextLevel = false;
      this.loadLevel();
    }

    this.audio.startMusic?.(this.levelIndex);
    this.running = true;
    this.paused = false;
    this.ui.panel.classList.add("hidden");
    this.ui.status.textContent = "Mission active";
    this.updatePauseControl();
    this.canvas.focus();
  }

  togglePause() {
    if (!this.running || this.ended || this.pendingNextLevel) return;
    if (this.paused && this.portraitRequired) return;

    this.paused = !this.paused;
    this.keys.ArrowLeft = false;
    this.keys.ArrowRight = false;
    this.resetJoystick();
    if (this.paused) {
      this.ui.kicker.textContent = "Mission suspended";
      this.ui.title.textContent = "Game paused";
      this.ui.copy.textContent = "Press ESC, Enter, or Resume when you are ready.";
      this.ui.action.textContent = "Resume";
      this.ui.status.textContent = "Paused";
      this.ui.panel.classList.remove("hidden");
    } else {
      this.ui.panel.classList.add("hidden");
      this.ui.status.textContent = "Mission active";
      this.canvas.focus();
    }
    this.updatePauseControl();
  }

  updatePauseControl() {
    if (!this.ui.pause) return;
    this.ui.pause.setAttribute("aria-pressed", String(this.paused));
    this.ui.pause.setAttribute("aria-label", this.paused ? "Resume game" : "Pause game");
    this.ui.pause.innerHTML = this.paused ? "▶ <span>Resume</span>" : "Ⅱ <span>Pause</span>";
  }

  shoot() {
    if (!this.running || this.paused || this.shootCooldown > 0) return;

    this.bullets.push(new Bullet(this.player.x + 21, this.player.y - 9, -350));
    this.shootCooldown = 0.3;
    this.audio.shoot();
    this.vibrate(12);
  }

  update(deltaTime) {
    if (this.paused) return;
    this.updateEffects(deltaTime);
    if (!this.running) return;

    this.updatePlayer(deltaTime);
    this.updateBullets(deltaTime);

    if (this.phase === "fleet") this.updateFleet(deltaTime);
    else if (this.phase === "boss-transition") this.updateBossTransition(deltaTime);
    else this.updateBoss(deltaTime);

    this.updateUfo(deltaTime);
    this.collisions();

    if (!this.running) return;

    if (this.phase === "fleet" && this.invaders.some((invader) => invader.y + invader.height >= this.player.y)) {
      this.finish(false);
    } else if (this.phase === "fleet" && this.invaders.length === 0) {
      if (LEVELS[this.levelIndex].preBoss && !this.preBossDefeated) this.spawnPreBoss();
      else this.spawnBoss();
    }
  }

  updatePlayer(deltaTime) {
    this.shootCooldown -= deltaTime;
    this.playerInvulnerability = Math.max(0, this.playerInvulnerability - deltaTime);
    const keyboardMovement = (this.keys.ArrowRight ? 1 : 0) - (this.keys.ArrowLeft ? 1 : 0);
    const movement = Math.max(-1, Math.min(1, keyboardMovement + this.touchAxis));
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
    if (this.boss.phaseShift) {
      const shift = this.boss.phaseShift;
      this.effects.push(new Explosion(shift.fromX + this.boss.width / 2, shift.fromY + this.boss.height / 2, this.boss.color, this.random, {
        duration: 0.42,
        particleCount: 18,
        power: 0.9,
      }));
      this.effects.push(new Explosion(shift.toX + this.boss.width / 2, shift.toY + this.boss.height / 2, this.boss.color, this.random, {
        duration: 0.42,
        particleCount: 18,
        power: 0.9,
      }));
    }

    if (this.boss.fireTimer <= 0) {
      this.fireBossPattern();
    }
  }

  updateBossTransition(deltaTime) {
    this.bossTransitionTimer -= deltaTime;
    if (this.bossTransitionTimer <= 0) this.spawnBoss();
  }

  createAimedBullet(originX, originY, speed, targetOffset = 0, horizontalBias = 0) {
    const targetX = this.player.x + this.player.width / 2 + targetOffset;
    const targetY = this.player.y + this.player.height / 2;
    const travelTime = Math.max(0.1, (targetY - originY) / speed);
    return new Bullet(originX, originY, speed, true, (targetX - originX) / travelTime + horizontalBias);
  }

  fireBossPattern() {
    const boss = this.boss;
    const speed = 195 + this.levelIndex * 25;
    const originY = boss.y + boss.height;
    const preBoss = this.phase === "pre-boss";

    if (boss.kind === "harbinger") {
      if (boss.attackIndex % 2 === 0) {
        [-170, -85, 0, 85, 170].forEach((offset) => {
          this.enemyBullets.push(this.createAimedBullet(boss.x + boss.width / 2, originY, speed + 15, offset));
        });
      } else {
        [18, boss.width / 2, boss.width - 18].forEach((offset, index) => {
          this.enemyBullets.push(this.createAimedBullet(boss.x + offset, originY, speed + 30, [120, 0, -120][index]));
        });
      }
      this.audio.harbingerShoot();
      boss.fireTimer = boss.fireDelay * (boss.attackIndex % 2 === 0 ? 1.1 : 0.8);
    } else if (boss.kind === "sovereign") {
      const pattern = boss.attackIndex % 3;
      if (pattern === 0) {
        [-95, 0, 95].forEach((offset) => {
          this.enemyBullets.push(this.createAimedBullet(boss.x + boss.width / 2, originY, speed + 25, offset));
        });
      } else if (pattern === 1) {
        [18, boss.width / 2, boss.width - 18].forEach((offset, index) => {
          this.enemyBullets.push(this.createAimedBullet(boss.x + offset, originY, speed + 10, [140, 0, -140][index]));
        });
      } else {
        const projectileCount = preBoss ? 5 : 7;
        for (let index = 0; index < projectileCount; index += 1) {
          const offset = 12 + index * (boss.width - 24) / (projectileCount - 1);
          const horizontalBias = (index % 2 ? 1 : -1) * (55 + index * 5);
          this.enemyBullets.push(new Bullet(boss.x + offset, originY, speed + 40, true, horizontalBias));
        }
      }
      this.audio.bossShoot(this.levelIndex);
      boss.fireTimer = boss.fireDelay * [1, 1.12, 1.35][pattern];
    } else {
      const origins = boss.kind === "sentinel" ? [boss.width / 2] : [30, boss.width - 30];
      origins.forEach((offset) => {
        this.enemyBullets.push(this.createAimedBullet(boss.x + offset, originY, speed));
      });
      this.audio.bossShoot(this.levelIndex);
      boss.fireTimer = boss.fireDelay;
    }

    boss.attackIndex += 1;
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
    if (this.boss.kind === "harbinger") this.audio.harbingerAppear();
    else this.audio.bossAppear(this.levelIndex);
  }

  spawnPreBoss() {
    this.phase = "pre-boss";
    this.ufo = null;
    this.bullets = [];
    this.enemyBullets = [];
    this.boss = new Boss(LEVELS[this.levelIndex].preBoss, this.canvas.width);
    this.ui.status.textContent = `PRE-BOSS · ${this.boss.name} · ${this.boss.health} HP`;
    if (this.boss.kind === "harbinger") this.audio.harbingerAppear();
    else this.audio.bossAppear(this.levelIndex);
  }

  collisions() {
    this.bullets = this.bullets.filter((bullet) => {
      if (["boss", "pre-boss"].includes(this.phase) && this.boss && this.hit(bullet, this.boss)) {
        this.effects.push(new Explosion(bullet.x, bullet.y, this.boss.color, this.random, {
          duration: 0.3,
          particleCount: 8,
          power: 0.65,
        }));
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
        this.effects.push(new Explosion(
          this.ufo.x + this.ufo.width / 2,
          this.ufo.y + this.ufo.height / 2,
          "#ffd95a",
          this.random,
          { duration: 0.65, particleCount: 24, power: 1.25 },
        ));
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
      if (this.playerInvulnerability > 0) return false;

      this.effects.push(new Explosion(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        "#55ecff",
        this.random,
        { duration: 0.7, particleCount: 26, power: 1.35 },
      ));
      this.lives -= 1;
      this.audio.hit();
      this.vibrate([45, 35, 80]);
      this.updateHud();
      this.player.x = this.canvas.width / 2 - 23;
      if (this.lives <= 0) this.finish(false);
      else this.playerInvulnerability = RESPAWN_INVULNERABILITY;
      return false;
    });
  }

  damageBoss() {
    this.boss.health -= 1;

    if (this.boss.health <= 0) {
      const defeatedBoss = this.boss;
      this.effects.push(new BossExplosion(
        defeatedBoss.x + defeatedBoss.width / 2,
        defeatedBoss.y + defeatedBoss.height / 2,
        defeatedBoss.color,
        this.random,
      ));
      const preBoss = this.phase === "pre-boss";
      if (defeatedBoss.kind === "harbinger") this.audio.harbingerDefeat();
      else this.audio.bossDefeat(this.levelIndex);
      this.score += this.boss.score;
      this.boss = null;
      this.updateHud();
      if (preBoss) {
        this.preBossDefeated = true;
        this.phase = "boss-transition";
        this.bossTransitionTimer = 1.05;
        this.bullets = [];
        this.enemyBullets = [];
        this.ui.status.textContent = "Void breached · Harbinger incoming";
      } else {
        this.completeLevel();
      }
      return;
    }

    if (this.boss.kind === "harbinger") this.audio.harbingerHit();
    else this.audio.bossHit(this.levelIndex);
    const label = this.phase === "pre-boss" ? "PRE-BOSS" : "BOSS";
    this.ui.status.textContent = `${label} · ${this.boss.name} · ${this.boss.health} HP`;
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
    this.ui.copy.textContent = `${LEVELS[this.levelIndex + 1].name} is waiting. Score: ${this.score}. Press Enter to continue.`;
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
    this.audio.stopMusic?.();
  }

  draw() {
    const context = this.ctx;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const gradient = context.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "rgba(2,3,12,.08)");
    gradient.addColorStop(1, "rgba(2,3,12,.55)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const renderTime = performance.now();
    this.player.draw(context, this.playerInvulnerability > 0, renderTime);

    const animationFrame = Math.floor(renderTime / 300) % 2;
    this.invaders.forEach((invader) => invader.draw(context, animationFrame));
    this.effects.forEach((effect) => effect.draw(context));
    this.boss?.draw(context, renderTime);
    this.bullets.forEach((bullet) => bullet.draw(context));
    this.enemyBullets.forEach((bullet) => bullet.draw(context));
    if (this.ufo) this.drawUfo(context);
    if (this.boss) this.drawBossHealth(context);
  }

  drawBossHealth(context) {
    const width = 210;
    const healthRatio = this.boss.health / this.boss.maxHealth;
    const x = (this.canvas.width - width) / 2;
    const label = this.phase === "pre-boss" ? "SECTOR GUARDIAN" : "LEVEL BOSS";

    context.save();
    context.font = '700 10px "Space Mono", monospace';
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.shadowBlur = 8;
    context.shadowColor = this.boss.color;
    context.fillText(`${label} · ${this.boss.name.toUpperCase()}`, this.canvas.width / 2, 15);
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
    game.audio.setEnabled(!game.audio.enabled);
    this.setAttribute("aria-pressed", String(game.audio.enabled));
    this.setAttribute("aria-label", game.audio.enabled ? "Disable audio" : "Enable audio");
    this.innerHTML = game.audio.enabled ? "♪ <span>Audio on</span>" : "× <span>Audio off</span>";
    if (game.audio.enabled && game.running) game.audio.startMusic(game.levelIndex);
  });

}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEVELS, AudioEngine, Bullet, Player, Invader, Explosion, BossExplosion, Boss, Game };
}

if (typeof document !== "undefined") {
  bootstrap();
}
