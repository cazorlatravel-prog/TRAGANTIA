// ============================================================
// juego.js — Módulo compartido de La Tragantía
// Reliquias, logros, rangos, pistas, brújula real, guardado
// por fases y estadísticas de uso.
// Se carga con <script src="juego.js"></script> antes del
// script propio de cada portal y en index.html.
// ============================================================
(function () {
    'use strict';

    // === CONFIGURACIÓN ===
    // URL de la aplicación web de Google Apps Script que recibe las
    // estadísticas (ver estadisticas/LEEME.md). Vacía = no se envía nada
    // y los eventos se quedan en cola en el dispositivo.
    const ESTADISTICAS_URL = '';
    const VERSION = '2.0';

    const COSTE_PISTA = 30;
    const MAX_EVENTOS_COLA = 300;

    const PORTALES = [
        { num: 1, nombre: 'Plaza de la Corredera', archivo: 'plaza-corredera.html', preguntas: 5,
          reliquia: { icono: '🔔', nombre: 'Campana del Pregonero', descripcion: 'Aún guarda el eco de los pregones del mercado medieval. La Tragantía coleccionaba voces... esta ya nunca será suya.' } },
        { num: 2, nombre: 'Convento de la Merced', archivo: 'convento-merced.html', preguntas: 5,
          reliquia: { icono: '📿', nombre: 'Rosario Mercedario', descripcion: 'Cuentas gastadas por siglos de súplicas por los cautivos que nunca volvieron.' } },
        { num: 3, nombre: 'Balcón de Zabaleta', archivo: 'balcon-zabaleta.html', preguntas: 5,
          reliquia: { icono: '🌿', nombre: 'Hiedra de la Torre', descripcion: 'Arrancada de la ventana desde la que ella espera, cada noche, el regreso de su padre.' } },
        { num: 4, nombre: 'Puerta de los Deseos', archivo: 'puerta-deseos.html', preguntas: 5,
          reliquia: { icono: '🗝️', nombre: 'Llave de los Deseos', descripcion: 'Abría la antigua ermita. Tres siglos de deseos susurrados laten todavía en su hierro.' } },
        { num: 5, nombre: 'Plaza de Santa María', archivo: 'plaza-santa-maria.html', preguntas: 5,
          reliquia: { icono: '⛓️', nombre: 'Eslabón de las Cadenas', descripcion: 'Un eslabón de la Fuente de las Cadenas, forjado cuando Cazorla aún temía al río que corre bajo la plaza.' } },
        { num: 6, nombre: 'Molino Harinero', archivo: 'rio-tragantia.html', preguntas: 4,
          reliquia: { icono: '🐍', nombre: 'Escama de la Tragantía', descripcion: 'Brilla con reflejos verdes junto al Cerezuelo. La prueba de que ella es real.' } },
        { num: 7, nombre: 'Puerta Norte del Castillo', archivo: 'guarida-tragantia.html', preguntas: 5,
          reliquia: { icono: '👑', nombre: 'Diadema de María', descripcion: 'Lo último que quedó de la hija del Señor de Cazorla antes de convertirse en leyenda.' } }
    ];

    const LOGROS = [
        { id: 'primer_sello', icono: '🔓', nombre: 'Primera Brecha', descripcion: 'Sella tu primer portal.' },
        { id: 'impecable', icono: '💎', nombre: 'Impecable', descripcion: 'Sella un portal sin ningún fallo.' },
        { id: 'relampago', icono: '⚡', nombre: 'Relámpago', descripcion: 'Acierta una pregunta en menos de 10 segundos.' },
        { id: 'racha', icono: '🔥', nombre: 'Racha Imparable', descripcion: 'Encadena 5 aciertos seguidos a la primera.' },
        { id: 'cabezota', icono: '🪨', nombre: 'Cabezota', descripcion: 'Acierta una pregunta después de fallarla dos veces.' },
        { id: 'rastreador', icono: '🧭', nombre: 'Rastreador', descripcion: 'Llega a un portal en menos de 3 minutos.' },
        { id: 'nocturno', icono: '🌙', nombre: 'Alma Nocturna', descripcion: 'Sella un portal entre las 21:00 y las 6:00.' },
        { id: 'coleccionista', icono: '🎒', nombre: 'Coleccionista', descripcion: 'Reúne las 7 reliquias.' },
        { id: 'sin_pistas', icono: '🧠', nombre: 'Sabio de Cazorla', descripcion: 'Completa la misión sin usar ninguna pista.' },
        { id: 'perfecto', icono: '👑', nombre: 'Leyenda Perfecta', descripcion: 'Completa la misión sin un solo fallo.' }
    ];

    // Porcentaje de la puntuación máxima posible en los portales sellados
    const RANGOS = [
        { minimo: 0.92, titulo: 'Guardián Legendario de Cazorla', estrellas: 5 },
        { minimo: 0.85, titulo: 'Cazador de la Tragantía', estrellas: 4 },
        { minimo: 0.77, titulo: 'Guardián de Cazorla', estrellas: 3 },
        { minimo: 0.68, titulo: 'Protector de las Brechas', estrellas: 2 },
        { minimo: 0, titulo: 'Aprendiz de la Leyenda', estrellas: 1 }
    ];

    let portalActual = null;
    let fallosPreguntaActual = 0;
    let preguntaDeFallos = null;

    // === UTILIDADES DE ALMACENAMIENTO ===
    function leer(clave, defecto) {
        try { const v = localStorage.getItem(clave); return v === null ? defecto : v; } catch (e) { return defecto; }
    }
    function escribir(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) {} }
    function borrar(clave) { try { localStorage.removeItem(clave); } catch (e) {} }
    function leerJSON(clave, defecto) {
        try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : defecto; } catch (e) { return defecto; }
    }
    function leerNumero(clave) { return parseInt(leer(clave, '0'), 10) || 0; }
    function clavePortal(sufijo, num) { return 'tragantia_portal' + (num || portalActual) + '_' + sufijo; }

    function vibrar(patron) { if (navigator.vibrate) { try { navigator.vibrate(patron); } catch (e) {} } }

    function portalCompletado(num) { return leer('tragantia_portal' + num + '_completado', '') === 'true'; }
    function portalesCompletados() { return PORTALES.filter(p => portalCompletado(p.num)).map(p => p.num); }

    function formatearTiempo(segundos) {
        segundos = Math.max(0, Math.round(segundos));
        const h = Math.floor(segundos / 3600), m = Math.floor((segundos % 3600) / 60), s = segundos % 60;
        const dos = n => n.toString().padStart(2, '0');
        return h > 0 ? h + ':' + dos(m) + ':' + dos(s) : dos(m) + ':' + dos(s);
    }
    function tiempoASegundos(texto) {
        if (!texto || texto.indexOf(':') === -1) return 0;
        const partes = texto.split(':').map(n => parseInt(n, 10) || 0);
        return partes.reduce((acc, n) => acc * 60 + n, 0);
    }

    // === ESTILOS (inyectados para no duplicarlos en cada portal) ===
    function inyectarEstilos() {
        if (document.getElementById('jg-estilos')) return;
        const css = `
        .jg-btn-zurron { position: fixed; top: 16px; left: 16px; z-index: 180; background: #1a1a1a; border: 1.5px solid #d4a574; border-radius: 20px; padding: 6px 14px; color: #d4a574; font-family: 'VT323', monospace; font-size: 0.95em; letter-spacing: 1px; cursor: pointer; box-shadow: 0 2px 12px rgba(0,0,0,0.5); }
        .jg-btn-zurron.jg-latido { animation: jg-latido 0.6s ease 2; }
        @keyframes jg-latido { 50% { transform: scale(1.15); border-color: #39ff14; color: #39ff14; } }
        .jg-capa { display: none; position: fixed; inset: 0; z-index: 9550; background: #050505; overflow-y: auto; padding: 24px 18px; -webkit-overflow-scrolling: touch; }
        .jg-capa.activa { display: block; }
        .jg-caja { max-width: 440px; margin: 0 auto; }
        .jg-titulo { font-family: 'Creepster', cursive; color: #d4a574; font-size: 1.5em; text-align: center; margin-bottom: 4px; letter-spacing: 1px; }
        .jg-subtitulo { font-family: 'VT323', monospace; color: #777; text-align: center; letter-spacing: 2px; margin-bottom: 18px; }
        .jg-seccion { font-family: 'Orbitron', sans-serif; font-size: 0.65em; color: #39ff14; letter-spacing: 3px; margin: 20px 0 10px; }
        .jg-rango { text-align: center; padding: 14px; border: 1px solid #333; border-radius: 10px; background: #111; }
        .jg-rango-nombre { font-family: 'Creepster', cursive; color: #f5c842; font-size: 1.25em; }
        .jg-estrellas { color: #333; font-size: 1.3em; letter-spacing: 3px; margin-top: 4px; }
        .jg-estrellas b { color: #f5c842; font-weight: normal; text-shadow: 0 0 8px rgba(245,200,66,0.5); }
        .jg-reliquias { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .jg-reliquia { background: #111; border: 1px solid #333; border-radius: 10px; padding: 10px 4px; text-align: center; }
        .jg-reliquia .jg-ico { font-size: 1.7em; line-height: 1.2; }
        .jg-reliquia .jg-nom { font-family: 'VT323', monospace; font-size: 0.8em; color: #bbb; line-height: 1.1; margin-top: 4px; }
        .jg-reliquia.bloqueada .jg-ico { filter: grayscale(1) brightness(0.25); }
        .jg-reliquia.bloqueada .jg-nom { color: #444; }
        .jg-reliquia.obtenida { border-color: #d4a574; box-shadow: 0 0 10px rgba(212,165,116,0.2); }
        .jg-logros { display: flex; flex-direction: column; gap: 8px; }
        .jg-logro { display: flex; align-items: center; gap: 12px; background: #111; border: 1px solid #333; border-radius: 10px; padding: 10px 12px; }
        .jg-logro .jg-ico { font-size: 1.5em; width: 34px; text-align: center; }
        .jg-logro .jg-nom { font-family: 'Orbitron', sans-serif; font-size: 0.72em; color: #f0e6d3; letter-spacing: 1px; }
        .jg-logro .jg-des { font-family: 'VT323', monospace; font-size: 0.95em; color: #888; }
        .jg-logro.bloqueado { opacity: 0.4; }
        .jg-logro.bloqueado .jg-ico { filter: grayscale(1); }
        .jg-logro.obtenido { border-color: #39ff14; }
        .jg-btn-cerrar { width: 100%; margin-top: 20px; padding: 14px; background: transparent; border: 1px solid #333; border-radius: 8px; color: #777; font-family: 'Orbitron', sans-serif; font-size: 0.7em; letter-spacing: 1px; cursor: pointer; }
        .jg-revelacion { display: none; position: fixed; inset: 0; z-index: 250; background: rgba(0,0,0,0.92); align-items: center; justify-content: center; padding: 20px; }
        .jg-revelacion.activa { display: flex; }
        .jg-rev-caja { max-width: 360px; width: 100%; text-align: center; background: #0d0d0d; border: 2px solid #d4a574; border-radius: 14px; padding: 26px 20px; box-shadow: 0 0 40px rgba(212,165,116,0.25); animation: jg-aparece 0.6s ease; }
        @keyframes jg-aparece { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .jg-rev-sub { font-family: 'VT323', monospace; color: #39ff14; letter-spacing: 3px; }
        .jg-rev-icono { font-size: 4.2em; margin: 14px 0 6px; animation: jg-flota 2.4s ease-in-out infinite; filter: drop-shadow(0 0 16px rgba(212,165,116,0.6)); }
        @keyframes jg-flota { 50% { transform: translateY(-8px); } }
        .jg-rev-nombre { font-family: 'Creepster', cursive; color: #d4a574; font-size: 1.5em; margin-bottom: 10px; }
        .jg-rev-desc { font-family: 'Special Elite', cursive; color: #bbb; font-size: 0.9em; line-height: 1.6; }
        .jg-rev-fila { display: flex; justify-content: center; gap: 6px; margin: 18px 0 4px; font-size: 1.3em; }
        .jg-rev-fila span.bloqueada { filter: grayscale(1) brightness(0.25); }
        .jg-rev-contador { font-family: 'VT323', monospace; color: #777; letter-spacing: 2px; }
        .jg-rev-btn { width: 100%; margin-top: 18px; padding: 14px; background: #d4a574; border: none; border-radius: 8px; color: #0a0a0a; font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 0.72em; letter-spacing: 2px; cursor: pointer; }
        .jg-avisos { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 260; display: flex; flex-direction: column; gap: 8px; width: calc(100% - 32px); max-width: 360px; pointer-events: none; }
        .jg-aviso { display: flex; align-items: center; gap: 10px; background: #0d0d0d; border: 1.5px solid #39ff14; border-radius: 10px; padding: 10px 14px; box-shadow: 0 4px 20px rgba(57,255,20,0.25); animation: jg-aviso 4s ease forwards; }
        .jg-aviso .jg-ico { font-size: 1.6em; }
        .jg-aviso .jg-eti { font-family: 'VT323', monospace; color: #39ff14; font-size: 0.85em; letter-spacing: 2px; }
        .jg-aviso .jg-nom { font-family: 'Orbitron', sans-serif; color: #f0e6d3; font-size: 0.75em; letter-spacing: 1px; }
        @keyframes jg-aviso { 0% { opacity: 0; transform: translateY(-20px); } 10%, 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }
        .jg-btn-pista { display: block; width: 100%; margin-top: 14px; padding: 12px; background: transparent; border: 1.5px dashed #f5c842; border-radius: 8px; color: #f5c842; font-family: 'Orbitron', sans-serif; font-size: 0.68em; letter-spacing: 2px; cursor: pointer; }
        .jg-btn-pista:disabled { cursor: default; }
        .jg-pista-texto { font-family: 'VT323', monospace; color: #f5c842; text-align: center; margin-top: 10px; letter-spacing: 1px; }
        .btn-opcion.opcion-eliminada { opacity: 0.25 !important; text-decoration: line-through; pointer-events: none !important; }
        .rumbo-flecha.jg-alineada { color: #39ff14 !important; text-shadow: 0 0 12px rgba(57,255,20,0.8) !important; }
        .jg-resumen-final { margin: 10px 0 18px; text-align: left; }

        /* ===== Revisión de diseño y usabilidad ===== */
        :root { --st-gray: #8f8a82; --jg-texto-2: #c9c2b6; --jg-texto-3: #a39d93; --jg-rojo-texto: #ff4d58; }

        /* Radar: sin solapes con los botones flotantes, con scroll en pantallas pequeñas y círculo sin deformar */
        .pantalla-radar { justify-content: flex-start; overflow-y: auto; -webkit-overflow-scrolling: touch;
            padding-top: calc(68px + env(safe-area-inset-top)); padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
        .pantalla-radar > * { flex-shrink: 0; }
        .pantalla-radar > .header-mision { margin-top: auto; }
        .pantalla-radar > :last-child { margin-bottom: auto; }
        .radar-container { width: min(240px, 34vh); height: min(240px, 34vh); flex-shrink: 0; }
        .punto-objetivo { transition: left 0.6s ease, top 0.6s ease; }
        .rumbo-indicador { font-size: 1.35em; }
        .rumbo-flecha { font-size: 1.8em; }
        .valor-distancia { color: #fff; text-shadow: 0 0 2px var(--accent), 0 0 14px var(--accent-glow); }
        .numero-brecha, .subtitulo-objetivo, .etiqueta-distancia, .intensidad-label, .precision-gps, .mensaje-gps, .aviso-reanudar p, .hud-texto { font-size: 1.1rem; letter-spacing: 0.08em; }
        .precision-gps { color: var(--jg-texto-3); }
        .hud-texto { opacity: 1; }
        .btn-iniciar { min-height: 52px; }
        .btn-iniciar.jg-secundario { background: transparent; border: 1.5px solid #4a4a4a; color: var(--jg-texto-3); box-shadow: none; }
        .aviso-reanudar { margin: 14px 0 0; }
        .btn-reanudar-quiz { min-height: 48px; border-radius: 8px; font-size: 0.75em; }
        .jg-llegada-manual { display: none; margin-top: 14px; padding: 14px 18px; border: 1.5px dashed var(--st-green, #39ff14); border-radius: 10px; text-align: center; max-width: 340px; }
        .jg-llegada-manual.visible { display: block; }
        .jg-llegada-manual p { font-family: 'VT323', monospace; color: var(--jg-texto-2); font-size: 1.05rem; margin-bottom: 10px; }
        .jg-llegada-manual button { min-height: 48px; width: 100%; background: #39ff14; color: #0a0a0a; border: none; border-radius: 8px; font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 0.75em; letter-spacing: 1px; cursor: pointer; }

        /* Botones flotantes y zonas táctiles de al menos 44 px */
        .jg-btn-zurron, .btn-puntuacion-flotante { min-height: 44px; display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; font-size: 1.1rem; border-radius: 999px; }
        .jg-btn-zurron { top: calc(12px + env(safe-area-inset-top)); left: calc(16px + env(safe-area-inset-left)); }
        .btn-puntuacion-flotante { top: calc(12px + env(safe-area-inset-top)); right: calc(16px + env(safe-area-inset-right)); }
        .delta-puntos { top: calc(62px + env(safe-area-inset-top)); z-index: 205; }
        .jg-avisos { top: calc(12px + env(safe-area-inset-top)); }
        .hud-overlay { top: calc(56px + env(safe-area-inset-top)); }
        .btn-silenciar, .btn-repetir, .jg-btn-saltar { min-height: 44px; padding: 0 14px; }
        .narrativo-controles { gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .btn-salir, .jg-btn-pista, .jg-btn-cerrar, .btn-cerrar-puntuacion, .btn-cerrar-modal { min-height: 48px; }

        /* Visor: sin solapes y con la zona inferior segura */
        .btn-activar-camara { top: 66%; }
        .btn-resolver { bottom: calc(110px + env(safe-area-inset-bottom)); min-width: 70%; min-height: 60px; }
        .footer-info { bottom: calc(18px + env(safe-area-inset-bottom)); display: flex; justify-content: center; gap: 10px; width: calc(100% - 32px); }
        .footer-info button { white-space: nowrap; padding: 0 12px; letter-spacing: 0; flex: 0 1 auto; }
        .panel-narrativo { background: rgba(10,10,10,0.97); padding-bottom: calc(24px + env(safe-area-inset-bottom)); }
        .narrativo-texto { font-size: 1rem; color: var(--jg-texto-2); line-height: 1.65; }
        .jg-btn-saltar { background: #1a1a1a; border: 1px solid #4a4a4a; border-radius: 6px; color: var(--jg-texto-2); font-family: 'VT323', monospace; font-size: 0.95em; cursor: pointer; }
        .jg-btn-historia { display: none; background: transparent; border: 1px solid #4a4a4a; border-radius: 6px; color: var(--jg-texto-3); min-height: 48px; padding: 0 16px; font-family: 'VT323', monospace; font-size: 0.95em; cursor: pointer; }
        .jg-btn-historia.visible { display: block; }
        .video-camara { filter: contrast(1.5) brightness(0.35) sepia(0.7) hue-rotate(-15deg) saturate(5); }
        .visor-reves, .modal-quiz { animation: jg-entrada 0.7s ease-out; }
        @keyframes jg-entrada { from { opacity: 0; filter: brightness(3) blur(6px); } to { opacity: 1; filter: none; } }

        /* Quiz: lectura, respuesta visible al fallar y bonus de rapidez a la vista */
        .modal-quiz, .modal-puntuacion, .pantalla-verdad, .pantalla-puntuacion { padding-top: calc(20px + env(safe-area-inset-top)); padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
        .quiz-pregunta, .btn-opcion { font-size: 1rem; line-height: 1.6; }
        .btn-opcion { color: var(--jg-texto-2); min-height: 56px; }
        .btn-opcion.correcta::before { content: '✓ '; font-weight: bold; }
        .btn-opcion.incorrecta::before { content: '✗ '; font-weight: bold; }
        .modal-quiz.jg-sacudida { animation: jg-sacudir 0.45s ease; box-shadow: inset 0 0 90px rgba(228,9,20,0.55); }
        @keyframes jg-sacudir { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-10px); } 40% { transform: translateX(10px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
        .jg-bonus { font-family: 'VT323', monospace; font-size: 1.15rem; text-align: center; margin: -6px 0 12px; color: #f5c842; letter-spacing: 0.05em; }
        .jg-bonus.sin-bonus { color: var(--jg-texto-3); }
        .jg-btn-pista { font-size: 0.8125rem; letter-spacing: 0.08em; }
        .jg-btn-pista:disabled { opacity: 1; color: var(--jg-texto-3); border-color: #4a4a4a; }

        /* Éxito del portal: una cifra clara y el siguiente destino */
        .exito-puntos { font-size: 1.3em !important; }
        .jg-proximo { margin: 4px 0 14px; padding: 12px 16px; border: 1px solid #333; border-radius: 10px; background: #111; text-align: center; width: 100%; max-width: 360px; }
        .jg-proximo small { display: block; font-family: 'Orbitron', sans-serif; font-size: 0.7em; letter-spacing: 0.15em; color: var(--jg-texto-3); margin-bottom: 4px; }
        .jg-proximo strong { font-family: 'Special Elite', cursive; font-size: 1.15em; color: #f0e6d3; font-weight: normal; }
        .btn-siguiente, #pantallaExito .btn-finalizar { width: 100%; max-width: 360px; min-height: 56px; }

        /* Pantalla final: etiquetas legibles */
        .stat-label, .stat-box .stat-label, .puntuacion-label { font-size: 0.75rem; letter-spacing: 0.1em; color: var(--jg-texto-3); }
        .rango-titulo { font-size: 1.6em; }
        .btn-red { width: 52px; height: 52px; }
        .jg-btn-compartir { width: 100%; min-height: 56px; margin: 6px 0 4px; background: #39ff14; border: none; border-radius: 8px; color: #0a0a0a; font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 0.8em; letter-spacing: 1px; cursor: pointer; }

        /* Zurrón: legible, con cierre siempre visible y opción sin sustos */
        .jg-subtitulo { color: var(--jg-texto-3); letter-spacing: 1px; }
        .jg-seccion { font-size: 0.75rem; letter-spacing: 0.15em; }
        .jg-reliquia .jg-nom { font-size: 0.95em; }
        .jg-reliquia.bloqueada .jg-nom { color: #8f8a82; }
        .jg-logro .jg-des { color: var(--jg-texto-3); font-size: 1.05em; }
        .jg-logro.bloqueado { opacity: 1; }
        .jg-logro.bloqueado .jg-ico { opacity: 0.35; }
        .jg-logro.bloqueado .jg-nom { color: var(--jg-texto-3); }
        .jg-logro.bloqueado .jg-des { color: #8f8a82; }
        .jg-rev-contador, .jg-rev-desc { color: var(--jg-texto-2); }
        .jg-rev-btn { min-height: 52px; font-size: 0.8em; }
        .jg-x { position: sticky; top: 0; float: right; z-index: 2; width: 44px; height: 44px; margin: -8px -4px 0 0; background: #111; border: 1px solid #4a4a4a; border-radius: 50%; color: #f0e6d3; font-size: 1.2em; cursor: pointer; }
        .jg-ajuste { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: #111; border: 1px solid #333; border-radius: 10px; cursor: pointer; }
        .jg-ajuste span { font-family: 'Special Elite', cursive; color: var(--jg-texto-2); font-size: 0.95em; line-height: 1.4; }
        .jg-ajuste input { width: 24px; height: 24px; accent-color: #39ff14; flex-shrink: 0; }

        /* Accesibilidad: foco visible */
        :focus-visible { outline: 2px solid #f5c842; outline-offset: 3px; }
        .btn-opcion:focus-visible { outline-offset: -2px; }

        /* Modo sin sustos (manual) y movimiento reducido del sistema */
        .jg-sin-sustos .efecto-susto.activo { animation: none !important; opacity: 0 !important; }
        .jg-sin-sustos .video-camara { filter: contrast(1.5) brightness(0.35) sepia(0.7) hue-rotate(-15deg) saturate(5) !important; }
        @media (prefers-reduced-motion: reduce) {
            .efecto-susto.activo { animation: none !important; opacity: 0 !important; }
            .video-camara { filter: contrast(1.5) brightness(0.35) sepia(0.7) hue-rotate(-15deg) saturate(5) !important; }
            .numero-brecha, .hud-alerta, .texto-brecha, .buscar-mensaje, .radar-sweep, .radar-sweep-hex, .radar-sweep-final,
            .punto-objetivo, .brecha-icon.activa, .barra-energia-fill, .portal-visual, .buscar-indicador, .capa-esporas,
            .hero-badge, .hero h1, .hero-portales-count, .cta-comprar::after, .hero-scroll, body::after, .btn-instalar,
            .ruta-nodo.actual, .jg-rev-icono, .visor-reves, .modal-quiz, .modal-quiz.jg-sacudida { animation: none !important; }
            .jg-aviso { animation-name: jg-aviso-suave !important; }
            html { scroll-behavior: auto; }
        }
        @keyframes jg-aviso-suave { 0% { opacity: 0; } 10%, 85% { opacity: 1; } 100% { opacity: 0; } }
        `;
        const estilo = document.createElement('style');
        estilo.id = 'jg-estilos';
        estilo.textContent = css;
        document.head.appendChild(estilo);
    }

    // === ESTADÍSTICAS DE USO (anónimas) ===
    function obtenerSesion() {
        let id = leer('tragantia_sesion', '');
        if (!id) {
            id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            escribir('tragantia_sesion', id);
        }
        return id;
    }
    function tipoDispositivo() {
        const ua = navigator.userAgent || '';
        if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
        if (/Android/i.test(ua)) return 'android';
        return 'otro';
    }
    function esInstalada() {
        return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    }

    function evento(tipo, datos) {
        const registro = Object.assign({
            sesion: obtenerSesion(),
            ts: new Date().toISOString(),
            tipo: tipo,
            portal: portalActual,
            disp: tipoDispositivo(),
            app: esInstalada() ? 'instalada' : 'navegador',
            v: VERSION
        }, datos || {});
        const cola = leerJSON('tragantia_eventos_pendientes', []);
        cola.push(registro);
        while (cola.length > MAX_EVENTOS_COLA) cola.shift();
        escribir('tragantia_eventos_pendientes', JSON.stringify(cola));
        programarEnvio();
    }

    let temporizadorEnvio = null, enviando = false;
    function programarEnvio() {
        if (!ESTADISTICAS_URL) return;
        clearTimeout(temporizadorEnvio);
        temporizadorEnvio = setTimeout(enviarPendientes, 3000);
    }
    function enviarPendientes() {
        if (!ESTADISTICAS_URL || enviando || !navigator.onLine) return;
        const cola = leerJSON('tragantia_eventos_pendientes', []);
        if (!cola.length) return;
        const lote = cola.slice(0, 50);
        enviando = true;
        fetch(ESTADISTICAS_URL, {
            method: 'POST', mode: 'no-cors', keepalive: true,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(lote)
        }).then(() => {
            const actual = leerJSON('tragantia_eventos_pendientes', []);
            escribir('tragantia_eventos_pendientes', JSON.stringify(actual.slice(lote.length)));
            enviando = false;
            if (actual.length > lote.length) programarEnvio();
        }).catch(() => { enviando = false; });
    }
    function enviarAlSalir() {
        if (!ESTADISTICAS_URL || !navigator.sendBeacon) return;
        const cola = leerJSON('tragantia_eventos_pendientes', []);
        if (!cola.length) return;
        const lote = cola.slice(0, 50);
        const ok = navigator.sendBeacon(ESTADISTICAS_URL, new Blob([JSON.stringify(lote)], { type: 'text/plain;charset=utf-8' }));
        if (ok) escribir('tragantia_eventos_pendientes', JSON.stringify(cola.slice(lote.length)));
    }
    window.addEventListener('online', enviarPendientes);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviarAlSalir(); });

    // === LOGROS ===
    function logrosObtenidos() { return leerJSON('tragantia_logros', {}); }
    function desbloquearLogro(id) {
        const obtenidos = logrosObtenidos();
        if (obtenidos[id]) return;
        const logro = LOGROS.find(l => l.id === id);
        if (!logro) return;
        obtenidos[id] = Date.now();
        escribir('tragantia_logros', JSON.stringify(obtenidos));
        evento('logro', { logro: id });
        mostrarAviso(logro.icono, 'LOGRO DESBLOQUEADO', logro.nombre);
        vibrar([40, 30, 40]);
    }
    let siguienteAviso = 0;
    function mostrarAviso(icono, etiqueta, nombre) {
        if (!document.body) return;
        let contenedor = document.getElementById('jgAvisos');
        if (!contenedor) {
            contenedor = document.createElement('div');
            contenedor.id = 'jgAvisos';
            contenedor.className = 'jg-avisos';
            document.body.appendChild(contenedor);
        }
        // Escalonados: si se desbloquean varios a la vez, aparecen uno tras otro
        const ahora = Date.now();
        const retraso = Math.max(0, siguienteAviso - ahora);
        siguienteAviso = ahora + retraso + 1500;
        setTimeout(() => {
            const aviso = document.createElement('div');
            aviso.className = 'jg-aviso';
            aviso.innerHTML = '<span class="jg-ico">' + icono + '</span><div><div class="jg-eti">' + etiqueta + '</div><div class="jg-nom">' + nombre + '</div></div>';
            contenedor.appendChild(aviso);
            setTimeout(() => aviso.remove(), 4100);
        }, retraso);
    }

    // === RANGOS ===
    function puntosTotales() {
        return PORTALES.reduce((acc, p) => acc + (portalCompletado(p.num) ? leerNumero('tragantia_portal' + p.num + '_puntos') : 0), 0);
    }
    function calcularRango(puntos, completados) {
        completados = completados || portalesCompletados();
        const maximo = PORTALES.filter(p => completados.indexOf(p.num) !== -1)
            .reduce((acc, p) => acc + p.preguntas * 120 + 50, 0);
        const porcentaje = maximo > 0 ? puntos / maximo : 0;
        const rango = RANGOS.find(r => porcentaje >= r.minimo);
        return { titulo: rango.titulo, estrellas: rango.estrellas, porcentaje: porcentaje };
    }
    function htmlEstrellas(n) {
        let h = '';
        for (let i = 0; i < 5; i++) h += i < n ? '<b>★</b>' : '★';
        return h;
    }

    // === INVENTARIO (zurrón) ===
    function htmlReliquias() {
        return '<div class="jg-reliquias">' + PORTALES.map(p => {
            const ok = portalCompletado(p.num);
            return '<div class="jg-reliquia ' + (ok ? 'obtenida' : 'bloqueada') + '"><div class="jg-ico">' + p.reliquia.icono + '</div><div class="jg-nom">' + (ok ? p.reliquia.nombre : '???') + '</div></div>';
        }).join('') + '</div>';
    }
    function htmlLogros(soloObtenidos) {
        const obtenidos = logrosObtenidos();
        const lista = soloObtenidos ? LOGROS.filter(l => obtenidos[l.id]) : LOGROS;
        if (!lista.length) return '<p class="jg-subtitulo">Aún no has desbloqueado logros.</p>';
        return '<div class="jg-logros">' + lista.map(l => {
            const ok = !!obtenidos[l.id];
            return '<div class="jg-logro ' + (ok ? 'obtenido' : 'bloqueado') + '"><span class="jg-ico">' + l.icono + '</span><div><div class="jg-nom">' + l.nombre + '</div><div class="jg-des">' + l.descripcion + '</div></div></div>';
        }).join('') + '</div>';
    }
    function htmlRango() {
        const completados = portalesCompletados();
        if (!completados.length) return '<div class="jg-rango"><div class="jg-rango-nombre">Sin rango</div><div class="jg-subtitulo" style="margin:4px 0 0">Sella tu primer portal</div></div>';
        const r = calcularRango(puntosTotales(), completados);
        return '<div class="jg-rango"><div class="jg-rango-nombre">' + r.titulo + '</div><div class="jg-estrellas">' + htmlEstrellas(r.estrellas) + '</div></div>';
    }

    function abrirInventario() {
        inyectarEstilos();
        let capa = document.getElementById('jgInventario');
        if (!capa) {
            capa = document.createElement('div');
            capa.id = 'jgInventario';
            capa.className = 'jg-capa';
            capa.addEventListener('click', e => { if (e.target === capa) cerrarInventario(); });
            document.body.appendChild(capa);
        }
        const nLogros = Object.keys(logrosObtenidos()).length;
        capa.innerHTML = '<div class="jg-caja">' +
            '<button class="jg-x" onclick="Juego.cerrarInventario()" aria-label="Cerrar el zurrón">✕</button>' +
            '<h2 class="jg-titulo">🎒 Tu Zurrón</h2>' +
            '<p class="jg-subtitulo">RELIQUIAS ' + portalesCompletados().length + '/7 · LOGROS ' + nLogros + '/' + LOGROS.length + '</p>' +
            '<p class="jg-seccion">RANGO ACTUAL</p>' + htmlRango() +
            '<p class="jg-seccion">RELIQUIAS</p>' + htmlReliquias() +
            '<p class="jg-seccion">LOGROS</p>' + htmlLogros(false) +
            '<p class="jg-seccion">AJUSTES</p>' +
            '<label class="jg-ajuste"><span>Modo sin sustos: sin destellos ni sonidos de susto</span>' +
            '<input type="checkbox" id="jgSinSustos"' + (sinSustos() ? ' checked' : '') + '></label>' +
            '<button class="jg-btn-cerrar" onclick="Juego.cerrarInventario()">CERRAR</button></div>';
        capa.querySelector('#jgSinSustos').addEventListener('change', e => fijarSinSustos(e.target.checked));
        capa.classList.add('activa');
    }

    // === MODO SIN SUSTOS ===
    function sinSustos() { return leer('tragantia_sin_sustos', '') === 'true'; }
    function aplicarSinSustos() {
        const activo = sinSustos();
        document.documentElement.classList.toggle('jg-sin-sustos', activo);
        const audio = document.getElementById('audioSusto');
        if (audio) audio.muted = activo;
    }
    function fijarSinSustos(activo) {
        escribir('tragantia_sin_sustos', activo ? 'true' : 'false');
        aplicarSinSustos();
    }
    function cerrarInventario() {
        const capa = document.getElementById('jgInventario');
        if (capa) capa.classList.remove('activa');
    }
    function actualizarBotonZurron(latir) {
        const btn = document.getElementById('jgBtnZurron');
        if (!btn) return;
        btn.textContent = '🎒 ' + portalesCompletados().length + '/7';
        btn.setAttribute('aria-label', 'Zurrón: ' + portalesCompletados().length + ' de 7 reliquias');
        if (latir) { btn.classList.remove('jg-latido'); void btn.offsetWidth; btn.classList.add('jg-latido'); }
    }

    function mostrarRevelacionReliquia(num, alCerrar) {
        const portal = PORTALES[num - 1];
        let capa = document.getElementById('jgRevelacion');
        if (!capa) {
            capa = document.createElement('div');
            capa.id = 'jgRevelacion';
            capa.className = 'jg-revelacion';
            document.body.appendChild(capa);
        }
        const fila = PORTALES.map(p => '<span class="' + (portalCompletado(p.num) ? '' : 'bloqueada') + '">' + p.reliquia.icono + '</span>').join('');
        capa.innerHTML = '<div class="jg-rev-caja">' +
            '<p class="jg-rev-sub">◈ RELIQUIA OBTENIDA ◈</p>' +
            '<div class="jg-rev-icono">' + portal.reliquia.icono + '</div>' +
            '<h3 class="jg-rev-nombre">' + portal.reliquia.nombre + '</h3>' +
            '<p class="jg-rev-desc">' + portal.reliquia.descripcion + '</p>' +
            '<div class="jg-rev-fila">' + fila + '</div>' +
            '<p class="jg-rev-contador">' + portalesCompletados().length + '/7 RELIQUIAS</p>' +
            '<button class="jg-rev-btn">GUARDAR EN EL ZURRÓN</button></div>';
        capa.querySelector('.jg-rev-btn').addEventListener('click', () => {
            capa.classList.remove('activa');
            actualizarBotonZurron(true);
            if (alCerrar) alCerrar();
        });
        capa.classList.add('activa');
        vibrar([60, 40, 60, 40, 160]);
    }

    // === FASES DEL PORTAL (guardado dentro del portal) ===
    function obtenerFase() { return leer(clavePortal('fase'), ''); }
    function guardarFase(fase) {
        const orden = ['', 'llegada', 'narrativa'];
        if (orden.indexOf(fase) > orden.indexOf(obtenerFase())) escribir(clavePortal('fase'), fase);
    }

    function iniciarBusqueda() {
        escribir(clavePortal('busqueda'), Date.now().toString());
        evento('busqueda_inicio');
    }

    // El GPS en calles estrechas falla 15-30 m: se amplía el radio con la precisión (máx. +15 m).
    function radioEfectivo(radio, precision) {
        return radio + Math.min(Math.max(precision || 0, 0), 15);
    }

    // Si el jugador lleva 20 s a menos de 40 m sin que el GPS lo detecte, se le ofrece entrar a mano.
    let cercaDesde = null;
    function vigilarLlegada(distancia, alConfirmar) {
        const caja = asegurarLlegadaManual(alConfirmar);
        if (!caja) return;
        if (distancia > 40) { cercaDesde = null; return; }
        if (cercaDesde === null) cercaDesde = Date.now();
        if (Date.now() - cercaDesde > 20000 && !caja.classList.contains('visible')) {
            caja.classList.add('visible');
            vibrar(40);
        }
    }
    function asegurarLlegadaManual(alConfirmar) {
        let caja = document.getElementById('jgLlegadaManual');
        if (caja) return caja;
        const ancla = document.getElementById('mensajeGps');
        if (!ancla) return null;
        caja = document.createElement('div');
        caja.id = 'jgLlegadaManual';
        caja.className = 'jg-llegada-manual';
        caja.innerHTML = '<p>¿Ya estás en el lugar y el radar no te detecta? El GPS falla entre edificios.</p><button type="button">📍 ESTOY FRENTE AL PORTAL</button>';
        caja.querySelector('button').addEventListener('click', () => {
            caja.classList.remove('visible');
            evento('llegada_manual');
            alConfirmar();
        });
        ancla.insertAdjacentElement('afterend', caja);
        return caja;
    }

    function marcarLlegada() {
        const caja = document.getElementById('jgLlegadaManual');
        if (caja) caja.classList.remove('visible');
        if (obtenerFase()) return;
        guardarFase('llegada');
        const inicio = parseInt(leer(clavePortal('busqueda'), '0'), 10);
        const segundos = inicio ? Math.round((Date.now() - inicio) / 1000) : null;
        evento('llegada', { segundos: segundos });
        if (segundos !== null && segundos < 180) desbloquearLogro('rastreador');
    }

    // Muestra el aviso de reanudación del portal si hay algo guardado.
    // alReanudarQuiz: continúa el quiz; alEntrarPortal: entra al visor sin GPS.
    function prepararReanudacion(totalPreguntas, alReanudarQuiz, alEntrarPortal) {
        const aviso = document.getElementById('avisoReanudar');
        if (!aviso || portalCompletado(portalActual)) return;
        const texto = aviso.querySelector('p');
        const boton = aviso.querySelector('button');
        const quiz = leerJSON(clavePortal('quiz'), null);
        const fase = obtenerFase();
        if (quiz) {
            const n = (quiz.preguntaActual || 0) + 1;
            texto.textContent = n > totalPreguntas
                ? '◈ RITUAL COMPLETADO · FALTA SELLAR EL PORTAL'
                : '◈ RITUAL INTERRUMPIDO · PREGUNTA ' + n + '/' + totalPreguntas + ' · ' + (quiz.puntuacionTotal || 0) + ' PTS';
            boton.textContent = 'Continuar donde lo dejaste';
            boton.onclick = () => { evento('reanudacion', { fase: 'quiz', pregunta: quiz.preguntaActual || 0 }); alReanudarQuiz(); };
        } else if (fase && alEntrarPortal) {
            texto.textContent = fase === 'narrativa'
                ? '◈ YA ESCUCHASTE LA HISTORIA DE ESTE PORTAL'
                : '◈ YA LLEGASTE A ESTE PORTAL';
            boton.textContent = 'Entrar sin volver a buscar';
            boton.onclick = () => { aviso.style.display = 'none'; evento('reanudacion', { fase: fase }); alEntrarPortal(fase); };
        } else {
            return;
        }
        const btnIniciar = document.getElementById('btnIniciar');
        if (btnIniciar) {
            btnIniciar.parentNode.insertBefore(aviso, btnIniciar);
            btnIniciar.classList.add('jg-secundario');
        }
        aviso.style.display = 'block';
    }

    // === PISTAS ===
    // Añade el botón de pista debajo de las opciones. alUsar(coste) descuenta
    // los puntos en el portal; si devuelve false o 'sin_puntos', no se aplica.
    function prepararPista(indicePregunta, pregunta, contenedor, alUsar) {
        const opciones = contenedor.querySelector('.quiz-opciones');
        if (!opciones) return;
        const clave = clavePortal('pista');
        const guardada = leerJSON(clave, null);
        if (guardada && guardada.pregunta !== indicePregunta) borrar(clave);
        const botones = opciones.querySelectorAll('.btn-opcion');

        const btn = document.createElement('button');
        btn.className = 'jg-btn-pista';
        btn.type = 'button';
        const textoBoton = '💡 PISTA · ELIMINA UNA OPCIÓN (-' + COSTE_PISTA + ' PTS)';
        btn.textContent = textoBoton;
        opciones.insertAdjacentElement('afterend', btn);

        function eliminar(indice) {
            if (botones[indice]) botones[indice].classList.add('opcion-eliminada');
            btn.disabled = true;
            btn.textContent = '💡 PISTA USADA';
        }
        iniciarIndicadorBonus(contenedor);
        if (guardada && guardada.pregunta === indicePregunta) { eliminar(guardada.eliminada); return; }

        btn.addEventListener('click', () => {
            const incorrectas = [];
            botones.forEach((b, i) => { if (i !== pregunta.correcta && !b.classList.contains('opcion-eliminada')) incorrectas.push(i); });
            if (!incorrectas.length) { btn.disabled = true; btn.textContent = '💡 YA SOLO QUEDA LA CORRECTA'; return; }
            const resultado = alUsar(COSTE_PISTA);
            if (resultado === 'sin_puntos') {
                btn.textContent = '💡 ACIERTA UNA PREGUNTA PARA DESBLOQUEAR PISTAS';
                setTimeout(() => { if (!btn.disabled) btn.textContent = textoBoton; }, 2500);
                return;
            }
            if (resultado === false) return;
            const indice = incorrectas[Math.floor(Math.random() * incorrectas.length)];
            eliminar(indice);
            escribir(clave, JSON.stringify({ pregunta: indicePregunta, eliminada: indice }));
            escribir('tragantia_pistas_total', (leerNumero('tragantia_pistas_total') + 1).toString());
            escribir(clavePortal('pistas'), (leerNumero(clavePortal('pistas')) + 1).toString());
            evento('pista', { pregunta: indicePregunta });
            vibrar(30);
        });
    }

    // === RESPUESTAS ===
    function registrarRespuesta(indicePregunta, correcta, segundos) {
        if (preguntaDeFallos !== indicePregunta) { preguntaDeFallos = indicePregunta; fallosPreguntaActual = 0; }
        evento('respuesta', { pregunta: indicePregunta, correcta: correcta, segundos: Math.round(segundos) });
        if (!correcta) {
            fallosPreguntaActual++;
            escribir('tragantia_racha', '0');
            const quiz = document.getElementById('modalQuiz');
            if (quiz) {
                quiz.classList.remove('jg-sacudida'); void quiz.offsetWidth; quiz.classList.add('jg-sacudida');
                setTimeout(() => quiz.classList.remove('jg-sacudida'), 500);
            }
            const fallada = document.querySelector('.btn-opcion.incorrecta');
            if (fallada) setTimeout(() => fallada.classList.add('opcion-eliminada'), 1050);
            return;
        }
        if (segundos < 10) desbloquearLogro('relampago');
        if (fallosPreguntaActual >= 2) desbloquearLogro('cabezota');
        if (fallosPreguntaActual === 0) {
            const racha = leerNumero('tragantia_racha') + 1;
            escribir('tragantia_racha', racha.toString());
            if (racha >= 5) desbloquearLogro('racha');
        }
        fallosPreguntaActual = 0;
    }

    // Muestra bajo el cronómetro cuánto bonus de rapidez queda en la pregunta actual.
    let intervaloBonus = null;
    function iniciarIndicadorBonus(contenedor) {
        let indicador = document.getElementById('jgBonus');
        if (!indicador) {
            const reloj = document.getElementById('quizTimer');
            if (!reloj) return;
            indicador = document.createElement('div');
            indicador.id = 'jgBonus';
            indicador.className = 'jg-bonus';
            indicador.setAttribute('aria-live', 'off');
            reloj.insertAdjacentElement('afterend', indicador);
        }
        const inicio = Date.now();
        const tramos = [[15, 20], [30, 15], [60, 10], [120, 5]];
        const pintar = () => {
            if (!contenedor.isConnected || contenedor.style.display === 'none') { clearInterval(intervaloBonus); return; }
            const s = (Date.now() - inicio) / 1000;
            const tramo = tramos.find(x => s < x[0]);
            indicador.classList.toggle('sin-bonus', !tramo);
            indicador.textContent = tramo ? '⚡ Bonus rapidez +' + tramo[1] + ' · ' + Math.ceil(tramo[0] - s) + ' s' : 'Sin bonus de rapidez';
        };
        clearInterval(intervaloBonus);
        pintar();
        intervaloBonus = setInterval(pintar, 500);
    }

    const erroresGpsRegistrados = new Set();
    function registrarErrorGps(codigo) {
        if (erroresGpsRegistrados.has(codigo)) return;
        erroresGpsRegistrados.add(codigo);
        evento('error_gps', { codigo: codigo });
    }

    // === PORTAL COMPLETADO ===
    // datos: { puntos, correctas, incorrectas, segundos }
    function completarPortal(datos, alCerrarReliquia) {
        escribir(clavePortal('correctas'), String(datos.correctas || 0));
        escribir(clavePortal('incorrectas'), String(datos.incorrectas || 0));
        borrar(clavePortal('fase'));
        borrar(clavePortal('pista'));
        borrar(clavePortal('busqueda'));
        evento('portal_completado', {
            puntos: datos.puntos, segundos: datos.segundos,
            correctas: datos.correctas, incorrectas: datos.incorrectas,
            pistas: leerNumero(clavePortal('pistas'))
        });
        const hora = new Date().getHours();
        desbloquearLogro('primer_sello');
        if (!datos.incorrectas) desbloquearLogro('impecable');
        if (hora >= 21 || hora < 6) desbloquearLogro('nocturno');
        if (portalesCompletados().length === 7) desbloquearLogro('coleccionista');
        clearInterval(intervaloBonus);
        prepararPantallaExito();
        setTimeout(() => mostrarRevelacionReliquia(portalActual, alCerrarReliquia), 1500);
        actualizarBotonZurron(false);
    }

    function prepararPantallaExito() {
        const cabecera = document.querySelector('#modalQuiz .quiz-header');
        if (cabecera) cabecera.style.display = 'none';
        const exito = document.getElementById('pantallaExito');
        const siguiente = PORTALES[portalActual];
        if (!exito || !siguiente) return;
        const boton = exito.querySelector('[onclick*="siguientePunto"]');
        if (!boton || document.getElementById('jgProximo')) return;
        const proximo = document.createElement('div');
        proximo.id = 'jgProximo';
        proximo.className = 'jg-proximo';
        proximo.innerHTML = '<small>PRÓXIMO PORTAL · ' + siguiente.num + '/7</small><strong>' + siguiente.nombre + '</strong>';
        boton.parentNode.insertBefore(proximo, boton);
        boton.textContent = 'Ir al portal ' + siguiente.num + ' →';
        exito.scrollIntoView({ block: 'start' });
    }

    // === FIN DE LA MISIÓN (portal 7) ===
    function finalizarMision(totales) {
        if (leerNumero('tragantia_pistas_total') === 0) desbloquearLogro('sin_pistas');
        if (!totales.incorrectas) desbloquearLogro('perfecto');
        const rango = calcularRango(totales.puntos);
        evento('partida_completada', {
            puntos: totales.puntos, correctas: totales.correctas, incorrectas: totales.incorrectas,
            pistas: leerNumero('tragantia_pistas_total'), rango: rango.titulo,
            logros: Object.keys(logrosObtenidos()).length, segundos: tiempoMisionSegundos()
        });
        return rango;
    }

    // Tiempo real desde que se validó el código; si no consta, suma de los quizzes.
    function tiempoMisionSegundos() {
        const inicio = parseInt(leer('tragantia_inicio_partida', '0'), 10);
        if (inicio && Date.now() - inicio < 2 * 24 * 3600 * 1000) return Math.round((Date.now() - inicio) / 1000);
        return PORTALES.reduce((acc, p) => acc + tiempoASegundos(leer('tragantia_portal' + p.num + '_tiempo', '')), 0);
    }

    function pintarResumenFinal(contenedor) {
        if (!contenedor) return;
        contenedor.className = 'jg-resumen-final';
        contenedor.innerHTML =
            '<p class="jg-seccion">RELIQUIAS REUNIDAS</p>' + htmlReliquias() +
            '<p class="jg-seccion">LOGROS · ' + Object.keys(logrosObtenidos()).length + '/' + LOGROS.length + '</p>' + htmlLogros(true);
    }

    // === NUEVA PARTIDA (index.html, al validar el código) ===
    function nuevaPartida() {
        const conservar = ['tragantia_eventos_pendientes', 'tragantia_auth', 'tragantia_sin_sustos'];
        const claves = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.indexOf('tragantia_') === 0 && conservar.indexOf(k) === -1) claves.push(k);
            }
        } catch (e) {}
        claves.forEach(borrar);
        escribir('tragantia_inicio_partida', Date.now().toString());
        evento('partida_inicio');
    }

    // === BRÚJULA REAL ===
    // La flecha apunta al portal según hacia dónde mira el móvil
    // (DeviceOrientation). Sin sensor, apunta respecto al norte.
    const brujula = (function () {
        let rumbo = null, orientacion = null, anguloMostrado = null, pintadoPendiente = false, estabaAlineada = false, escuchando = false;
        const cardinales = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
        const norm180 = a => ((a % 360) + 540) % 360 - 180;

        function alOrientar(e) {
            let h = null;
            if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
            else if (e.absolute && typeof e.alpha === 'number') h = 360 - e.alpha;
            if (h === null) return;
            const angPantalla = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
            h = (h + angPantalla + 360) % 360;
            orientacion = orientacion === null ? h : (orientacion + norm180(h - orientacion) * 0.3 + 360) % 360;
            programarPintado();
        }
        function escuchar() {
            if (escuchando) return;
            escuchando = true;
            if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', alOrientar, true);
            else window.addEventListener('deviceorientation', alOrientar, true);
        }
        // Debe llamarse dentro de un gesto del usuario (iOS pide permiso).
        function activar() {
            if (typeof DeviceOrientationEvent === 'undefined') return;
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') escuchar(); }).catch(() => {});
            } else {
                escuchar();
            }
        }
        function fijarRumbo(nuevoRumbo, distancia) {
            rumbo = nuevoRumbo;
            colocarPuntoRadar(nuevoRumbo, distancia);
            programarPintado();
        }
        function colocarPuntoRadar(r, distancia) {
            const punto = document.getElementById('puntoObjetivo');
            if (!punto || typeof distancia !== 'number') return;
            const radio = Math.min(distancia / 300, 1) * 42;
            const ang = (r - 90) * Math.PI / 180;
            punto.style.left = (50 + Math.cos(ang) * radio) + '%';
            punto.style.top = (50 + Math.sin(ang) * radio) + '%';
        }
        function programarPintado() {
            if (pintadoPendiente) return;
            pintadoPendiente = true;
            requestAnimationFrame(() => { pintadoPendiente = false; pintar(); });
        }
        function pintar() {
            const flecha = document.getElementById('rumboFlecha');
            const texto = document.getElementById('rumboTexto');
            if (!flecha || !texto || rumbo === null) return;
            let objetivo, etiqueta, alineada = false;
            if (orientacion !== null) {
                const relativo = norm180(rumbo - orientacion);
                alineada = Math.abs(relativo) <= 20;
                objetivo = relativo - 90;
                etiqueta = alineada ? 'DE FRENTE' : (relativo > 0 ? 'GIRA DERECHA ' : 'GIRA IZQUIERDA ') + Math.round(Math.abs(relativo)) + '°';
                flecha.style.transition = 'transform 0.15s linear';
            } else {
                objetivo = rumbo - 90;
                etiqueta = cardinales[Math.round(rumbo / 45) % 8] + ' ' + Math.round(rumbo) + '°';
            }
            anguloMostrado = anguloMostrado === null ? objetivo : anguloMostrado + norm180(objetivo - anguloMostrado);
            flecha.style.transform = 'rotate(' + anguloMostrado + 'deg)';
            flecha.classList.toggle('jg-alineada', alineada);
            texto.textContent = etiqueta;
            if (alineada && !estabaAlineada) vibrar(25);
            estabaAlineada = alineada;
        }
        return { activar: activar, fijarRumbo: fijarRumbo };
    })();

    function prepararPortal(num) {
        aplicarSinSustos();

        // Contador del HUD: siempre 7 brechas, marcando las selladas y la actual
        document.querySelectorAll('.contador-brechas').forEach(c => {
            c.innerHTML = PORTALES.map(p => '<div class="brecha-icon' + (portalCompletado(p.num) ? ' sellada' : (p.num === num ? ' activa' : '')) + '"></div>').join('');
        });

        // Saltar la narración y volver a escucharla cuando el panel ya se ha cerrado
        const controles = document.querySelector('.narrativo-controles');
        if (controles && typeof window.saltarNarracion === 'function') {
            const saltar = document.createElement('button');
            saltar.type = 'button';
            saltar.className = 'jg-btn-saltar';
            saltar.textContent = 'Saltar ▸';
            saltar.addEventListener('click', () => window.saltarNarracion());
            controles.appendChild(saltar);
        }
        const pie = document.querySelector('.footer-info');
        const panel = document.getElementById('panelNarrativo');
        if (pie && panel && typeof window.repetirNarracion === 'function') {
            const historia = document.createElement('button');
            historia.type = 'button';
            historia.className = 'jg-btn-historia';
            historia.textContent = '🔄 Historia';
            historia.addEventListener('click', () => window.repetirNarracion());
            pie.prepend(historia);
            const sincronizar = () => historia.classList.toggle('visible', !panel.classList.contains('activo') && document.getElementById('btnResolver').style.display === 'block');
            new MutationObserver(sincronizar).observe(panel, { attributes: true, attributeFilter: ['class'] });
            const resolver = document.getElementById('btnResolver');
            if (resolver) new MutationObserver(sincronizar).observe(resolver, { attributes: true, attributeFilter: ['style'] });
        }

        // Nombres accesibles para botones que solo tienen emoji
        const etiquetas = { compartirWhatsApp: 'Compartir en WhatsApp', compartirTwitter: 'Compartir en X', compartirFacebook: 'Compartir en Facebook', copiarEnlace: 'Copiar enlace' };
        document.querySelectorAll('.btn-red').forEach(b => {
            const accion = Object.keys(etiquetas).find(k => (b.getAttribute('onclick') || '').indexOf(k) === 0);
            if (accion) b.setAttribute('aria-label', etiquetas[accion]);
        });
        const puntos = document.getElementById('quizPuntos');
        if (puntos) puntos.setAttribute('aria-live', 'polite');
    }

    // === INICIO EN CADA PORTAL ===
    function iniciarPortal(num) {
        portalActual = num;
        inyectarEstilos();
        const crearBoton = () => {
            if (document.getElementById('jgBtnZurron')) return;
            const btn = document.createElement('button');
            btn.id = 'jgBtnZurron';
            btn.className = 'jg-btn-zurron';
            btn.addEventListener('click', abrirInventario);
            document.body.appendChild(btn);
            actualizarBotonZurron(false);
            prepararPortal(num);
        };
        if (document.body) crearBoton(); else document.addEventListener('DOMContentLoaded', crearBoton);
    }

    inyectarEstilos();
    setTimeout(enviarPendientes, 2000);

    window.Juego = {
        PORTALES: PORTALES,
        LOGROS: LOGROS,
        iniciarPortal: iniciarPortal,
        evento: evento,
        brujula: brujula,
        iniciarBusqueda: iniciarBusqueda,
        radioEfectivo: radioEfectivo,
        vigilarLlegada: vigilarLlegada,
        fijarSinSustos: fijarSinSustos,
        marcarLlegada: marcarLlegada,
        guardarFase: guardarFase,
        obtenerFase: obtenerFase,
        prepararReanudacion: prepararReanudacion,
        prepararPista: prepararPista,
        registrarRespuesta: registrarRespuesta,
        registrarErrorGps: registrarErrorGps,
        completarPortal: completarPortal,
        finalizarMision: finalizarMision,
        calcularRango: calcularRango,
        htmlEstrellas: htmlEstrellas,
        htmlReliquias: htmlReliquias,
        pintarResumenFinal: pintarResumenFinal,
        abrirInventario: abrirInventario,
        cerrarInventario: cerrarInventario,
        logrosObtenidos: logrosObtenidos,
        portalesCompletados: portalesCompletados,
        puntosTotales: puntosTotales,
        tiempoMisionSegundos: tiempoMisionSegundos,
        formatearTiempo: formatearTiempo,
        tiempoASegundos: tiempoASegundos,
        nuevaPartida: nuevaPartida
    };
})();
