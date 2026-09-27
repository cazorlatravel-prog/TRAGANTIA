# CLAUDE.md — La Tragantía Escape City Cazorla

## Project Overview

GPS-based urban escape room PWA set in Cazorla (Jaén, Spain). Players visit 7 physical locations ("portals") in order, solving quizzes about the legend of La Tragantía (a half-woman, half-serpent creature). The app runs entirely client-side with no backend.

- **Production URL:** https://leyendatragantia.com/
- **WooCommerce store:** https://www.cazorlatravel.es (product ID: 34644)
- **Language:** All UI text, comments, and variable names are in **Spanish**. Maintain this convention.

## Tech Stack

- **Frontend only:** HTML + CSS + JavaScript vanilla (no frameworks, no bundler, no npm)
- **Each portal is a self-contained HTML file** with its core CSS and JS inline. Shared scripts: `codigos.js` (activation codes) and `juego.js` (relics, achievements, ranks, hints, compass, in-portal save phases, usage stats)
- **PWA:** Service Worker (`sw.js`) + `manifest.json` for offline support
- **GPS:** `navigator.geolocation.watchPosition()` for real-time tracking
- **Camera:** `navigator.mediaDevices.getUserMedia()` for AR-style visor
- **Maps:** Leaflet.js 1.9.4 with CartoDB dark tiles
- **Fonts:** Google Fonts (Creepster, Orbitron, VT323, Special Elite)
- **No build step.** Files are deployed directly to the web server as-is.

## Repository Structure

```
/
├── CLAUDE.md                   # This file
├── TRAGANTIA-README.md         # Detailed project documentation (Spanish)
├── tragantia-escape.zip        # Deployable app bundle containing:
│   └── tragantia-final/
│       ├── index.html              # Entry point: auth, resume, progress, PWA install
│       ├── plaza-corredera.html    # Portal 1 (~1893 lines, most complex, has Leaflet map)
│       ├── convento-merced.html    # Portal 2 (~955 lines)
│       ├── balcon-zabaleta.html    # Portal 3 (~671 lines)
│       ├── puerta-deseos.html      # Portal 4 (~659 lines)
│       ├── plaza-santa-maria.html  # Portal 5 (~668 lines)
│       ├── rio-tragantia.html      # Portal 6 (~675 lines, 4 questions instead of 5)
│       ├── guarida-tragantia.html  # Portal 7 (~432 lines, final: results + TensorFlow portal detection)
│       ├── codigos.js              # Activation codes array (plaintext, case-insensitive)
│       ├── juego.js                # Shared game module (window.Juego): relics, achievements, ranks, hints, compass, stats
│       ├── sw.js                   # Service Worker (cache-first + stale-while-revalidate)
│       └── manifest.json           # PWA manifest
├── estadisticas/               # NOT deployed: Google Apps Script receiver for usage stats + setup guide (LEEME.md)
└── imagenes/                   # Assets directory (on server only, NOT in repo)
```

## How to Run / Test

There is no build step. To test locally:

1. Extract `tragantia-escape.zip` into a directory
2. Serve with any static HTTP server (e.g., `python3 -m http.server 8000` from the extracted `tragantia-final/` folder)
3. Open in a mobile browser or use Chrome DevTools device emulation
4. Use test code `cazorlanature` to authenticate (`123` was removed from `codigos.js`)

**Testing GPS without being on location:** Temporarily modify `CONFIG.destino.radio` to a large value (e.g., `99999`) in a portal HTML to bypass proximity checks, or use Chrome DevTools sensor emulation to fake GPS coordinates.

## Architecture & Game Flow

### Overall Flow
```
index.html → [valid code] → instructions modal → portal 1 → portal 2 → ... → portal 7 → results → index.html
```

### Per-Portal Flow
```
1. Auth check (tragantia_auth in localStorage)
2. Save progress (tragantia_progreso = current file)
3. GPS watchPosition → measure distance to destination
4. Show radar screen with map + proximity display
5. Proximity beeps (faster as player gets closer)
6. Arrive at radius → activate camera visor
7. Narrative text (typewriter effect) + portal-specific audio
8. Quiz (5 questions; 4 in rio-tragantia.html)
9. Complete → save points → show "Next Portal" button
10. Navigate to next portal
```

## Key Code Patterns & Conventions

### Portal HTML Structure

Every portal HTML file follows this pattern (all inline, single file):

