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
- pulsanti per avvio/ripresa, pausa e audio.

### `style.css`

Gestisce:

- layout centrato e responsive;
- aspetto arcade dell'interfaccia;
- identità visiva arcade scura;
- adattamento dei controlli agli schermi piccoli;
- sfondo del Canvas e stati visivi dei pulsanti.

### `script.js`

Contiene le seguenti classi:

- `AudioEngine`: crea effetti sonori con oscillatori Web Audio.
- `Player`: rappresenta e disegna la navicella.
- `Invader`: rappresenta e anima un alieno.
- `Bullet`: gestisce proiettili del giocatore e degli alieni.
- `Explosion` e `BossExplosion`: gestiscono gli impatti particellari e la distruzione finale dei boss.
- `Game`: coordina stato, input, collisioni, punteggio, vite, UFO e rendering.

Il gioco usa `requestAnimationFrame` per il ciclo principale. Gli aggiornamenti dipendono dal delta temporale, così movimento e velocità non sono legati al refresh rate dello schermo.

## Tecnologie e motivazioni

| Tecnologia | Utilizzo | Motivo |
| --- | --- | --- |
| HTML5 | Struttura e controlli | Semantica e accessibilità native |
| CSS3 | Layout e responsive design | Nessuna dipendenza e caricamento leggero |
| JavaScript ES6 | Logica a oggetti | Supporto browser ampio e codice organizzato |
| Canvas 2D | Rendering del gioco | Adatto a sprite semplici e animazioni continue |
| Web Audio API | Effetti sonori sintetizzati | Evita asset audio e richieste di rete aggiuntive |
| Image Generation | Sfondo spaziale | Asset visivo originale creato per il gioco |

## Modifiche effettuate

### Bilanciamento finale, identità visiva, respawn e musica

- Rafforzata la fanfara di completamento con salita melodica, basso ascendente e accordo finale maggiore sostenuto; la base si interrompe per lasciare spazio alla risoluzione senza alzare il volume globale.
- Ridotta la flotta del livello 3 da 4×10 a 4×9 unità, come il livello 2, mantenendo un incremento moderato della velocità iniziale da 31 a 35.
- Scambiati gli incontri conclusivi: il Void Sovereign è ora il miniboss con 10 HP e cortina ridotta a cinque colpi; il Rift Harbinger è il boss finale con 12 HP, teletrasporto e cadenza leggermente rallentati.
- Conservata l'identità audio dei due avversari in base al loro tipo e non al ruolo temporaneo di boss/miniboss.
- Aggiunti due secondi di invulnerabilità dopo un colpo non fatale; la navicella lampeggia e i proiettili a contatto vengono consumati senza sottrarre altre vite.
- Sostituita la sagoma pixelata comune degli alieni con quattro droni Canvas originali: manta orbitale, scheggia alata, medusa energetica e nucleo cristallino.
- Aggiunta una sequenza techno spaziale sintetizzata a 240 ms per step, con tre scale di livello e bus Web Audio dedicato al 22% del bus effetti; il toggle controlla musica ed effetti insieme.
- Aggiornati test di regressione, README, cache busting degli asset e documento [`TECHNICAL_ASSESSMENT.md`](TECHNICAL_ASSESSMENT.md).
- Verifica completata con `npm run check`, 33 test automatici, `git diff --check` e server HTTP locale: pagina, script versionato e fondale del livello 3 rispondono correttamente. La resa percettiva di musica e animazioni resta nella checklist manuale su browser/device reale.

### Stabilità input mobile e pomello arcade binario

