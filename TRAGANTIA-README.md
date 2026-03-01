# LA TRAGANTÍA - Escape City Cazorla

## Descripción General

Aplicación web progresiva (PWA) de escape room urbano basada en GPS. Los jugadores recorren 7 localizaciones (portales) en el casco histórico de Cazorla (Jaén, España), resolviendo enigmas relacionados con la leyenda de La Tragantía (criatura mitad mujer, mitad serpiente).

**URL de producción:** https://leyendatragantia.com/  
**Tienda WooCommerce:** https://www.cazorlatravel.es (producto ID: 34644)  
**Plugin de licencias:** Key Manager for WooCommerce (entrega códigos automáticamente al comprar)

---

## Arquitectura

### Stack Técnico
- **Frontend puro:** HTML + CSS + JavaScript vanilla (sin frameworks)
- **Cada portal es un archivo HTML independiente** con todo el CSS/JS inline
- **PWA:** Service Worker (`sw.js`) + `manifest.json` para funcionamiento offline
- **GPS:** API `navigator.geolocation.watchPosition()` para tracking en tiempo real
- **Cámara:** API `navigator.mediaDevices.getUserMedia()` para el visor AR
- **Mapas:** Leaflet.js con tiles de CartoDB (tema oscuro)
- **Fuentes:** Google Fonts (Creepster, Orbitron, VT323, Special Elite)
- **Sin backend:** Todo funciona en el cliente. La validación de códigos es por hash SHA-256

### Estructura de Archivos

```
/
├── index.html                  # Pantalla principal: código de acceso, reanudar, progreso
├── plaza-corredera.html        # Portal 1 (1946 líneas - el más complejo, tiene mapa Leaflet)
├── convento-merced.html        # Portal 2
├── balcon-zabaleta.html        # Portal 3
├── puerta-deseos.html          # Portal 4
├── plaza-santa-maria.html      # Portal 5
├── rio-tragantia.html          # Portal 6
├── guarida-tragantia.html      # Portal 7 (final - pantalla de resultados globales)
├── codigos.js                  # Array de hashes SHA-256 de códigos válidos (210 hashes)
├── sw.js                       # Service Worker (cache-first, precarga todos los archivos)
├── manifest.json               # Manifiesto PWA
└── imagenes/                   # Carpeta de assets (NO incluida en el repo, está en el servidor)
    ├── tragantia.jpg            # Banner principal
    ├── lianas.png               # Overlay decorativo
    ├── esporas.png              # Overlay decorativo
    ├── portal1.jpg, portal2.jpg # Imágenes de portales
    ├── icon-192.png, icon-512.png # Iconos PWA
    ├── audio1.mp3               # Audio intro (index.html)
    ├── ambiente.mp3             # Audio ambiente (loop en portales)
    ├── scare.mp3                # Efecto de susto (respuesta incorrecta)
    ├── beep.mp3                 # Pitido de proximidad GPS
    ├── guarida.mp3              # Audio portal 7
    ├── verdad.mp3               # Audio portal 7
    ├── rio.mp3                  # Audio portal 6
    ├── audio-plaza-corredera.mp3
    ├── audio-convento-merced.mp3
    ├── audio-balcon-zabaleta.mp3
    ├── audio-puerta-deseos.mp3
    ├── audio-plaza-santa-maria.mp3
    └── audio-rio-tragantia.mp3
```

---

## Flujo del Juego

### Flujo General
```
index.html → [código válido] → instrucciones → portal 1 → portal 2 → ... → portal 7 → pantalla final → index.html
```

### Flujo Dentro de Cada Portal
```
1. Verificar autenticación (tragantia_auth en localStorage)
2. Guardar progreso (tragantia_progreso = archivo actual)
3. Activar GPS watchPosition → medir distancia al destino
4. Mostrar mapa con posición del jugador y destino
5. Pitidos de proximidad (más rápidos cuanto más cerca)
6. Al llegar al radio del destino → activar visor (cámara)
7. Mostrar narrativa con efecto typewriter + audio
8. Iniciar quiz (5 preguntas, 4 en rio-tragantia)
9. Al completar → guardar puntos → mostrar "Siguiente Portal"
10. Navegar al siguiente portal
```

### Ruta de Portales (orden y coordenadas GPS)

