const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  LEVELS,
  AudioEngine,
  Bullet,
  Invader,
  Explosion,
  BossExplosion,
  Game,
} = require("../script.js");

function createClassList() {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    contains: (value) => values.has(value),
  };
}

function createElement() {
  const attributes = new Map();
  return {
    textContent: "",
    innerHTML: "",
    style: {},
    dataset: {},
    classList: createClassList(),
    setAttribute: (name, value) => attributes.set(name, value),
    getAttribute: (name) => attributes.get(name),
  };
}

function createUi() {
  return {
    score: createElement(),
    lives: createElement(),
    level: createElement(),
    status: createElement(),
    panel: createElement(),
    kicker: createElement(),
    title: createElement(),
    copy: createElement(),
    action: createElement(),
    pause: createElement(),
    shell: createElement(),
    orientation: createElement(),
  };
}

function createAudio() {
  const calls = [];
  const audio = { calls, enabled: true };

  [
    "init",
    "shoot",
    "alienShoot",
    "move",
    "hit",
    "enemyDefeat",
    "bonus",
    "campaignWin",
    "lose",
    "bossAppear",
    "bossShoot",
    "bossHit",
    "bossDefeat",
    "harbingerAppear",
    "harbingerShoot",
    "harbingerHit",
    "harbingerDefeat",
    "startMusic",
    "stopMusic",
  ].forEach((method) => {
    audio[method] = (levelIndex) => calls.push([method, levelIndex]);
  });

  return audio;
}

function createGame(options = {}) {
  const canvas = {
    width: 720,
    height: 480,
    style: {},
    focus() {},
    getContext: () => ({}),
  };
  const ui = createUi();
  const audio = createAudio();
  const vibrations = [];
  const game = new Game(canvas, {
    ui,
    audio,
    bindControls: false,
    random: () => 0.5,
    vibrate: (pattern) => vibrations.push(pattern),
    ...options,
  });

  return { game, canvas, ui, audio, vibrations };
}

test("campaign defines unique backgrounds and bosses for every level", () => {
  assert.equal(LEVELS.length, 3);
  assert.equal(new Set(LEVELS.map((level) => level.background)).size, LEVELS.length);
  assert.equal(new Set(LEVELS.map((level) => level.boss.name)).size, LEVELS.length);

  LEVELS.forEach((level) => {
    const backgroundPath = path.join(__dirname, "..", level.background);
    assert.equal(fs.existsSync(backgroundPath), true, `${level.background} should exist`);
  });
});

