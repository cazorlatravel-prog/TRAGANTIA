# CLAUDE.md — La Tragantía Escape City Cazorla

## Project Overview

GPS-based urban escape room PWA set in Cazorla (Jaén, Spain). Players visit 7 physical locations ("portals") in order, solving quizzes about the legend of La Tragantía (a half-woman, half-serpent creature). The app runs entirely client-side with no backend.

- **Production URL:** https://leyendatragantia.com/
- **WooCommerce store:** https://www.cazorlatravel.es (product ID: 34644)
- **Language:** All UI text, comments, and variable names are in **Spanish**. Maintain this convention.

## Tech Stack

- **Frontend only:** HTML + CSS + JavaScript vanilla (no frameworks, no bundler, no npm)
- **Each portal is a self-contained HTML file** with all CSS and JS inline (no shared stylesheets or JS modules except `codigos.js`)
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
│       ├── sw.js                   # Service Worker (cache-first + stale-while-revalidate)
│       └── manifest.json           # PWA manifest
└── imagenes/                   # Assets directory (on server only, NOT in repo)
```

## How to Run / Test

There is no build step. To test locally:

1. Extract `tragantia-escape.zip` into a directory
2. Serve with any static HTTP server (e.g., `python3 -m http.server 8000` from the extracted `tragantia-final/` folder)
3. Open in a mobile browser or use Chrome DevTools device emulation
4. Use test code `123` to authenticate

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

**Important:** Progress saves between portals but NOT within a portal. If the app closes mid-quiz, that portal restarts from GPS tracking.

## Authentication System

- `codigos.js` contains an array `CODIGOS_VALIDOS` with plaintext codes (case-insensitive)
- `index.html` loads this file and does a simple `.includes()` check
- The README mentions SHA-256 hashing, but the current code uses **plaintext comparison**
- Valid test code: `123`
- Codes are delivered to customers via WooCommerce Key Manager plugin

## Service Worker (sw.js)

- Cache names: `tragantia-v3` (core + images), `tragantia-audio-v1` (audio)
- **HTML/JS:** Network-first with cache fallback
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
6. Update portal count references in UI text

### Updating the Service Worker
Change `CACHE_NAME` and/or `AUDIO_CACHE` version strings in `sw.js`. The old caches are automatically deleted on activation.

## Security Notes

- Activation codes are stored in **plaintext** in `codigos.js` (visible in source)
- Quiz answers are in **plaintext** in each portal's `CONFIG.preguntas[].correcta` field
- No server-side validation — everything runs client-side
- Anti-navigation: `beforeunload` + `popstate` history manipulation prevent accidental exits
- localStorage can be manually edited via DevTools (no tamper protection)

## Known Limitations & Future Improvements

- **No in-portal save:** Progress within a portal (mid-quiz) is lost if app closes
- **Plaintext answers:** Quiz correct answers visible in source code
- **No ranking/leaderboard:** Would require a backend (e.g., Firebase)
- **Offline maps:** Leaflet tiles don't work offline (only GPS + cache works)
- **Code duplication:** Each portal duplicates ~500+ lines of common JS logic; extracting shared code into a module would reduce maintenance burden