- Individuata nel vecchio `pointermove` una sequenza ripetuta di lettura layout e scrittura di `left`/ARIA che poteva contendere il main thread al Canvas.
- Ripristinati i tre stati netti sinistra/neutro/destra e il pomello circolare compatto, con geometria misurata una volta per gesto e feedback visuale coalesciuto su `requestAnimationFrame` tramite `transform`.
- Eliminati anche i frame DOM ridondanti finché il gesto resta nella stessa direzione; focus accessibile, supporto tastiera e istruzione per screen reader restano disponibili.
- Evitato che i resize verticali della toolbar mobile interrompano una pressione; orientamento e variazioni reali di larghezza continuano a ripulire l'input.
- Estesa la suite con stress da 240 campioni touch, lifecycle Pointer Events, deduplicazione DOM/ARIA e rollover da tastiera.
- Diagnosi, misure prima/dopo, risultati e checklist device sono nel file [`MOBILE_INPUT_LOG.md`](MOBILE_INPUT_LOG.md).

### Joystick arcade binario

- Compattato il controllo orizzontale mobile e ridisegnato il cursore come pomello circolare da cabinato.
- Sostituito il movimento proporzionale con tre stati netti: sinistra a velocità piena, neutro e destra a velocità piena.
- Conservati trascinamento continuo tra le direzioni, zona morta centrale e ritorno automatico al rilascio.

### Joystick orizzontale touch

- Sostituiti i due pulsanti direzionali mobile con uno slider a ritorno automatico, trascinabile da sinistra a destra senza sollevare il dito.
- Aggiunti movimento proporzionale, zona morta centrale, Pointer Capture e reset su rilascio, pausa, perdita del focus e rotazione.
- Conservati pulsante Fire, comandi da tastiera e semantica accessibile tramite `role="slider"` e valori ARIA aggiornati.

### Protezione touch e sequenza finale estesa

- Disabilitati selezione del testo e callout da pressione prolungata nell'interfaccia tramite `user-select`, prefisso WebKit e `-webkit-touch-callout`.
- Inserito il pre-boss Rift Harbinger dopo la flotta del livello 3, con salute e punteggio dedicati, transizione prima del boss finale e identità Canvas/Web Audio propria.
- Il Rift Harbinger alterna teletrasporti con tracce particellari, inseguimento sinusoidale, raffiche a ventaglio e fuoco incrociato convergente.
- Il Void Sovereign ora combina inseguimento verticale, cambi di obiettivo più rapidi e tre pattern: triplo mirato, fuoco incrociato e cortina a sette proiettili.
- Estesa la suite per coprire progressione pre-boss, phase shift e rotazione degli attacchi finali.

### Distribuzione uniforme HUD mobile

- Portato l'HUD mobile a tre colonne della stessa larghezza per distribuire score, stato della missione e vite come nella versione desktop.
- Mantenuti gli allineamenti sinistra, centro e destra, riducendo gli spazi interni e impedendo ai contenuti di andare a capo.

### Qualità fondali senza costo nel game loop

- Rigenerati i tre fondali WebP dagli originali PNG a qualità 94, mantenendo la risoluzione 1080×720 e un peso complessivo contenuto.
- Spostato il rendering visivo dei fondali dal buffer Canvas 720×480 al layer CSS, evitando l'ingrandimento del bitmap logico sugli schermi desktop.
- Eliminata la chiamata `drawImage()` eseguita a ogni frame; il precaching resta attivo, quindi il miglioramento visivo non aggiunge lavoro al game loop.
- Impostati centratura, `cover` e assenza di ripetizione per preservare la composizione su ogni formato.

### Overlay di rotazione e spaziatura mobile

- Sostituito l'alert nativo con un overlay accessibile gestito dalla pagina, così può chiudersi automaticamente al ritorno in portrait.
- Durante il landscape mobile viene nascosta l'intera interfaccia di gioco, lasciando visibili soltanto lo sfondo del sito e il messaggio di orientamento.
- La partita viene messa in pausa prima di mostrare l'overlay e non può riprendere finché il dispositivo resta in landscape.
- Aumentata ulteriormente la distanza tra intestazione e Canvas su desktop e mobile.

### Orientamento mobile, HUD compatto e favicon