test("level backgrounds render through CSS instead of the low-resolution canvas buffer", () => {
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");

  assert.doesNotMatch(script, /drawImage\(this\.background/);
  assert.match(css, /background-size: cover/);
  assert.match(css, /background-position: center/);
});

test("new campaign creates the first fleet and initializes the HUD", () => {
  const { game, canvas, ui } = createGame();
  const firstLevel = LEVELS[0];

  assert.equal(game.invaders.length, firstLevel.rows * firstLevel.columns);
  assert.equal(game.score, 0);
  assert.equal(game.lives, 3);
  assert.equal(ui.score.textContent, "00000");
  assert.equal(ui.lives.textContent, "♥ ♥ ♥");
  assert.equal(ui.level.textContent, "Level 1/3");
  assert.match(canvas.style.backgroundImage, /level-1-background\.webp/);
});

test("the final fleet matches level two's formation with a modest speed increase", () => {
  const levelTwo = LEVELS[1];
  const finalLevel = LEVELS[2];

  assert.equal(finalLevel.rows, levelTwo.rows);
  assert.equal(finalLevel.columns, levelTwo.columns);
  assert.equal(finalLevel.rows * finalLevel.columns, 36);
  assert.ok(finalLevel.fleetSpeed > levelTwo.fleetSpeed);
  assert.ok(finalLevel.fleetSpeed - levelTwo.fleetSpeed <= 5);
});

test("bullets move according to elapsed time", () => {
  const bullet = new Bullet(10, 100, -350);
  bullet.update(0.2);
  assert.equal(bullet.y, 30);
});

test("aimed bullets move horizontally as well as vertically", () => {
  const bullet = new Bullet(100, 100, 200, true, -80);
  bullet.update(0.25);
  assert.equal(bullet.x, 80);
  assert.equal(bullet.y, 150);
});

test("shooting and taking damage use distinct haptic feedback", () => {
  const { game, vibrations } = createGame();
  game.running = true;
  game.shoot();
  assert.deepEqual(vibrations, [12]);

  game.enemyBullets = [new Bullet(game.player.x, game.player.y, 0, true)];
  game.collisions();
  assert.deepEqual(vibrations, [12, [45, 35, 80]]);
  assert.ok(game.effects.some((effect) => effect instanceof Explosion));
});

test("respawn grants two seconds of blinking collision immunity", () => {
  const { game } = createGame();
  game.running = true;
  game.enemyBullets = [
    new Bullet(game.player.x, game.player.y, 0, true),
    new Bullet(game.player.x, game.player.y, 0, true),
  ];

  game.collisions();
  assert.equal(game.lives, 2, "simultaneous projectiles must cost only one life");
  assert.equal(game.playerInvulnerability, 2);
  assert.equal(game.enemyBullets.length, 0);

  game.enemyBullets = [new Bullet(game.player.x, game.player.y, 0, true)];
  game.collisions();
  assert.equal(game.lives, 2, "overlapping shots are harmless during respawn immunity");
  assert.equal(game.enemyBullets.length, 0, "shots touching the protected ship are consumed");
  game.updatePlayer(1.99);
  assert.equal(game.lives, 2);
  game.updatePlayer(0.02);
  game.enemyBullets = [new Bullet(game.player.x, game.player.y, 0, true)];
  game.collisions();
  assert.equal(game.lives, 1, "damage resumes after the full two-second window");

  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  assert.match(script, /Math\.floor\(time \/ 90\) % 2/);
});

test("starting a mission enables a quiet synthesized music layer", () => {
  const { game, audio } = createGame();
  game.start();

  assert.deepEqual(audio.calls.slice(0, 2), [["init", undefined], ["startMusic", 0]]);
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  assert.match(script, /this\.musicBus\.gain\.value = 0\.22/);
  assert.match(script, /setInterval\(\(\) => this\.playMusicStep\(\), 240\)/);
});

test("the audio engine routes music below effects and stops its sequencer when muted", () => {
  const originalWindow = global.window;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const clearedTimers = [];

  class FakeAudioNode {
    constructor() {
      this.gain = {
        value: 0,
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
      };
      this.frequency = {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
      };
    }

    connect(target) { return target; }
    start() {}
    stop() {}
  }

  class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.state = "running";
      this.destination = new FakeAudioNode();
    }

    createGain() { return new FakeAudioNode(); }
    createOscillator() { return new FakeAudioNode(); }
    resume() {}
  }

  try {
    global.window = { AudioContext: FakeAudioContext };
    global.setInterval = (callback, delay) => ({ callback, delay });
    global.clearInterval = (timer) => clearedTimers.push(timer);
    const audio = new AudioEngine();

    audio.startMusic(2);
    assert.equal(audio.sfxBus.gain.value, 1);
    assert.equal(audio.musicBus.gain.value, 0.22);
    assert.equal(audio.musicTimer.delay, 240);
    assert.equal(audio.musicLevel, 2);

    const activeTimer = audio.musicTimer;
    audio.setEnabled(false);
    assert.equal(audio.musicTimer, null);
    assert.deepEqual(clearedTimers, [activeTimer]);
  } finally {
    global.window = originalWindow;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  }
});

test("invaders use four curved drone silhouettes instead of one pixel sprite", () => {
  const calls = [];
  const context = new Proxy({}, {
    get: (target, property) => {
      if (!(property in target)) target[property] = (...args) => calls.push([property, ...args]);
      return target[property];
    },
    set: (target, property, value) => {
      target[property] = value;
      return true;
    },
  });

  for (let row = 0; row < 4; row += 1) new Invader(10, 20, row).draw(context, row % 2);

  assert.ok(calls.some(([method]) => method === "quadraticCurveTo"));
  assert.ok(calls.some(([method]) => method === "rotate"));
  assert.ok(calls.filter(([method]) => method === "ellipse").length >= 4);
});

