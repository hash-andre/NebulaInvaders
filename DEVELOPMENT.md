# Diario tecnico

Questo documento descrive cosa viene modificato nel progetto, perché e con quali tecnologie. Verrà aggiornato insieme ai prossimi interventi sul codice.

## Stato attuale

Nebula Invaders è un gioco browser senza dipendenze JavaScript esterne. La pagina contiene una singola area di gioco Canvas, un HUD HTML e alcuni controlli accessibili.

## Architettura

### `index.html`

Definisce:

- intestazione e presentazione del gioco;
- HUD per punteggio, vite e stato della missione;
- elemento `<canvas>`;
- pannello iniziale e pannello di fine partita;
- pulsanti per retry, audio e tema.

### `style.css`

Gestisce:

- layout centrato e responsive;
- aspetto arcade dell'interfaccia;
- temi chiaro e scuro tramite l'attributo `data-theme`;
- adattamento dei controlli agli schermi piccoli;
- sfondo del Canvas e stati visivi dei pulsanti.

### `script.js`

Contiene le seguenti classi:

- `AudioEngine`: crea effetti sonori con oscillatori Web Audio.
- `Player`: rappresenta e disegna la navicella.
- `Invader`: rappresenta e anima un alieno.
- `Bullet`: gestisce proiettili del giocatore e degli alieni.
- `Game`: coordina stato, input, collisioni, punteggio, vite, UFO e rendering.

Il gioco usa `requestAnimationFrame` per il ciclo principale. Gli aggiornamenti dipendono dal delta temporale, così movimento e velocità non sono legati al refresh rate dello schermo.

## Tecnologie e motivazioni

| Tecnologia | Utilizzo | Motivo |
| --- | --- | --- |
| HTML5 | Struttura e controlli | Semantica e accessibilità native |
| CSS3 | Layout, temi e responsive design | Nessuna dipendenza e caricamento leggero |
| JavaScript ES6 | Logica a oggetti | Supporto browser ampio e codice organizzato |
| Canvas 2D | Rendering del gioco | Adatto a sprite semplici e animazioni continue |
| Web Audio API | Effetti sonori sintetizzati | Evita asset audio e richieste di rete aggiuntive |
| Image Generation | Sfondo spaziale | Asset visivo originale creato per il gioco |

## Modifiche effettuate

### Versione iniziale estesa

- Ridisegnata l'interfaccia e centrato il gioco nella pagina.
- Aggiunto un tema chiaro/scuro con toggle in alto a destra.
- Sostituiti i rettangoli originali con skin Canvas più elaborate.
- Aggiunto uno sfondo spaziale generato e salvato localmente.
- Aggiunti suoni per movimento alieni, spari, impatti, bonus, vittoria e sconfitta.
- Implementati vite, proiettili alieni e invulnerabilità ottenuta riposizionando la navicella dopo un colpo.
- Implementato l'UFO dorato da 500 punti.
- Aggiunti HUD, schermate di stato e pulsante retry.
- Aggiunto il controllo audio.

### Documentazione

- Creato `README.md` per installazione, uso e panoramica.
- Creato questo diario tecnico per rendere trasparenti le scelte implementative.

### Correzione collisioni e bilanciamento proiettili

- Corretto `Bullet.update()` in `script.js`: ora lo spostamento usa il delta temporale del game loop.
- Risolto il salto di collisione che impediva ai proiettili del giocatore e degli alieni di colpire i bersagli.
- Ridotta la velocità iniziale della flotta e resa più graduale la sua accelerazione.
- Ridotta la velocità dei proiettili e la frequenza di fuoco degli alieni per migliorare la leggibilità del gioco.
- Verifica effettuata controllando la sintassi JavaScript con `node --check`.

### Bonus vite e layout senza scroll

- Aggiunto in `script.js` un bonus vittoria di 1.000 punti per ogni vita rimasta.
- Il bonus viene sommato al punteggio e mostrato nel riepilogo finale.
- Reso il layout desktop adattivo anche rispetto all'altezza disponibile tramite `100dvh`, `clamp()` e dimensionamento del contenitore basato sulle proporzioni del Canvas.
- Disabilitato lo scroll verticale nella versione desktop; sui piccoli schermi resta disponibile come fallback per non tagliare i controlli.
- Rimosse le emoji dal toggle del tema, sostituite con un indicatore CSS neutro e un'etichetta testuale.

### Responsive mobile e controlli touch

- Mantenuta la risoluzione logica del Canvas a 720×480 e scalata solo la sua presentazione CSS, preservando coordinate, collisioni e bilanciamento.
- Aggiunti controlli touch accessibili con Pointer Events: movimento continuo a sinistra/destra e pulsante di fuoco, utilizzabili contemporaneamente.
- Introdotti target touch ampi, `touch-action`, feedback di pressione, gestione dell'interruzione del puntatore e reset degli input alla perdita del focus.
- Adattati HUD, pannello iniziale, tipografia e spaziature per telefoni in verticale e in orizzontale, incluse le safe area dei dispositivi con notch.
- Conservati i comandi da tastiera e il layout desktop esistenti.

### Cache degli asset su GitHub Pages

- Aggiunta una versione agli URL di `style.css` e `script.js` in `index.html` per impedire che il deploy combini il nuovo markup con asset precedenti conservati nella cache del browser o della CDN.

### Barra comandi desktop e rotazione mobile