| # | Portal | Archivo | Latitud | Longitud | Radio | Preguntas |
|---|--------|---------|---------|----------|-------|-----------|
| 1 | Plaza Corredera | `plaza-corredera.html` | 37.91134 | -3.00268 | 10m | 5 |
| 2 | Convento de la Merced | `convento-merced.html` | 37.91066 | -3.00198 | 10m | 5 |
| 3 | Balcón de Zabaleta | `balcon-zabaleta.html` | 37.90987 | -3.00160 | 10m | 5 |
| 4 | Puerta de los Deseos | `puerta-deseos.html` | 37.90974 | -3.00098 | 10m | 5 |
| 5 | Plaza de Santa María | `plaza-santa-maria.html` | 37.90894 | -2.99993 | 10m | 5 |
| 6 | Molino Harinero (Río) | `rio-tragantia.html` | 37.90792 | -2.99982 | 10m | 4 |
| 7 | Puerta Norte Castillo | `guarida-tragantia.html` | 37.90820 | -3.00078 | 20m | 5 |

---

## Sistema de Puntuación

### Por Pregunta
- **Respuesta correcta:** +100 puntos base
- **Bonus rapidez:** +20 (< 15s), +15 (< 30s), +10 (< 60s), +5 (< 120s)
- **Respuesta incorrecta:** -25 puntos (mínimo 0)

### Por Portal
- **Bonus completar portal:** +50 puntos

### Penalizaciones
- Respuesta incorrecta activa efecto de susto (audio + visual)
- No se puede avanzar sin acertar (la pregunta se repite)

---

## Sistema de Autenticación (Códigos)

### Funcionamiento
1. El jugador introduce un código en `index.html`
2. El código se convierte a minúsculas, se le aplica SHA-256
3. El hash resultante se compara contra el array `CODIGOS_HASH` en `codigos.js`
4. Si coincide → `localStorage.tragantia_auth = 'true'`
5. Cada portal verifica este flag al cargar

### codigos.js
- Contiene 210 hashes SHA-256 (9 originales + 1 prueba + 200 generados para WooCommerce)
- Los códigos en texto plano están en Key Manager de WooCommerce (nunca en el código fuente)
- La función `hashCodigo(codigo)` genera el hash
- La función `validarCodigo(inputCodigo)` valida contra el array
- Los códigos NO distinguen mayúsculas/minúsculas (se convierten a lowercase antes de hashear)

### Códigos Originales (pre-WooCommerce)
```
cazorlanature, ab12c3d4, cazorla2525, cazorla5050, cazorla8787,
cazorla3232, cazorla9595, cazorla1010, cazorla1515, 123 (prueba)
```

### Generador de Códigos
Existe una herramienta HTML independiente (`generador-codigos-tragantia.html`) que:
- Genera códigos aleatorios en formato CAZORLA-XXXX, TRAG-XXXXXXXX o alfanumérico
- Calcula los hashes SHA-256
- Exporta CSV para importar en Key Manager
- Exporta hashes para pegar en codigos.js

---

## Persistencia (localStorage)

### Claves Utilizadas

| Clave | Tipo | Descripción |
|-------|------|-------------|
| `tragantia_auth` | `'true'` | Jugador autenticado |
| `tragantia_progreso` | `'archivo.html'` | Último portal visitado (para reanudar) |
| `tragantia_puntos` | número | Puntos totales acumulados |
| `tragantia_correctas_total` | número | Total respuestas correctas |
| `tragantia_incorrectas_total` | número | Total respuestas incorrectas |
| `tragantia_bonus_total` | número | Total bonus rapidez |
| `tragantia_portalX_completado` | `'true'` | Portal X completado (X = 1-7) |
| `tragantia_portalX_puntos` | número | Puntos obtenidos en portal X |
| `tragantia_portalX_tiempo` | `'MM:SS'` | Tiempo tardado en portal X |
| `tragantia_portalX_correctas` | número | Correctas en portal X (solo portal 1) |
| `tragantia_portalX_incorrectas` | número | Incorrectas en portal X (solo portal 1) |