test("the mobile arcade knob provides binary movement and springs to center", () => {
  const { game } = createGame();
  game.joystick = createElement();
  game.joystickThumb = createElement();
  game.joystickGeometry = { centerX: 100, travel: 70 };
  const startX = game.player.x;

  game.setJoystickValue(-0.8);
  assert.equal(game.touchAxis, -1);
  assert.match(game.joystickThumb.style.transform, /-70\.00px/);
  assert.equal(game.joystick.getAttribute("aria-valuetext"), "Left");
  game.updatePlayer(1 / 60);
  assert.equal(game.player.x, startX - game.player.speed, "the on/off control must move at full speed");

  game.setJoystickValue(0.75);
  assert.equal(game.touchAxis, 1);
  assert.match(game.joystickThumb.style.transform, /70\.00px/);
  assert.equal(game.joystick.getAttribute("aria-valuetext"), "Right");

  game.setJoystickValue(0.19);
  assert.equal(game.touchAxis, 0, "the center dead zone must remain stable");

  game.resetJoystick();
  assert.equal(game.touchAxis, 0);
  assert.match(game.joystickThumb.style.transform, /0\.00px/);
  assert.equal(game.joystick.getAttribute("aria-valuetext"), "Centered");
});

test("a burst of touch samples measures layout once and renders only the latest sample", () => {
  const frames = [];
  const { game } = createGame({
    requestFrame: (callback) => frames.push(callback),
  });
  const joystick = createElement();
  const thumb = createElement();
  const listeners = new Map();
  let layoutReads = 0;
  let styleWrites = 0;
  let capturedPointer = null;
  let releasedPointer = null;
  let ariaWrites = 0;
  thumb.style = new Proxy({}, {
    set(target, property, value) {
      styleWrites += 1;
      target[property] = value;
      return true;
    },
  });
  joystick.getBoundingClientRect = () => {
    layoutReads += 1;
    return { left: 100, width: 200 };
  };
  joystick.setPointerCapture = (pointerId) => { capturedPointer = pointerId; };
  joystick.hasPointerCapture = (pointerId) => capturedPointer === pointerId;
  joystick.releasePointerCapture = (pointerId) => {
    releasedPointer = pointerId;
    capturedPointer = null;
  };
  joystick.querySelector = () => thumb;
  joystick.addEventListener = (type, listener) => {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(listener);
  };
  const setAttribute = joystick.setAttribute;
  joystick.setAttribute = (name, value) => {
    ariaWrites += 1;
    setAttribute(name, value);
  };
  game.bindJoystickControls(joystick);

  const pointerEvent = (clientX, pointerId = 7) => ({
    clientX,
    pointerId,
    preventDefault() {},
  });
  const emit = (type, event) => listeners.get(type).forEach((listener) => listener(event));

  emit("pointerdown", pointerEvent(200));
  assert.equal(game.touchAxis, 0, "the measured center must map to neutral");
  emit("pointermove", pointerEvent(130));
  assert.equal(game.touchAxis, -1, "the cached left edge must map to full speed");
  for (let index = 0; index < 240; index += 1) {
    emit("pointermove", pointerEvent(130 + (140 * index) / 239));
  }
  emit("pointermove", pointerEvent(100, 8));
  emit("pointerup", pointerEvent(270, 8));

  assert.equal(layoutReads, 1, "geometry must be cached for the whole gesture");
  assert.equal(frames.length, 1, "visual work must be coalesced into one animation frame");
  assert.equal(styleWrites, 0, "pointer events must not write any style before the animation frame");
  assert.deepEqual({ ...thumb.style }, {});
  assert.equal(capturedPointer, 7);
  assert.equal(game.joystickPointer, 7, "a foreign pointer must not end the gesture");
  assert.ok(game.touchAxis > 0.99, "gameplay input must use the latest sample immediately");

  frames.shift()();
  assert.match(thumb.style.transform, /64\.00px/);
  assert.equal(styleWrites, 1);
  assert.equal(ariaWrites, 2, "ARIA state must be written once for the rendered sample");
  assert.equal(joystick.dataset.direction, "right");

  for (let index = 0; index < 120; index += 1) emit("pointermove", pointerEvent(270));
  assert.equal(frames.length, 0, "holding one binary direction must not schedule redundant frames");
  assert.equal(styleWrites, 1);
  assert.equal(ariaWrites, 2, "unchanged ARIA state must not be rewritten on later frames");

  emit("pointerup", pointerEvent(270));
  assert.equal(game.touchAxis, 0);
  assert.equal(releasedPointer, 7);
  assert.equal(capturedPointer, null);
  assert.equal(joystick.classList.contains("is-active"), false);
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.match(thumb.style.transform, /0\.00px/);

  emit("lostpointercapture", pointerEvent(270));
  assert.equal(frames.length, 0, "lost capture after release must not reset twice");

  emit("pointerdown", pointerEvent(130));
  emit("pointercancel", pointerEvent(130));
  assert.equal(frames.length, 1, "a quick cancel must reuse the pending visual frame");
  frames.shift()();
  assert.equal(game.touchAxis, 0);
  assert.match(thumb.style.transform, /0\.00px/, "a pending frame must render the latest neutral state");
  assert.equal(layoutReads, 2);
});

