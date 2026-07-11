# Nebula Invaders

Nebula Invaders is a dependency-free browser arcade game inspired by *Space Invaders*. It includes a three-level campaign, a different boss and background for each sector, keyboard and touch controls, synthesized audio, and a responsive interface.

## Play

Open `index.html` in a modern browser and select **Start mission**.

- Use `←` and `→` to move.
- Press `Space` to fire.
- Press `Esc` or use the pause button to pause and resume.
- Press `Enter` to start an unlocked next level.
- On phones and tablets, use the on-screen movement and fire controls.
- Destroy the fleet before it reaches the player.
- Avoid enemy projectiles; the campaign starts with three lives.
- Hit the golden UFO for 500 bonus points.
- Defeat the boss at the end of each level to unlock the next sector.

Score and remaining lives carry over between levels. Completing the campaign awards 1,000 points for every remaining life.

## Campaign

| Level | Sector | Boss | Character |
| --- | --- | --- | --- |
| 1 | Outer Patrol | Orbital Sentinel | Ring-shaped guardian with a descending laser cue |
| 2 | Meteor Foundry | Twin Core | Dual-reactor silhouette, twin projectiles, and layered audio |
| 3 | Nebula Throne | Void Sovereign | Winged final boss with heavy, dissonant sound design |

Every level uses its own generated, preloaded WebP space background. The backgrounds keep the center of the playfield dark enough for bullets, enemies, and the player ship to remain readable.

## Features

- Three-level campaign with persistent score and lives.
- Three visually distinct bosses with custom entrance, firing, hit, and destruction sounds.
- Animated invader fleets with progressively harder formations.
- Enemy projectiles, collision handling, and increasing fleet speed.
- Haptic feedback for firing and player damage on compatible mobile devices.
- Particle explosions and dedicated audio feedback when invaders are destroyed.
- Golden UFO bonus encounters.
- Victory bonus based on remaining lives.
- Web Audio sound effects with an audio toggle.
- A focused dark arcade interface.
- Responsive canvas and HUD for small phones, tablets, desktops, and large displays.
- Automatic pause and portrait-orientation warning on mobile landscape rotation.
- Touch controls built with Pointer Events and safe-area support.
- Keyboard hints with vertically centered `<kbd>` content.
- Start, level transition, victory, game-over, and campaign restart screens.
- A unique victory fanfare after completing the full campaign.

## Run locally

The project has no runtime dependencies or build step. You can open `index.html` directly, or serve the directory through a local static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Test

Node.js is only required for development checks:

```bash
npm run check
npm test
```

The tests use Node's built-in test runner, so `npm install` is not required.

## Project structure

```text
.
├── assets/
│   ├── favicon.svg
│   ├── level-1-background.webp
│   ├── level-2-background.webp
│   └── level-3-background.webp
├── test/
│   └── game.test.js
├── DEVELOPMENT.md
├── index.html
├── package.json
├── README.md
├── script.js
└── style.css
```

## Technology

- HTML5 for semantic structure and accessible controls.
- CSS3 for responsive layout, safe areas, and touch feedback.
- JavaScript for campaign state, entities, input, collision detection, and the game loop.
- Canvas 2D for rendering gameplay.
- Web Audio API for generated sound effects.
- Google Fonts for Chakra Petch and Space Mono.
- OpenAI Image Generation for the three campaign backgrounds.

## Browser support

Use a current browser with Canvas, Web Audio, Pointer Events, and modern JavaScript support. Audio starts after the first user interaction, as required by browser autoplay policies.

## GitHub Pages

This is a static site and can be deployed directly from the repository root. In the repository settings, choose **Deploy from a branch**, select `main`, and use `/ (root)` as the folder. See `DEVELOPMENT.md` for the deployment checklist and troubleshooting notes.

## License

No license has been declared yet.