### Flujo de Datos
- Cada portal lee `tragantia_puntos` (acumulado previo) al cargar
- Suma los puntos del portal actual al completar
- Guarda el total actualizado en `tragantia_puntos`
- Guarda `tragantia_progreso` con el archivo del **siguiente** portal
- El portal 7 (`guarida-tragantia.html`) borra `tragantia_progreso` al finalizar

### Reanudar Partida
- `index.html` comprueba si existe `tragantia_progreso`
- Si existe, muestra botón "Reanudar en el Punto Actual" + "Ver Progreso"
- También muestra "Borrar datos y empezar de cero" (hace `localStorage.clear()`)

### Limitación Actual
El progreso se guarda **entre portales** pero NO **dentro de un portal**. Si el jugador cierra la app a mitad de un quiz, al volver empezará ese portal desde el principio (GPS → visor → narrativa → quiz desde pregunta 1). Los portales anteriores sí se mantienen completados.

---

## Service Worker (sw.js)

### Estrategia: Cache-First con actualización en segundo plano (Stale-While-Revalidate)

- **Instalación:** Precarga todos los HTML, JS, audios e imágenes
- **HTML/JS:** Sirve desde caché inmediatamente, actualiza en segundo plano si hay red
- **Audio:** Cache-first, actualiza en segundo plano
- **Imágenes:** Cache-first
- **Dominios externos** (Google Maps, Fonts): No se cachean, van directo a red

### Cachés
- `tragantia-v4` — Archivos core + imágenes
- `tragantia-audio-v2` — Archivos de audio

### Funcionamiento Offline
- El jugador necesita abrir la app **una vez con internet** para que se precarguen todos los archivos
- Después funciona offline (GPS funciona por satélite, no necesita datos)
- Lo que NO funciona offline: mapas Leaflet (tiles), Google Fonts (usa fallback del sistema)

---

## Estructura Interna de Cada Portal

### Variables de Estado Comunes
```javascript
let estado = {
    visorActivo: false,
    preguntaActual: 0,
    watchId: null,              // GPS watchPosition ID
    intervaloPitido: null,      // Intervalo de pitidos proximidad
    ultimaDistancia: Infinity,
    narrativoMostrado: false,
    audioSilenciado: false,
    narracionActiva: false,
    textoTerminado: false,
    audioTerminado: false,
    puntuacionTotal: 0,         // Puntos de ESTE portal
    tiempoInicioPregunta: 0,    // Para calcular bonus rapidez
    respuestasCorrectas: 0,
    respuestasIncorrectas: 0,
    bonusTotal: 0,
    procesandoRespuesta: false  // Evita doble-click
};
```

### Funciones Comunes (presentes en todos los portales)
```
actualizarPosicion(pos)     — Callback del GPS, calcula distancia
activarVisor()              — Abre cámara, inicia narrativa
mostrarNarrativa()          — Efecto typewriter + audio
cargarPregunta()            — Muestra pregunta actual del quiz
verificarRespuesta(index)   — Valida respuesta, suma/resta puntos
mostrarExito()              — Pantalla de completado, guarda progreso
siguientePunto()            — Navega al siguiente portal
salirMision()               — Vuelve a index.html con confirmación
limpiarRecursos()           — Libera GPS, cámara, audio, timers
actualizarPuntosFlotante()  — Actualiza el badge flotante de puntos
abrirModalPuntuacion()      — Modal con detalle de puntuación
programarSusto()            — Timeout aleatorio para efecto de susto
ejecutarSusto()             — Ejecuta efecto susto (audio + visual)
detenerSustos()             — Cancela sustos pendientes
```

### Diferencias Entre Portales
- **plaza-corredera.html** (Portal 1): Es el más complejo (~1946 líneas). Tiene mapa Leaflet integrado, código más detallado/comentado. Los demás portales son versiones más compactas.
- **guarida-tragantia.html** (Portal 7): Portal final. Al completar muestra pantalla de resultados globales con puntuación total, borra `tragantia_progreso`, y tiene botón "Finalizar Aventura".
- **rio-tragantia.html** (Portal 6): Tiene 4 preguntas en vez de 5.

---

## Seguridad y Protecciones

### Anti-navegación accidental
- **`beforeunload`**: Muestra diálogo de confirmación si intentas cerrar durante el quiz
- **`popstate`**: Bloquea botón atrás del móvil durante el juego
- **`navegandoIntencionado`**: Variable bandera que desactiva ambas protecciones cuando la navegación es intencionada (botón "Siguiente Portal" o "Salir")