test("joystick keyboard controls preserve the direction that is still held", () => {
  const { game } = createGame();
  game.joystick = createElement();
  game.joystickThumb = createElement();
  game.joystick.getBoundingClientRect = () => ({ left: 0, width: 200 });
  const keyEvent = (code) => {
    const state = { prevented: false, stopped: false };
    return {
      code,
      state,
      preventDefault: () => { state.prevented = true; },
      stopPropagation: () => { state.stopped = true; },
    };
  };

  const leftDown = keyEvent("ArrowLeft");
  game.handleJoystickKeyDown(leftDown);
  assert.equal(game.touchAxis, -1);
  assert.deepEqual(leftDown.state, { prevented: true, stopped: true });

  game.handleJoystickKeyDown(keyEvent("ArrowRight"));
  assert.equal(game.touchAxis, 1, "the most recent direction must win");
  game.handleJoystickKeyUp(keyEvent("ArrowLeft"));
  assert.equal(game.touchAxis, 1, "releasing left must preserve a held right key");
  game.handleJoystickKeyUp(keyEvent("ArrowRight"));
  assert.equal(game.touchAxis, 0);
  assert.equal(game.joystick.classList.contains("is-active"), false);
});

test("mobile markup exposes an accessible binary arcade knob without layout animation", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  assert.match(html, /id="move-joystick" role="slider" tabindex="0" data-direction="center"/);
  assert.match(html, /aria-describedby="move-joystick-help" aria-orientation="horizontal"/);
  assert.doesNotMatch(html, /data-control="(?:left|right)"/);
  assert.match(css, /will-change: transform/);
  assert.doesNotMatch(css, /transition: left/);
  assert.doesNotMatch(script, /joystickThumb\.style\.left/);
});

test("destroying an invader creates an explosion and a dedicated sound", () => {
  const { game, audio } = createGame();
  const invader = game.invaders[0];
  game.bullets = [new Bullet(invader.x, invader.y, 0)];

  game.collisions();

  assert.equal(game.effects.length, 1);
  assert.deepEqual(audio.calls.at(-1), ["enemyDefeat", invader.row]);
  game.updateEffects(0.5);
  assert.equal(game.effects.length, 0);
});

test("the bonus UFO and boss collisions create distinct visual effects", () => {
  const { game } = createGame();
  game.ufo = { x: 100, y: 25, width: 48, height: 19, speed: 0 };
  game.bullets = [new Bullet(110, 30, 0)];
  game.collisions();
  assert.equal(game.effects.length, 1);
  assert.ok(game.effects[0] instanceof Explosion);

  game.spawnBoss();
  game.boss.health = 1;
  game.bullets = [new Bullet(game.boss.x + 10, game.boss.y + 10, 0)];
  game.collisions();
  assert.ok(game.effects.some((effect) => effect instanceof BossExplosion));
});

test("Escape pauses and resumes the active game without advancing it", () => {
  const { game, ui } = createGame();
  game.running = true;
  const event = { code: "Escape", repeat: false, preventDefault() {} };
  game.handleKeyDown(event);

  assert.equal(game.paused, true);
  assert.equal(ui.panel.classList.contains("hidden"), false);
  assert.equal(ui.pause.getAttribute("aria-pressed"), "true");
  const firstInvaderX = game.invaders[0].x;
  const bulletCount = game.bullets.length;
  game.shoot();
  game.update(0.25);
  assert.equal(game.invaders[0].x, firstInvaderX);
  assert.equal(game.bullets.length, bulletCount);

  game.handleKeyDown(event);
  assert.equal(game.paused, false);
  assert.equal(ui.panel.classList.contains("hidden"), true);
});

test("Enter starts the next unlocked level", () => {
  const { game } = createGame();
  game.running = false;
  game.pendingNextLevel = true;
  game.handleKeyDown({ code: "Enter", repeat: false, preventDefault() {} });

  assert.equal(game.levelIndex, 1);
  assert.equal(game.running, true);
  assert.equal(game.pendingNextLevel, false);
});

