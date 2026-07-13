# Valutazione tecnica di Nebula Invaders

## Sintesi decisionale

Lo stack attuale è adatto al prodotto: il gioco è piccolo, bidimensionale, distribuibile come sito statico e non richiede un motore o un framework. Non conviene riscriverlo da zero. Conviene invece fare un refactoring incrementale di `script.js`, mantenendo Canvas 2D, Web Audio e la distribuzione statica.

La riscrittura avrebbe un costo alto e reintrodurrebbe rischi già risolti — collisioni, progressione, input touch, orientamento, audio e responsive design — senza un vantaggio proporzionato. Il problema tecnico principale non è lo stack, ma la concentrazione di configurazione, entità, input, audio, regole e rendering in un singolo file di oltre 1.600 righe.

## Stack e runtime

| Componente | Tecnologia | Ruolo | Valutazione |
| --- | --- | --- | --- |
| Documento | HTML5 | HUD, Canvas, overlay, controlli e semantica accessibile | Adeguato |
| Presentazione | CSS3 | Layout responsive, safe area, touch UI, fondali e stati | Adeguato |
| Logica | JavaScript ES6 | Campagna, entità, collisioni, input e loop | Adeguato, da modularizzare |
| Rendering | Canvas 2D | Navicella, alieni, boss, proiettili, UFO ed effetti | Adeguato per il carico attuale |
| Audio | Web Audio API | Effetti e musica sintetizzata con bus separati | Adeguato, leggero e senza licenze audio esterne |
| Input | Keyboard + Pointer Events | Tastiera, joystick touch, Pointer Capture | Adeguato |
| Feedback device | Vibration API | Sparo e danno sui dispositivi compatibili | Progressivo, con fallback implicito |
| Timing | `requestAnimationFrame` | Loop con delta time limitato | Adeguato |
| Asset | WebP + SVG | Tre fondali e favicon | Adeguato |
| Font | Google Fonts | Chakra Petch e Space Mono | Funzionale; valutare self-hosting per privacy/offline |
| Test | Node.js `node:test` | Test unitari e regressioni senza dipendenze | Adeguato, da dividere per area |
| Build/deploy | Nessuna build, GitHub Pages | Pubblicazione diretta della root | Ottimo per questo progetto |

Non esistono dipendenze runtime o una fase di compilazione. `package.json` usa soltanto `node --check` e il test runner integrato di Node per lo sviluppo.

## Struttura dei file

- `index.html`: shell applicativa, HUD, Canvas, pannelli, controlli desktop/touch e overlay orientamento.
- `style.css`: tema, layout adattivo, controlli touch, safe area e breakpoint.
- `script.js`: configurazione livelli, classi, bootstrap e intera logica del gioco.
- `assets/`: fondali WebP e favicon SVG.
- `test/game.test.js`: suite di configurazione, gameplay, input, rendering indiretto e regressioni.
- `README.md`: istruzioni utente, struttura e distribuzione.
- `DEVELOPMENT.md`: diario cronologico degli interventi.
- `MOBILE_INPUT_LOG.md`: diagnosi specifica delle prestazioni del joystick.

## Configurazione globale

- `LEVELS`: descrive nome, fondale, formazione, velocità, caduta, frequenza di fuoco e configurazioni boss/miniboss.
- `INVADER_COLORS`: palette delle quattro famiglie aliene.
- `RESPAWN_INVULNERABILITY`: durata della protezione dopo il respawn.
- `JOYSTICK_DEAD_ZONE` e `JOYSTICK_TRAVEL_RATIO`: comportamento del controllo touch.

## Classi e responsabilità

### `AudioEngine`

Gestisce l'`AudioContext`, il bus effetti e il bus musica. `tone()` genera gli effetti; `musicTone()`, `playMusicStep()`, `startMusic()` e `stopMusic()` compongono e controllano la base techno. I metodi `shoot()`, `hit()`, `enemyDefeat()`, `boss*()`, `harbinger*()`, `bonus()`, `campaignWin()` e `lose()` espongono cue di gameplay. `setEnabled()` disattiva insieme musica ed effetti.

### `Player`

Mantiene posizione, dimensioni e velocità della navicella. `draw()` costruisce la sagoma Canvas e applica il lampeggio durante l'invulnerabilità.

### `Invader`

Mantiene posizione, riga e collision box. `draw()` seleziona una delle quattro silhouette originali e la anima su due frame.

### `Bullet`

Rappresenta proiettili alleati e nemici. `update()` applica velocità verticale e orizzontale in funzione del delta time; `draw()` gestisce colore e glow.

### `Explosion` e `BossExplosion`

`Explosion` crea, aggiorna e disegna particelle con dipendenza casuale iniettabile. `BossExplosion` estende l'effetto con più particelle, anelli e flash.

### `Boss`

