# Log stabilità input mobile

Data: 12 luglio 2026  
Ambito: stuttering durante l'uso touch e redesign del controllo orizzontale.

## Obiettivo

Individuare il lavoro aggiunto dal joystick sul main thread, correggere la regressione di responsività del controllo binario e verificare il risultato senza modificare il bilanciamento del gioco o i comandi desktop.

## Registro attività

### 1. Baseline

- Verificato il working tree prima dell'intervento: nessuna modifica locale preesistente.
- Eseguiti `npm run check` e la suite esistente: sintassi valida e 26/26 test superati.
- Isolato il percorso caldo `pointerdown` / `pointermove` / `pointerup` del joystick.
- Controllato separatamente il game loop Canvas per non attribuire automaticamente ogni costo al nuovo input.

### 2. Riproduzione del problema

Stress sintetico sulla versione iniziale del controllo: un `pointerdown` seguito da 240 `pointermove` produceva:

- 241 chiamate a `getBoundingClientRect()`;
- 241 scritture di `style.left`;
- 482 scritture degli attributi ARIA.

La lettura del layout era seguita da una scrittura di `left` a ogni campione touch, anche quando la direzione binaria non cambiava. Su dispositivi che inviano eventi touch più rapidamente del refresh dello schermo, questa sequenza può forzare layout e paint ridondanti in concorrenza con il Canvas.

Il secondo problema era funzionale: superata una zona morta centrale molto corta, `Math.sign()` portava immediatamente l'asse da `0` a `-1` o `1`. Il pomello saltava quindi dal centro al lato e la nave passava da ferma a velocità massima senza valori intermedi.

### 3. Correzione della pipeline input

- Ripristinato un asse analogico continuo con zona morta del 12%, rimappata in modo che l'uscita resti continua fino alla velocità massima.
- La posizione del dito aggiorna subito il valore usato dal gioco; non attende il rendering dell'interfaccia.
- La geometria del controllo viene letta una sola volta al `pointerdown` e riutilizzata per tutto il gesto.
- Gli aggiornamenti visuali sono coalesciuti: al massimo un render DOM per `requestAnimationFrame`, sempre con l'ultimo campione disponibile.
- Il pomello ora usa `transform: translate3d(...)` e `will-change: transform`; non viene più animata la proprietà `left`.
- Gli attributi ARIA vengono riscritti soltanto quando cambia il valore annunciato.
- Centralizzato il cleanup per `pointerup`, `pointercancel`, perdita della capture, blur, cambio pagina e pausa.
- Un resize dovuto soltanto alla toolbar verticale del browser non interrompe più il gesto. Cambio orientamento o larghezza reale continuano invece a resettare l'input e la geometria.

### 4. Redesign del controllo

- Allargata la corsa orizzontale per consentire regolazioni fini su telefoni stretti.
- Sostituito l'aspetto da interruttore on/off con un flight control analogico: guida luminosa, zona neutra leggibile, impugnatura rettangolare e indicatore direzionale.
- Ridotte le ombre del pomello per evitare clipping e paint inutilmente ampio vicino ai bordi.
- Aggiunti focus visibile, controllo con frecce/Home/End, descrizione per screen reader e rispetto di `prefers-reduced-motion`.
- Conservati Pointer Capture, ritorno automatico al centro e uso simultaneo di movimento e Fire con due dita.

### 5. Test di regressione

La suite ora copre anche il wiring reale dei listener del joystick. Sullo stesso burst di 240 campioni verifica:

- 1 sola lettura geometrica per gesto;
- 0 scritture di stile dentro gli handler `pointermove`;
- 1 solo aggiornamento visuale nel frame, usando l'ultimo campione;
- deduplicazione delle scritture ARIA nei frame successivi;
- pointer estranei ignorati;
- reset idempotente su release, cancel e perdita capture;
- nessuna posizione obsoleta se il gesto termina prima del frame pendente;
- corretta sovrapposizione dei tasti direzionali accessibili.

Risultati finali:

- `npm run check`: superato;
- `node --test --test-isolation=none test/game.test.js`: 28/28 test superati;
- `npm test`: superato;
- `git diff --check`: superato.

### 6. Verifica browser del layout

Controllo eseguito con WebKit 2.52.4 su viewport mobile. Il driver impone una larghezza minima effettiva di 341 px, quindi sono stati misurati 341, 360 e 390 px:

| Viewport effettivo | Joystick | Fire | Spazio tra i controlli | Overflow orizzontale |
| --- | ---: | ---: | ---: | ---: |
| 341 px | 177,3 × 54 px | 68 × 54 px | 59,7 px | 0 px |
| 360 px | 187,2 × 54 px | 68 × 54 px | 68,8 px | 0 px |
| 390 px | 202,8 × 54 px | 68 × 54 px | 83,2 px | 0 px |

Il calcolo CSS mantiene il layout entro la card anche a 320 px, con target verticali di almeno 48 px nel breakpoint più basso.

## Limiti della verifica

Il runner disponibile non emula in modo affidabile il timing `requestAnimationFrame` di una pagina visibile, quindi il test dimostra la riduzione strutturale del lavoro per gesto ma non costituisce una misura FPS su telefono. Il Canvas continua inoltre a usare `shadowBlur` per fino a 40 invasori: è un costo secondario indipendente dal joystick da profilare soltanto se resta stuttering senza interagire con il controllo.

Checklist consigliata su dispositivo reale:

- Chrome Android e Safari iOS;
- schermi a 60 Hz e, se disponibile, 120 Hz;
- trascinamento continuo sinistra/destra mentre si preme Fire con un secondo dito;
- apertura/chiusura della toolbar del browser durante il gesto;
- livello 3 con flotta completa, per distinguere costo input e costo Canvas;
- rotazione, ritorno in portrait e ripresa dopo la pausa.

## Esito

La causa specifica introdotta dal joystick è stata rimossa: il percorso touch non alterna più letture e scritture di layout per ogni campione, e il controllo non è più binario. Resta necessaria una prova su telefono fisico per confermare il frame pacing del dispositivo e decidere se intervenire separatamente sugli effetti Canvas.
