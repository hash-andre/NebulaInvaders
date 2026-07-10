# Nebula Invaders

Un piccolo gioco arcade ispirato a *Space Invaders*, realizzato interamente con tecnologie web native.

## Come giocare

Apri `index.html` in un browser moderno e premi **Start mission**.

- `←` e `→`: muovi la navicella.
- `Spazio`: spara.
- Su smartphone e tablet usa i pulsanti touch: frecce per muoverti e **Fire** per sparare.
- Abbatti tutti gli alieni prima che raggiungano la navicella.
- Evita i proiettili nemici: hai tre vite.
- Colpisci l'UFO dorato per ottenere 500 punti bonus.

Al termine della partita puoi usare **Retry mission** per ricominciare.

## Funzionalità

- Flotta aliena animata con velocità crescente.
- Alieni capaci di sparare.
- Sistema di vite e punteggio.
- Bonus vittoria di 1.000 punti per ogni vita rimasta.
- UFO bonus ispirato al gioco originale.
- Effetti sonori per movimento, spari, impatti, vittoria e sconfitta.
- Tema chiaro e scuro.
- Controllo per disattivare l'audio.
- Canvas responsive e interfaccia adattabile ai dispositivi mobili.
- Layout desktop contenuto nell'altezza della finestra, senza scroll verticale.
- Schermate di avvio, vittoria e game over.

## Tecnologie

- **HTML5** per struttura, controlli e accessibilità.
- **CSS3** per layout responsive, temi, animazioni e interfaccia.
- **JavaScript ES6** per logica, classi e game loop.
- **Canvas 2D API** per disegnare e animare il gioco.
- **Web Audio API** per generare i suoni nel browser senza file audio esterni.
- **Google Fonts** per i caratteri Chakra Petch e Space Mono.
- **OpenAI Image Generation** per lo sfondo spaziale in `assets/space-background.png`.

Non sono richiesti framework, package manager o processo di compilazione.

## Struttura

```text
.
├── assets/
│   └── space-background.png
├── index.html
├── script.js
├── style.css
├── README.md
└── DEVELOPMENT.md
```

## Esecuzione locale

È possibile aprire direttamente `index.html`. In alternativa, avvia un server statico dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

Poi visita `http://localhost:8000`.

## Compatibilità

È consigliato un browser aggiornato con supporto per Canvas, Web Audio e JavaScript ES6. L'audio viene inizializzato dopo il primo click dell'utente, come richiesto dai browser moderni.