test("mobile landscape pauses and hides the game until portrait returns", () => {
  const { game, ui } = createGame({ isMobileDevice: () => true });
  game.running = true;

  game.handleOrientation(true);
  assert.equal(game.paused, true);
  assert.equal(ui.shell.classList.contains("orientation-hidden"), true);
  assert.equal(ui.shell.getAttribute("aria-hidden"), "true");
  assert.equal(ui.orientation.classList.contains("is-visible"), true);
  assert.equal(ui.orientation.getAttribute("aria-hidden"), "false");

  game.handleOrientation(true);
  game.togglePause();
  assert.equal(game.paused, true, "the game cannot resume while landscape is still active");

  game.handleOrientation(false);
  assert.equal(game.paused, true, "returning to portrait must not resume automatically");
  assert.equal(ui.shell.classList.contains("orientation-hidden"), false);
  assert.equal(ui.shell.getAttribute("aria-hidden"), "false");
  assert.equal(ui.orientation.classList.contains("is-visible"), false);
  assert.equal(ui.orientation.getAttribute("aria-hidden"), "true");
  game.togglePause();
  assert.equal(game.paused, false, "the player can resume after returning to portrait");
});

test("the page includes an SVG favicon and a single-line mobile HUD", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");

  assert.match(html, /rel="icon" href="assets\/favicon\.svg"/);
  assert.equal(fs.existsSync(path.join(__dirname, "..", "assets", "favicon.svg")), true);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /white-space: nowrap/);
  assert.match(css, /-webkit-touch-callout: none/);
  assert.match(css, /-webkit-user-select: none/);
});

test("clearing a fleet starts that level's boss phase", () => {
  const { game, ui, audio } = createGame();
  game.running = true;
  game.invaders = [];

  game.update(0);

  assert.equal(game.phase, "boss");
  assert.equal(game.boss.name, LEVELS[0].boss.name);
  assert.equal(game.boss.health, LEVELS[0].boss.health);
  assert.match(ui.status.textContent, /Orbital Sentinel/);
  assert.deepEqual(audio.calls.at(-1), ["bossAppear", 0]);
});

test("the final fleet unlocks the Sovereign before the Harbinger", () => {
  const { game, ui, audio } = createGame();
  game.levelIndex = LEVELS.length - 1;
  game.loadLevel();
  game.running = true;
  game.invaders = [];

  game.update(0);
  assert.equal(game.phase, "pre-boss");
  assert.equal(game.boss.kind, "sovereign");
  assert.match(ui.status.textContent, /Void Sovereign/);
  assert.deepEqual(audio.calls.at(-1), ["bossAppear", 2]);

  game.boss.health = 1;
  game.damageBoss();
  assert.equal(game.phase, "boss-transition");
  assert.equal(game.preBossDefeated, true);
  assert.deepEqual(audio.calls.at(-1), ["bossDefeat", 2]);
  assert.match(ui.status.textContent, /Harbinger incoming/);

  game.update(1.1);
  assert.equal(game.phase, "boss");
  assert.equal(game.boss.kind, "harbinger");
  assert.deepEqual(audio.calls.at(-1), ["harbingerAppear", undefined]);
});

test("the rebalanced Sovereign mini-boss rotates three reduced patterns", () => {
  const { game } = createGame();
  game.levelIndex = LEVELS.length - 1;
  game.loadLevel();
  game.spawnPreBoss();

  [3, 3, 5].forEach((expectedCount) => {
    game.enemyBullets = [];
    game.boss.fireTimer = 0;
    game.updateBoss(0);
    assert.equal(game.enemyBullets.length, expectedCount);
  });
  assert.equal(game.boss.health, 10);
  assert.ok(game.boss.fireDelay > 0.8);
});

test("the final Harbinger keeps phase shifts but fires at a moderated cadence", () => {
  const { game } = createGame();
  game.levelIndex = LEVELS.length - 1;
  game.loadLevel();
  game.spawnBoss();
  game.boss.dashTimer = 0;
  game.boss.fireTimer = 0;

  game.updateBoss(0.1);
  assert.equal(game.effects.length, 2, "phase shift should leave effects at departure and arrival");
  assert.equal(game.enemyBullets.length, 5);
  assert.equal(game.boss.health, 12);
  assert.equal(game.boss.speed, 132);
  assert.equal(game.boss.fireDelay, 0.98);

  game.enemyBullets = [];
  game.boss.fireTimer = 0;
  game.updateBoss(0);
  assert.equal(game.enemyBullets.length, 3);
});

