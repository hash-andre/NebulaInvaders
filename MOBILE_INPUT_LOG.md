# Log stabilità input mobile

Data: 12 luglio 2026  
Ambito: ripristino del pomello arcade binario e verifica dello stuttering touch.

## Obiettivo

Rimuovere il controllo analogico con accelerazione, ripristinare il pomello on/off compatto della revisione precedente e conservare le ottimizzazioni necessarie a non contendere il main thread al rendering Canvas.

## Implementazione

- Ripristinati tre soli stati di movimento: sinistra a velocità piena, neutro e destra a velocità piena, con zona morta centrale del 20%.
- Ripristinati il pomello circolare e le dimensioni compatte del commit `efc9c02`, mantenendo focus visibile, supporto tastiera e descrizione per screen reader.
- La geometria del controllo viene letta una volta al `pointerdown` e riutilizzata per tutto il gesto.
- Il valore usato dal gioco cambia subito; l'aggiornamento visivo viene coalesciuto su `requestAnimationFrame` e usa soltanto `transform: translate3d(...)`.
- Gli eventi che restano nello stesso stato binario non pianificano alcun frame DOM e non riscrivono stile o attributi ARIA.
- Pointer Capture, reset su release/cancel/blur/pagehide e gestione dei resize della toolbar mobile restano attivi.

## Stress test dell'input

Il test automatico invia un `pointerdown`, 240 campioni di trascinamento e campioni da un puntatore estraneo. Verifica:

- una sola chiamata a `getBoundingClientRect()` per gesto;
- zero scritture di stile negli handler Pointer Events;
- un solo aggiornamento visuale nel frame, con l'ultimo stato ricevuto;
- zero frame e zero scritture aggiuntive per altri 120 campioni sullo stesso lato;
- deduplicazione degli attributi ARIA;
- reset idempotente su release, cancel e perdita della capture;
- ritorno al centro corretto anche se il gesto termina prima del frame pendente.

La vecchia implementazione binaria eseguiva invece 241 letture layout, 241 scritture di `style.left` e 482 scritture ARIA sullo stesso burst. Il comportamento binario è stato quindi ripristinato senza ripristinare quel percorso caldo.

## Verifica del frame pacing

Test eseguito con WebKitGTK 2.52.5 a gioco attivo. Dopo una baseline di 150 frame sono stati generati eventi `pointermove` ogni 4 ms, alternando lato ogni 20 campioni; 302 eventi sono arrivati durante altri 150 frame.

| Scenario | Frame misurati | Media | p95 | Massimo | Frame oltre 25 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 145 | 16,062 ms | 17 ms | 17 ms | 0 |
| Stress touch | 145 | 16,055 ms | 17 ms | 17 ms | 0 |

Nel runner disponibile lo stress touch non ha introdotto frame lunghi né una regressione misurabile rispetto alla baseline.

## Verifica responsive

Misure effettuate in WebKitGTK con viewport telefoniche in portrait:

| Viewport | Pomello | Fire | Spazio tra i controlli | Overflow orizzontale |
| --- | ---: | ---: | ---: | ---: |
| 341 px | 119,34 × 54 px | 68 × 54 px | 117,66 px | 0 px |
| 360 px | 126 × 54 px | 68 × 54 px | 130 px | 0 px |
| 390 px | 136,5 × 54 px | 68 × 54 px | 149,5 px | 0 px |

Nel controllo aggiuntivo a 341 px con altezza utile di 503 px, i target scendono a 48 px come previsto dal breakpoint compatto, la card resta interamente visibile e l'overflow orizzontale resta a zero.

## Verifiche finali

- `npm run check`: superato;
- `node --test --test-isolation=none test/game.test.js`: 28/28 test superati;
- test browser WebKitGTK: superato;
- `git diff --check`: superato.

## Limiti

Il test browser confronta il frame pacing reale del runner WebKit disponibile, ma non sostituisce una misura su telefono fisico con GPU, frequenza di refresh e gestione energetica proprie. La prova consigliata resta trascinamento sinistra/destra con Fire simultaneo su Chrome Android e Safari iOS, soprattutto al livello 3.

## Esito

Il pomello arcade binario è stato ripristinato senza reintrodurre le letture e scritture di layout per ogni campione touch. La pipeline aggiorna il DOM soltanto quando cambia stato e, nel test disponibile, lo stress touch non modifica il frame pacing rispetto alla baseline.
