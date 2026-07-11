const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { LEVELS, Bullet, Explosion, BossExplosion, Game } = require("../script.js");

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
    "preBossAppear",
    "preBossShoot",
    "preBossHit",
    "preBossDefeat",
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

test("the mobile arcade joystick switches both directions at full speed and springs to center", () => {
  const { game } = createGame();
  game.joystick = createElement();
  game.joystickThumb = createElement();
  const startX = game.player.x;

  game.setJoystickValue(-0.8);
  assert.equal(game.touchAxis, -1);
  assert.equal(game.joystickThumb.style.left, "18%");
  assert.equal(game.joystick.getAttribute("aria-valuetext"), "Left");
  game.updatePlayer(1 / 60);
  assert.equal(game.player.x, startX - game.player.speed, "binary input must use full player speed");

  game.setJoystickValue(0.75);
  assert.equal(game.touchAxis, 1);
  assert.equal(game.joystickThumb.style.left, "82%");
  assert.equal(game.joystick.getAttribute("aria-valuetext"), "Right");

  game.setJoystickValue(0.1);
  assert.equal(game.touchAxis, 0, "the center dead zone must switch movement off");

  game.resetJoystick();
  assert.equal(game.touchAxis, 0);
  assert.equal(game.joystickThumb.style.left, "50%");
  assert.equal(game.joystick.getAttribute("aria-valuetext"), "Centered");
});

test("mobile markup uses one horizontal joystick instead of two direction buttons", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /id="move-joystick" role="slider"/);
  assert.doesNotMatch(html, /data-control="(?:left|right)"/);
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

test("the final fleet unlocks a unique pre-boss before the Sovereign", () => {
  const { game, ui, audio } = createGame();
  game.levelIndex = LEVELS.length - 1;
  game.loadLevel();
  game.running = true;
  game.invaders = [];

  game.update(0);
  assert.equal(game.phase, "pre-boss");
  assert.equal(game.boss.kind, "harbinger");
  assert.match(ui.status.textContent, /Rift Harbinger/);
  assert.deepEqual(audio.calls.at(-1), ["preBossAppear", undefined]);

  game.boss.health = 1;
  game.damageBoss();
  assert.equal(game.phase, "boss-transition");
  assert.equal(game.preBossDefeated, true);
  assert.deepEqual(audio.calls.at(-1), ["preBossDefeat", undefined]);

  game.update(1.1);
  assert.equal(game.phase, "boss");
  assert.equal(game.boss.kind, "sovereign");
});

test("the pre-boss phase-shifts and alternates non-twin-core attacks", () => {
  const { game } = createGame();
  game.levelIndex = LEVELS.length - 1;
  game.loadLevel();
  game.spawnPreBoss();
  game.boss.dashTimer = 0;
  game.boss.fireTimer = 0;

  game.updateBoss(0.1);
  assert.equal(game.effects.length, 2, "phase shift should leave effects at departure and arrival");
  assert.equal(game.enemyBullets.length, 5, "first Harbinger pattern is a five-way fan");

  game.enemyBullets = [];
  game.boss.fireTimer = 0;
  game.updateBoss(0);
  assert.equal(game.enemyBullets.length, 3, "second Harbinger pattern is converging crossfire");
});

test("the final boss cycles through aimed, crossfire, and curtain attacks", () => {
  const { game } = createGame();
  game.levelIndex = LEVELS.length - 1;
  game.loadLevel();
  game.spawnBoss();

  [3, 3, 7].forEach((expectedCount) => {
    game.enemyBullets = [];
    game.boss.fireTimer = 0;
    game.updateBoss(0);
    assert.equal(game.enemyBullets.length, expectedCount);
  });
  assert.equal(game.boss.attackIndex, 3);
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
  assert.deepEqual(LEVELS.map((level) => level.boss.kind), ["sentinel", "twin-core", "sovereign"]);

  LEVELS.forEach((level, levelIndex) => {
    const { game, audio } = createGame();
    game.levelIndex = levelIndex;
    game.loadLevel();
    game.spawnBoss();
    const dimensions = [game.boss.width, game.boss.height];

    game.boss.health -= 1;
    game.damageBoss();

    assert.deepEqual(audio.calls.at(-1), ["bossHit", levelIndex]);
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
  assert.doesNotMatch(viewportSection, /setTimeout/);
});
