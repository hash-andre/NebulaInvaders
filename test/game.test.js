const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { LEVELS, Bullet, Game } = require("../script.js");

function createClassList() {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    contains: (value) => values.has(value),
  };
}

function createElement() {
  return {
    textContent: "",
    classList: createClassList(),
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
    "bonus",
    "win",
    "lose",
    "bossAppear",
    "bossShoot",
    "bossHit",
    "bossDefeat",
  ].forEach((method) => {
    audio[method] = (levelIndex) => calls.push([method, levelIndex]);
  });

  return audio;
}

function createGame() {
  const canvas = {
    width: 720,
    height: 480,
    style: {},
    focus() {},
    getContext: () => ({}),
  };
  const ui = createUi();
  const audio = createAudio();
  const game = new Game(canvas, {
    ui,
    audio,
    bindControls: false,
    random: () => 0.5,
  });

  return { game, canvas, ui, audio };
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
  assert.equal(audio.calls.filter(([method]) => method === "win").length, 1);

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