1. **`<head>`:** Meta viewport (no-scale), Google Fonts, Leaflet CSS/JS
2. **`<style>`:** CSS custom properties in `:root`, all styles inline
3. **`<body>` HTML:** Screens as `<div>` sections toggled via `display: none/block`
   - `.pantalla-radar` — GPS/radar screen (initial)
   - `.visor-reves` — Camera visor with overlays
   - `.panel-narrativo` — Narrative text panel
   - `.modal-quiz` — Quiz questions
   - `.pantalla-exito` / results screen — Completion
4. **Audio elements:** `<audio>` tags for ambient, scare, beep, narrative
5. **`<script>`:** All JS inline at the bottom

### CONFIG Object (per portal)

Each portal defines a `CONFIG` object at the top of its script:

```javascript
const CONFIG = {
    destino: { lat: 37.91134, lng: -3.00268, radio: 10 },
    textoNarrativo: "Narrative text shown with typewriter effect...",
    preguntas: [
        {
            texto: "Question text?",
            opciones: ["Option A", "Option B", "Option C"],
            correcta: 0  // Zero-based index of correct answer
        },
        // ... (5 questions per portal, 4 in portal 6)
    ]
};
```

### State Object (per portal)

```javascript
let estado = {
    visorActivo: false,
    preguntaActual: 0,
    watchId: null,              // GPS watchPosition ID
    intervaloPitido: null,      // Beep interval
    ultimaDistancia: Infinity,
    narrativoMostrado: false,
    audioSilenciado: false,
    narracionActiva: false,
    textoTerminado: false,
    audioTerminado: false,
    puntuacionTotal: 0,         // Points for THIS portal only
    tiempoInicioPregunta: 0,    // For speed bonus calculation
    respuestasCorrectas: 0,
    respuestasIncorrectas: 0,
    bonusTotal: 0,
    procesandoRespuesta: false  // Prevents double-click
};
```

### Common Functions (present in every portal)

| Function | Purpose |
|----------|---------|
| `actualizarPosicion(pos)` | GPS callback, calculates distance |
| `activarVisor()` | Opens camera, starts narrative |
| `mostrarNarrativa()` / `iniciarNarracion()` | Typewriter text + audio |
| `cargarPregunta()` | Renders current quiz question |
| `verificarRespuesta(index)` | Validates answer, adds/subtracts points |
| `mostrarExito()` | Completion screen, saves progress |
| `siguientePunto()` | Navigates to next portal |
| `salirMision()` | Returns to index.html with confirmation |
| `limpiarRecursos()` | Releases GPS, camera, audio, timers |
| `actualizarPuntosFlotante()` | Updates floating score badge |
| `programarSusto()` / `ejecutarSusto()` | Random scare effects (audio + visual) |
| `inicializarMapa()` | Sets up Leaflet map in radar container |
| `calcularDistancia()` | Haversine formula for GPS distance |

### CSS Conventions

- **CSS custom properties** in `:root` for theme colors: `--rojo-sangre`, `--verde-radar`, `--negro-vacio`, etc.
- Each portal has slightly different color accent variables (e.g., portal 7 uses `--rojo-final`, `--dorado-antiguo`)
- Dark theme throughout (background `#030303`)
- Font families: `Orbitron` (UI), `Creepster` (titles), `VT323` (data/monospace), `Special Elite` (narrative text)
- Mobile-first, portrait orientation, `touch-action: manipulation`
- Screens toggled via `display: none/block` (no routing library)

### JavaScript Conventions

- **Vanilla JS only** — no frameworks, no jQuery
- Portals use `viewport-fit=cover` without zoom blocking (accessibility); `index.html` adds `body.modo-jugador` (hides marketing sections) when there is a game in progress or the PWA is installed
- Portal 1 (`plaza-corredera.html`) uses ES6+ syntax (arrow functions, `const`/`let`, template literals)
- Portal 7 (`guarida-tragantia.html`) uses more compact, minified-style code with `function` declarations
- Other portals (2-6) use a mix of arrow functions and standard functions
- DOM elements cached in an `elementos` object at script start
- Navigation protection: `beforeunload` event + `popstate` history manipulation
- A `navegandoIntencionado` flag disables exit warnings for intentional navigation

### Scoring System

- Correct answer: **+100 points**
- Speed bonus: +20 (<15s), +15 (<30s), +10 (<60s), +5 (<120s)
- Wrong answer: **-25 points** (minimum 0) + scare effect
- Portal completion bonus: **+50 points**
- Wrong answers don't advance; the same question repeats

## Shared module (`juego.js`)

Exposes `window.Juego`. Each portal loads it before its inline script and calls these hooks:

