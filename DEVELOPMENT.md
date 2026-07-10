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

## Verifiche

- Sintassi di `script.js` controllata con `node --check`.
- Il progetto non richiede una fase di build.
- La verifica finale dell'aspetto e dell'audio va effettuata in un browser moderno.

## Regola per i prossimi aggiornamenti

Ogni modifica futura dovrebbe aggiungere una voce alla sezione **Modifiche effettuate**, specificando:

1. cosa è cambiato;
2. quali file sono stati interessati;
3. quali tecnologie o API sono state usate;
4. come è stata verificata la modifica.
