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
        .hud-overlay { top: 44px; }
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
        .jg-btn-pista:disabled { opacity: 0.35; cursor: default; }
        .jg-pista-texto { font-family: 'VT323', monospace; color: #f5c842; text-align: center; margin-top: 10px; letter-spacing: 1px; }
        .btn-opcion.opcion-eliminada { opacity: 0.25 !important; text-decoration: line-through; pointer-events: none !important; }
        .rumbo-flecha.jg-alineada { color: #39ff14 !important; text-shadow: 0 0 12px rgba(57,255,20,0.8) !important; }
        .jg-resumen-final { margin: 10px 0 18px; text-align: left; }
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
            '<h2 class="jg-titulo">🎒 Tu Zurrón</h2>' +
            '<p class="jg-subtitulo">RELIQUIAS ' + portalesCompletados().length + '/7 · LOGROS ' + nLogros + '/' + LOGROS.length + '</p>' +
            '<p class="jg-seccion">RANGO ACTUAL</p>' + htmlRango() +
            '<p class="jg-seccion">RELIQUIAS</p>' + htmlReliquias() +
            '<p class="jg-seccion">LOGROS</p>' + htmlLogros(false) +
            '<button class="jg-btn-cerrar" onclick="Juego.cerrarInventario()">CERRAR</button></div>';
        capa.classList.add('activa');
    }
    function cerrarInventario() {
        const capa = document.getElementById('jgInventario');
        if (capa) capa.classList.remove('activa');
    }
    function actualizarBotonZurron(latir) {
        const btn = document.getElementById('jgBtnZurron');
        if (!btn) return;
        btn.textContent = '🎒 ' + portalesCompletados().length + '/7';
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

    function marcarLlegada() {
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
        if (guardada && guardada.pregunta === indicePregunta) { eliminar(guardada.eliminada); return; }

        btn.addEventListener('click', () => {
            const incorrectas = [];
            botones.forEach((b, i) => { if (i !== pregunta.correcta) incorrectas.push(i); });
            if (!incorrectas.length) return;
            const resultado = alUsar(COSTE_PISTA);
            if (resultado === 'sin_puntos') {
                btn.textContent = '💡 NECESITAS ' + COSTE_PISTA + ' PTS EN ESTE PORTAL';
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
        mostrarRevelacionReliquia(portalActual, alCerrarReliquia);
        actualizarBotonZurron(false);
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
        const conservar = ['tragantia_eventos_pendientes', 'tragantia_auth'];
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
        function fijarRumbo(nuevoRumbo) { rumbo = nuevoRumbo; programarPintado(); }
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