| Hook | Where |
|------|-------|
| `Juego.iniciarPortal(N)` | Right after saving `tragantia_progreso` (adds the 🎒 relic bag button) |
| `Juego.brujula.activar()` + `Juego.iniciarBusqueda()` | Inside the "Activar búsqueda" click (iOS compass permission needs the gesture) |
| `Juego.brujula.fijarRumbo(rumbo, distancia)` | `actualizarRumbo()`; draws `#rumboFlecha` / `#rumboTexto` relative to device heading (falls back to north-relative) and places `#puntoObjetivo` on the radar at the real bearing (north-up, like the map) |
| `Juego.radioEfectivo(radio, accuracy)` + `Juego.vigilarLlegada(distancia, alConfirmar)` | Arrival check in `actualizarPosicion()`: radius grows with GPS accuracy (max +15 m); after 20 s within 40 m a manual "Estoy frente al portal" button appears |
| `Juego.marcarLlegada()` / `Juego.guardarFase('narrativa')` | `activarVisor()` / `finalizarNarracion()` |
| `Juego.prepararReanudacion(total, reanudarQuizGuardado, reanudarEnPortal)` | On `DOMContentLoaded`; fills and shows `#avisoReanudar` |
| `Juego.prepararPista(i, pregunta, elementos.quizContenido, aplicarCostePista)` | End of `cargarPregunta()`; hint costs 30 pts, needs ≥30 pts in the portal, removes one wrong option |
| `Juego.registrarRespuesta(i, correcta, segundos)` | Both branches of `verificarRespuesta()` |
| `Juego.completarPortal({puntos, correctas, incorrectas, segundos})` | `mostrarExito()` (portal 7: `mostrarPuntuacionFinal()`); shows the relic reveal and unlocks achievements |
| `Juego.finalizarMision(totales)` | Portal 7 only; returns the rank `{titulo, estrellas}` |