- Rilevata la rotazione landscape sui dispositivi a puntatore coarse: una partita attiva viene messa in pausa e un alert chiede di tornare in verticale.
- Evitati alert ripetuti durante i resize della stessa rotazione; una nuova segnalazione è consentita soltanto dopo il ritorno in portrait.
- Aumentati margine superiore mobile e distanza tra intestazione e card per centrare meglio la composizione nello schermo.
- Compresso l'HUD mobile in tre colonne, mantenendo score, stato e vite sulla stessa riga con testi adattivi e troncamento dello stato più lungo.
- Aggiunta una favicon SVG originale e il colore tema per l'interfaccia del browser.

### Feedback aptico, esplosioni e fanfara finale

- Integrata la Vibration API con impulso breve allo sparo e sequenza più intensa quando il giocatore subisce danni; sui dispositivi non compatibili il comportamento degrada senza errori.
- Aggiunto un sistema di particelle Canvas per animare la distruzione degli invasori, con colore coerente alla loro fila e rimozione automatica a fine effetto.
- Creato un effetto sonoro dedicato alla distruzione degli invasori e separato dal suono di danno del giocatore.
- Introdotta una fanfara specifica, ritardata rispetto all'esplosione del boss finale, per rendere riconoscibile il completamento dell'intera campagna.
- Aggiunti test automatici per vibrazione, particelle, relativo ciclo di vita e identità dei nuovi feedback sonori.

### Pausa, collisioni estese e interfaccia inglese

- Estese le animazioni di collisione alla navicella, all'UFO bonus e ai colpi sul boss; la distruzione completa del boss usa un effetto dedicato con più particelle, onde concentriche e flash centrale.
- Aggiunta la pausa tramite pulsante condiviso da desktop e mobile; su desktop `Esc` alterna pausa/ripresa ed `Enter` avvia il livello successivo.
- Tradotti in inglese metadati, testi, suggerimenti ed etichette accessibili dell'interfaccia.
- Rimossi tema chiaro, relativo toggle e codice JavaScript/CSS associato per mantenere un'identità arcade unicamente scura.
- Ridimensionata la card in base all'altezza disponibile sui dispositivi touch in landscape, con un massimo di 480 px e un minimo utilizzabile di 320 px.
- Rimossi i vecchi fondali PNG non più referenziati; il gioco conserva soltanto le versioni WebP precaricate.

### Precaricamento fondali, boss adattivi e rotazione touch

- Convertiti i fondali dei livelli in WebP 1080×720 e precaricati tutti all'avvio, riutilizzando la stessa immagine decodificata durante i cambi di settore.
- Reso il movimento dei boss meno ciclico con obiettivi e velocità a durata casuale, scelti attorno alla posizione corrente del giocatore.
- Trasformati gli spari dei boss in proiettili bidimensionali mirati al centro della navicella, eliminando le zone sicure lungo i bordi laterali.
- Conservato lo scorrimento verticale su telefoni e tablet in orizzontale e introdotta una composizione landscape compatta che mantiene visibili intestazione, gioco, controlli e suggerimento.
- Estesa la suite automatica per movimento orizzontale dei proiettili, inseguimento del boss e copertura di entrambi i bordi.

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

### Identità visiva e sonora dei boss

- Sostituita la sagoma condivisa con tre design Canvas dedicati: il Sentinel ad anello, il Twin Core a doppio reattore e il Sovereign con silhouette alata e nucleo romboidale.
- Assegnate dimensioni e collision box diverse a ogni boss, oltre a pulsazioni luminose animate e una barra HP etichettata `LEVEL BOSS`.
- Aggiunti cue Web Audio specifici per entrata, sparo, danno e distruzione; frequenze, forme d'onda, intervalli e stratificazione cambiano per ogni livello.
- Sostituito il suono di sparo alieno generico durante le boss fight e aggiunti test sull'identità, sull'ingresso e sulla sconfitta dei boss.

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