- Impedita la compressione verticale della card nel layout flex e aggiornato il calcolo della larghezza desktop per riservare spazio a HUD, barra comandi, intestazione e suggerimento.
- Gestita la rotazione mobile usando l'altezza effettiva di `VisualViewport`, con un secondo aggiornamento ritardato per i browser che assestano le dimensioni dopo `orientationchange`.
- Azzerati movimento e stato visivo dei controlli touch durante rotazione, ridimensionamento e perdita del focus, evitando input bloccati.
- Estesi i controlli mobile ai dispositivi touch fino a 1.024 px e aggiornata la versione degli asset per GitHub Pages.

### Responsive esteso e allineamento controlli

- Centrato verticalmente il contenuto dei tag `<kbd>` con `inline-flex`, altezza esplicita e `line-height: 1`, evitando differenze di baseline tra browser e font caricati.
- Applicata una correzione ottica di un pixel alle frecce dei controlli touch, che su alcuni telefoni apparivano leggermente più in basso rispetto al centro del pulsante.
- Aggiunti breakpoint per telefoni stretti o bassi e per display desktop superiori a 1.400 px, mantenendo il rapporto 3:2 del Canvas.
- Sostituito il secondo aggiornamento ritardato del viewport con un aggiornamento al frame successivo tramite `requestAnimationFrame`: non è più presente un timeout di throttling/debounce durante resize e rotazione.

### Campagna, livelli e boss

- Riorganizzato `script.js` in metodi brevi e leggibili, separando aggiornamento del giocatore, flotta, boss, UFO, proiettili, collisioni e rendering.
- Introdotta la configurazione `LEVELS`, che descrive formazione, velocità, caduta, frequenza di fuoco, fondale e boss di ogni settore.
- Aggiunti tre livelli con punteggio e vite persistenti, schermata di transizione e riavvio completo dopo vittoria o sconfitta.
- Aggiunta la classe `Boss` con salute, barra HP, movimento orizzontale, schemi di fuoco crescenti e ricompense dedicate.
- Mantenuto l'UFO bonus durante le fasi flotta; la vittoria della campagna assegna il bonus vite una sola volta.

### Fondali per livello

- Generati tre fondali 3:2 distinti e salvati in `assets/level-1-background.png`, `assets/level-2-background.png` e `assets/level-3-background.png`.
- Ogni configurazione di livello indica il proprio asset; `loadLevel()` aggiorna sia l'immagine disegnata nel Canvas sia il fallback CSS.
- Le composizioni lasciano il centro del campo relativamente scuro per preservare il contrasto di sprite e proiettili.

### Test automatici

- Aggiunto `package.json` senza dipendenze esterne e configurati `npm run check` e `npm test`.
- Aggiunti test con `node:test` per configurazione dei livelli, esistenza e unicità dei fondali, inizializzazione HUD, movimento dei proiettili, collisioni, comparsa dei boss, avanzamento e vittoria finale.
- Resa `Game` testabile tramite injection opzionale di UI, audio, generatore casuale e binding dei controlli, senza cambiare il bootstrap usato dal browser.

## Deployment GitHub Pages

Il progetto non richiede build: GitHub Pages deve pubblicare direttamente i file presenti nella root del branch `main`.

### Configurazione prevista

1. Aprire **Settings → Pages** nel repository GitHub.
2. In **Build and deployment**, selezionare **Deploy from a branch**.
3. Selezionare il branch `main`, la cartella `/ (root)` e salvare.
4. Attendere che il deployment Pages termini prima di verificare il sito; un push concluso non implica che la CDN sia già aggiornata.

### Checklist prima del push

```bash
npm run check
npm test
git status --short
```

- `index.html`, `style.css`, `script.js` e tutti gli asset referenziati devono essere tracciati da Git.
- I percorsi devono mantenere esattamente maiuscole e minuscole: GitHub Pages usa un filesystem case-sensitive.
- Gli URL degli asset devono restare relativi, così funzionano sotto il prefisso `/NebulaInvaders/`.
- Il parametro di versione di `style.css` e `script.js` in `index.html` va aggiornato quando cambia uno dei due file, per evitare combinazioni di markup nuovo e cache vecchia.

### Diagnosi dei problemi comuni

| Sintomo | Controllo | Soluzione |
| --- | --- | --- |
| Il sito restituisce 404 | Source e cartella Pages | Impostare `main` e `/ (root)` |
| Si vede ancora il codice precedente | Cache browser/CDN | Attendere il deploy, fare hard refresh e verificare il parametro `?v=` |
| Mancano fondali o CSS | Percorso o maiuscole | Confrontare l'URL nella console Network con il nome tracciato da Git |
| Il gioco parte in locale ma non online | Errori JavaScript | Aprire DevTools Console e controllare il primo errore, non quelli conseguenti |
| Il push è riuscito ma la pagina non cambia | Deployment ancora in corso o fallito | Controllare la sezione **Actions** e lo stato mostrato in **Settings → Pages** |

Per distinguere un problema di codice da uno di pubblicazione, servire localmente lo stesso commit con `python3 -m http.server 8000`. Se il commit funziona in locale ma non sull'URL Pages, controllare prima configurazione, log del deployment e cache.

## Verifiche

- Sintassi di `script.js` controllata con `npm run check` (`node --check`).
- Suite automatica eseguita con `npm test`.
- Il progetto non richiede una fase di build.
- La verifica finale dell'aspetto e dell'audio va effettuata in un browser moderno.

## Regola per i prossimi aggiornamenti

Ogni modifica futura dovrebbe aggiungere una voce alla sezione **Modifiche effettuate**, specificando:

1. cosa è cambiato;
2. quali file sono stati interessati;
3. quali tecnologie o API sono state usate;
4. come è stata verificata la modifica.