- **Ranks** are based on points / max possible for the sealed portals (120 per question + 50 per portal).
- **Shared UI layer:** `inyectarEstilos()` also injects the design/accessibility overrides for all portals (radar layout with scroll, safe areas, contrast, 44 px touch targets, `prefers-reduced-motion`, focus). Prefer adding cross-portal CSS there instead of editing 7 files.
- `Juego.iniciarPortal(N)` also rebuilds the 7-dot `.contador-brechas`, adds a "Saltar ▸" button (calls the portal's `saltarNarracion()`) and a "🔄 Historia" button (calls `repetirNarracion()`), and applies the "modo sin sustos" (toggle in the 🎒 bag, key `tragantia_sin_sustos`, survives new games).
- Wrong answers shake the quiz and lock the failed option; `completarPortal()` shows the next destination on the success screen and reveals the relic after 1.5 s.
- **Usage stats:** `ESTADISTICAS_URL` at the top of `juego.js` (empty = events are only queued locally). Setup: `estadisticas/LEEME.md`.

## Persistence (localStorage)

| Key | Type | Description |
|-----|------|-------------|
| `tragantia_auth` | `'true'` | Player authenticated |
| `tragantia_progreso` | `'filename.html'` | Last portal visited (for resume) |
| `tragantia_puntos` | number | Cumulative total points |
| `tragantia_correctas_total` | number | Total correct answers |
| `tragantia_incorrectas_total` | number | Total incorrect answers |
| `tragantia_bonus_total` | number | Total speed bonuses |
| `tragantia_portalX_completado` | `'true'` | Portal X completed (X = 1-7) |
| `tragantia_portalX_puntos` | number | Points earned in portal X |
| `tragantia_portalX_tiempo` | `'MM:SS'` | Time spent in portal X |
| `tragantia_portalX_quiz` | JSON | Mid-quiz state (question, points, timer); saved every 5 s and on answers |
| `tragantia_portalX_fase` | `'llegada'` / `'narrativa'` | Player already reached the portal / heard the narrative (resume without GPS) |
| `tragantia_portalX_pista` | JSON | Hint used on the current question (which option was eliminated) |
| `tragantia_portalX_pistas`, `_correctas`, `_incorrectas` | number | Per-portal hint count and answers |
| `tragantia_portalX_busqueda` | timestamp | When the GPS search started (for the Rastreador achievement and stats) |
| `tragantia_logros` | JSON | Unlocked achievements `{id: timestamp}` |
| `tragantia_pistas_total`, `tragantia_racha` | number | Total hints used / current first-try correct streak |
| `tragantia_inicio_partida` | timestamp | Set on code validation; used for total mission time |
| `tragantia_sesion` | string | Anonymous random id for usage stats |
| `tragantia_sin_sustos` | `'true'` | "Modo sin sustos": no flashes or scare sounds |
| `tragantia_eventos_pendientes` | JSON | Stats events waiting to be sent (max 300; survives "Borrar datos") |

**In-portal save:** if the app closes mid-portal, the radar screen offers to resume: mid-quiz (same question, points, timer and used hint) or, if the player had already arrived, straight into the visor without GPS. Relics are derived from `tragantia_portalX_completado`. Validating a code (`Juego.nuevaPartida()`) wipes all `tragantia_*` game keys except auth and the stats queue.

## Authentication System

- `codigos.js` contains an array `CODIGOS_VALIDOS` with plaintext codes (case-insensitive)
- `index.html` loads this file and does a simple `.includes()` check
- The README mentions SHA-256 hashing, but the current code uses **plaintext comparison**
- Valid test code: `cazorlanature`
- Codes are delivered to customers via WooCommerce Key Manager plugin

## Service Worker (sw.js)

- Cache names: `tragantia-v3` (core + images), `tragantia-audio-v1` (audio)
- **HTML and own `.js` (`juego.js`, `codigos.js`):** Network-first with cache fallback
- **Non-GET requests** (stats POSTs) bypass the SW
- **Audio (.mp3):** Cache-first with background network update
- **Other assets:** Cache-first
- **To force update:** Increment cache version names (`CACHE_NAME`, `AUDIO_CACHE`)

## Portal-Specific Differences

| Portal | File | Notable Differences |
|--------|------|-------------------|
| 1 | `plaza-corredera.html` | Most complex (~1893 lines). Has detailed Leaflet map integrated into radar. Most commented code. Uses circular radar with map background. |
| 2-5 | Various | Standard portals (~660-955 lines). Hexagonal radar design (portals 2-5 use `hex-ring` CSS). |
| 6 | `rio-tragantia.html` | Only 4 questions instead of 5. |
| 7 | `guarida-tragantia.html` | Final portal. Uses TensorFlow.js MobileNet for "portal detection" via camera. Shows global results. Has `html2canvas` for screenshot. Removes `tragantia_progreso` on completion. Uses compact/minified code style. |

## External Dependencies (CDN)

| Library | Version | Usage |
|---------|---------|-------|
| Leaflet.js | 1.9.4 | Interactive maps (via unpkg CDN) |
| CartoDB dark tiles | — | Map tile layer |
| Google Fonts | — | Creepster, Orbitron, VT323, Special Elite |
| TensorFlow.js | 4.10.0 | Portal 7 only: object detection |
| MobileNet | 2.1.0 | Portal 7 only: image classification |
| html2canvas | 1.4.1 | Portal 7 only: screenshot capture |

## Common Development Tasks

### Modifying a portal's questions or coordinates
Edit the `CONFIG` object at the top of the portal's `<script>` section. Change `destino.lat`, `destino.lng`, `destino.radio`, or the `preguntas` array.

### Adding new activation codes
1. Add the new code string to the `CODIGOS_VALIDOS` array in `codigos.js`
2. Upload updated `codigos.js` to the server
3. Increment SW cache version in `sw.js` to force client update

### Adding a new portal
1. Copy an existing portal HTML file (e.g., `convento-merced.html`) as template
2. Update `CONFIG` with new coordinates, narrative text, and questions
3. Update navigation: previous portal's `siguientePunto()` and `tragantia_progreso` to point to new file
4. Update `PORTALES` array in `index.html`
5. Add new file to `CORE_FILES` in `sw.js`
6. Add the portal (and its relic) to `PORTALES` in `juego.js`, load `juego.js`, call `Juego.iniciarPortal(N)` and the hooks listed in the Shared module section
7. Update portal count references in UI text

### Updating the Service Worker
Change `CACHE_NAME` and/or `AUDIO_CACHE` version strings in `sw.js`. The old caches are automatically deleted on activation.

## Security Notes

- Activation codes are stored in **plaintext** in `codigos.js` (visible in source)
- Quiz answers are in **plaintext** in each portal's `CONFIG.preguntas[].correcta` field
- No server-side validation — everything runs client-side
- Anti-navigation: `beforeunload` + `popstate` history manipulation prevent accidental exits
- localStorage can be manually edited via DevTools (no tamper protection)

## Known Limitations & Future Improvements

- **Plaintext answers:** Quiz correct answers visible in source code
- **No ranking/leaderboard:** Would require a backend (e.g., Firebase)
- **Offline maps:** Leaflet tiles don't work offline (only GPS + cache works)
- **Code duplication:** Each portal still duplicates ~500+ lines of core JS (GPS, audio, quiz); new features go into `juego.js` instead