### Anti-trampas
- Los códigos están hasheados (SHA-256), no en texto plano
- ⚠️ **Las respuestas del quiz SÍ están en texto plano** en el código fuente (campo `correcta` en el array de preguntas). Se podrían hashear como mejora futura.

---

## Limpieza de Recursos

Cada portal implementa `limpiarRecursos()` que se llama al:
- Pulsar "Siguiente Portal" (`siguientePunto()`)
- Pulsar "Salir" (`salirMision()`)
- Evento `pagehide` (navegación del sistema)

Limpia:
- GPS `clearWatch()`
- Streams de cámara `getTracks().forEach(t => t.stop())`
- Audio `pause()`
- Intervalos de pitido `clearInterval()`
- Timeouts de susto `clearTimeout()`

---

## Dependencias Externas

| Recurso | URL | Uso |
|---------|-----|-----|
| Google Fonts | `fonts.googleapis.com` | Creepster, Orbitron, VT323, Special Elite |
| Leaflet.js | `unpkg.com/leaflet@1.9.4` | Mapas interactivos |
| CartoDB Tiles | `basemaps.cartocdn.com/dark_all` | Tiles de mapa tema oscuro |

---

## Integración con WooCommerce

### Flujo de Venta
1. Cliente compra en cazorlatravel.es (producto virtual + descargable)
2. Pago con Stripe (vía Dokan Stripe Connect)
3. Pedido se marca como "Completado" automáticamente (producto virtual)
4. Key Manager asigna un código del stock y lo envía por email
5. El email incluye instrucciones y enlace a https://leyendatragantia.com/
6. El producto incluye PDF descargable con guía del jugador

### Configuración Relevante
- **Plugin:** Key Manager for WooCommerce
- **Product ID:** 34644
- **Reciclar keys:** Activado (códigos se recuperan de pedidos cancelados/reembolsados)
- **Non-connected sellers:** Activado en Dokan Stripe Connect (permite vender productos de admin)
- **Nota de compra:** Incluye instrucciones y enlace a la app

---

## Mejoras Pendientes / Ideas Futuras

### Alta Prioridad
- [ ] **Guardar progreso dentro del quiz** — Guardar pregunta actual y puntos parciales en localStorage para retomar a mitad de un portal si se cierra la app
- [ ] **Ofuscar respuestas del quiz** — Mover respuestas correctas a hashes SHA-256 (como se hizo con los códigos) para evitar trampas

### Media Prioridad
- [ ] **Vibración del móvil** — Usar API Vibration en momentos clave (sustos, respuestas)
- [ ] **Favicon y Open Graph meta tags** — Para compartir en redes sociales con imagen/descripción
- [ ] **Landing page** — Página atractiva en leyendatragantia.com con fotos, descripción y botón de compra
- [ ] **Temporizador global visible** — Tiempo total de la experiencia

### Baja Prioridad
- [ ] **Ranking/clasificación** — Necesitaría backend (Firebase o similar)
- [ ] **Modo nocturno** — Tema adaptado para jugar de noche
- [ ] **Integrar Google Reviews** — Pedir valoración al final del juego

---

## Notas de Desarrollo

### Para modificar un portal
Cada portal es un archivo HTML autocontenido. CSS y JS están inline. Para cambiar preguntas, coordenadas GPS, textos narrativos o comportamiento, editar directamente el HTML del portal correspondiente. Buscar el objeto `CONFIG` al inicio del script para encontrar preguntas y coordenadas.

### Para añadir nuevos códigos
1. Usar `generador-codigos-tragantia.html` para generar batch
2. Descargar CSV → importar en Key Manager
3. Copiar hashes → pegar en array `CODIGOS_HASH` de `codigos.js`
4. Subir `codigos.js` actualizado al servidor

### Para actualizar el Service Worker
Cambiar el nombre de la caché (`CACHE_NAME` y/o `AUDIO_CACHE`) para forzar actualización en todos los clientes. El SW anterior se borrará automáticamente.

### Testear sin GPS
Para probar en escritorio, se pueden modificar temporalmente las coordenadas del destino o reducir el radio a un valor grande (ej: 99999) para que siempre active el visor.