test("defeating a boss preserves progress and unlocks the next level", () => {
  const { game, canvas, ui, audio } = createGame();
  game.score = 250;
  game.lives = 2;
  game.spawnBoss();
  game.boss.health = 1;

  game.damageBoss();

  assert.equal(game.score, 250 + LEVELS[0].boss.score);
  assert.equal(game.pendingNextLevel, true);
  assert.equal(game.running, false);
  assert.equal(ui.action.textContent, "Next level");
  assert.equal(audio.calls.some(([method, level]) => method === "bossDefeat" && level === 0), true);

  game.start();

  assert.equal(game.levelIndex, 1);
  assert.equal(game.score, 250 + LEVELS[0].boss.score);
  assert.equal(game.lives, 2);
  assert.match(canvas.style.backgroundImage, /level-2-background\.webp/);
});

test("boss movement picks irregular targets around the player", () => {
  const { game } = createGame();
  game.spawnBoss();
  game.player.x = 8;
  game.boss.update(0.5, game.canvas.width, game.player, () => 0.5);

  assert.equal(game.boss.direction, -1);
  assert.ok(game.boss.targetX < game.canvas.width / 2);
  assert.ok(game.boss.targetTimer > 0);
});

test("boss projectiles are aimed at players hiding at either edge", () => {
  [8, 720 - 46 - 8].forEach((playerX) => {
    const { game } = createGame();
    game.levelIndex = 1;
    game.loadLevel();
    game.spawnBoss();
    game.player.x = playerX;
    game.boss.fireTimer = 0;
    game.updateBoss(0);

    assert.ok(game.enemyBullets.length > 0);
    game.enemyBullets.forEach((bullet) => {
      const travelTime = (game.player.y + game.player.height / 2 - bullet.y) / bullet.speed;
      bullet.update(travelTime);
      assert.ok(bullet.x >= game.player.x && bullet.x <= game.player.x + game.player.width);
    });
  });
});

test("every boss has a distinct silhouette and audio identity", () => {
  assert.deepEqual(LEVELS.map((level) => level.boss.kind), ["sentinel", "twin-core", "harbinger"]);

  LEVELS.forEach((level, levelIndex) => {
    const { game, audio } = createGame();
    game.levelIndex = levelIndex;
    game.loadLevel();
    game.spawnBoss();
    const dimensions = [game.boss.width, game.boss.height];

    game.boss.health -= 1;
    game.damageBoss();

    const expectedSound = levelIndex === 2 ? ["harbingerHit", undefined] : ["bossHit", levelIndex];
    assert.deepEqual(audio.calls.at(-1), expectedSound);
    assert.equal(dimensions[0] > 100, true);
  });
});

test("the final boss awards boss points and the remaining-life bonus once", () => {
  const { game, ui, audio } = createGame();
  game.levelIndex = LEVELS.length - 1;
  game.score = 100;
  game.lives = 2;
  game.loadLevel();
  game.spawnBoss();
  game.boss.health = 1;

  game.damageBoss();

  const expectedScore = 100 + LEVELS.at(-1).boss.score + 2_000;
  assert.equal(game.score, expectedScore);
  assert.equal(game.ended, true);
  assert.equal(ui.title.textContent, "Galaxy saved");
  assert.equal(audio.calls.filter(([method]) => method === "campaignWin").length, 1);

  game.finish(true);
  assert.equal(game.score, expectedScore, "finish must be idempotent");
});

test("collision detection requires overlapping rectangles", () => {
  const { game } = createGame();
  const target = { x: 20, y: 20, width: 10, height: 10 };

  assert.equal(game.hit({ x: 25, y: 25, width: 2, height: 2 }, target), true);
  assert.equal(game.hit({ x: 30, y: 20, width: 2, height: 2 }, target), false);
});

test("a fatal hit cannot start a boss after game over", () => {
  const { game } = createGame();
  game.running = true;
  game.lives = 1;
  game.invaders = [];
  game.enemyBullets = [
    new Bullet(game.player.x, game.player.y, 0, true),
  ];

  game.update(0);

  assert.equal(game.ended, true);
  assert.equal(game.running, false);
  assert.equal(game.phase, "fleet");
  assert.equal(game.boss, null);
});

test("viewport synchronization no longer uses a delayed timeout", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  const viewportSection = source.slice(source.indexOf("const syncViewport"), source.indexOf("this.ui.action"));

  assert.match(viewportSection, /requestAnimationFrame\(syncViewport\)/);
  assert.match(viewportSection, /landscape !== previousLandscape \|\| \(previousWidth !== null && innerWidth !== previousWidth\)/);
  assert.doesNotMatch(viewportSection, /setTimeout/);
});