Riceve una configurazione e gestisce dimensioni, salute, movimento, bersagli e timer di fuoco. `update()` contiene il movimento comune; `updateHarbinger()` il phase shift. `draw()` delega a `drawSentinel()`, `drawTwinCore()`, `drawSovereign()` o `drawHarbinger()`.

### `Game`

È l'orchestratore principale e oggi ha troppe responsabilità:

- inizializzazione UI, preload e stato campagna: `findUi()`, `preloadBackgrounds()`, `resetCampaign()`, `loadLevel()`, `createInvaders()`;
- input: `setupControls()`, metodi joystick, tastiera, orientamento e pausa;
- ciclo: `start()`, `update()`, `draw()`, `loop()`;
- sistemi di gioco: aggiornamento player, proiettili, flotta, boss, effetti e UFO;
- combattimento: `fireBossPattern()`, `collisions()`, `damageBoss()`, `hit()`;
- progressione/UI: spawn degli incontri, `completeLevel()`, `finish()`, `updateHud()`;
- rendering accessorio: barra boss e UFO.

### `bootstrap()`

Crea `Game`, avvia il loop e collega il toggle audio. Viene eseguito solo nel browser; in Node le classi sono esportate per i test.

## Flusso principale

1. `bootstrap()` crea il gioco e avvia `requestAnimationFrame`.
2. `resetCampaign()` e `loadLevel()` preparano flotta, player e timer.
3. `start()` sblocca Web Audio e avvia la musica dopo il gesto utente.
4. `update()` aggiorna entità e collisioni in base alla fase `fleet`, `pre-boss`, `boss-transition` o `boss`.
5. La flotta eliminata genera l'incontro configurato; la sconfitta del boss completa il livello o la campagna.
6. `draw()` ricostruisce ogni frame sul Canvas; il fondale resta in CSS per evitare uno scaling Canvas aggiuntivo.

## Debito tecnico e rischi

1. `Game` è un oggetto monolitico: una modifica locale può influire su input, UI o progressione.
2. Stato e stringhe di fase sono distribuiti; errori ortografici non sono rilevati staticamente.
3. Audio, timer reali e rendering Canvas hanno soprattutto test indiretti; manca un test browser automatizzato stabile.
4. La suite è in un unico file e rende meno immediata la proprietà delle regressioni.
5. I valori di bilanciamento sono configurabili, ma alcuni pattern di fuoco restano codificati in `fireBossPattern()`.
6. Le font remote sono l'unica dipendenza di rete e possono peggiorare privacy, offline e stabilità visiva.
7. Prima della pubblicazione vanno definiti licenza del repository, provenienza/licenza degli asset e una policy minima per privacy e telemetria; al momento non esiste telemetria.

## Refactoring consigliato

Procedere per passi piccoli, mantenendo il gioco sempre eseguibile:

1. Estrarre `config/levels.js`, palette e costanti senza cambiare il comportamento.
2. Estrarre le entità in `entities/` (`Player`, `Invader`, `Bullet`, effetti e `Boss`).
3. Spostare `AudioEngine` in `systems/audio-engine.js` e rendere iniettabili scheduler/timer per test deterministici.
4. Separare input e responsive lifecycle in `systems/input-controller.js`.
5. Estrarre collisioni, pattern boss e progressione in moduli puri, guidati da configurazione.
6. Ridurre `Game` a coordinatore di stato e sequenza; mantenere il bootstrap in `main.js`.
7. Dividere i test in configurazione, entità, combattimento, progressione, audio e input.
8. Aggiungere un piccolo smoke test browser per avvio, Canvas, audio toggle e cambio livello.

L'introduzione di moduli ES nativi non richiede bundler, ma impone di servire il progetto via HTTP durante lo sviluppo. Se si vuole continuare a supportare l'apertura diretta di `index.html`, si può prima separare il file in classi interne o aggiungere in seguito un bundler minimale.

## Quando avrebbe senso cambiare stack

Valutare un motore o un framework solo se la roadmap richiede molte scene, editor di livelli, sprite sheet complessi, fisica, salvataggi cloud, multiplayer, packaging mobile nativo o contributi simultanei di più team. In quel caso Phaser sarebbe più vicino al modello 2D attuale di un framework UI; una migrazione dovrebbe comunque riusare regole, configurazioni e test estratti prima.

Per la roadmap visibile oggi, la decisione raccomandata è: **mantenere lo stack, refactoring incrementale, nessuna riscrittura**.

## Criteri di uscita del refactoring

- `Game` coordina ma non implementa direttamente audio, input e collisioni.
- Ogni modulo ha una responsabilità e una suite dedicata.
- Il bilanciamento di livelli e boss è modificabile dai dati, senza cambiare i pattern di controllo.
- `npm run check`, `npm test` e lo smoke test browser restano verdi.
- Prestazioni e sensazione dell'input mobile non peggiorano rispetto alla baseline documentata.
