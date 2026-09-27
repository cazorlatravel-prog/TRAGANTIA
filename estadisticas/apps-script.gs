// ============================================================
// Receptor de estadísticas de La Tragantía (Google Apps Script)
// Guarda cada evento del juego como una fila en la hoja "Eventos"
// y genera un resumen en la hoja "Resumen".
// Instrucciones de instalación: estadisticas/LEEME.md
// ============================================================

const HOJA_EVENTOS = 'Eventos';
const HOJA_RESUMEN = 'Resumen';
const COLUMNAS = ['recibido', 'fecha', 'sesion', 'tipo', 'portal', 'pregunta', 'correcta', 'segundos',
                  'puntos', 'incorrectas', 'pistas', 'rango', 'fase', 'codigo', 'logro', 'dispositivo', 'app', 'version'];

const NOMBRES_PORTALES = ['', 'Plaza Corredera', 'Convento Merced', 'Balcón Zabaleta', 'Puerta Deseos',
                          'Plaza Sta. María', 'Molino Harinero', 'Castillo'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const eventos = JSON.parse(e.postData.contents);
    const lista = Array.isArray(eventos) ? eventos : [eventos];
    const hoja = obtenerHojaEventos();
    const ahora = new Date();
    const filas = lista.slice(0, 100).map(ev => [
      ahora, ev.ts || '', ev.sesion || '', ev.tipo || '', ev.portal || '',
      ev.pregunta === undefined ? '' : Number(ev.pregunta) + 1,
      ev.correcta === undefined ? '' : (ev.correcta ? 'sí' : 'no'),
      ev.segundos === undefined || ev.segundos === null ? '' : ev.segundos,
      ev.puntos === undefined ? '' : ev.puntos,
      ev.incorrectas === undefined ? '' : ev.incorrectas,
      ev.pistas === undefined ? '' : ev.pistas,
      ev.rango || '', ev.fase || '', ev.codigo || '', ev.logro || '',
      ev.disp || '', ev.app || '', ev.v || ''
    ]);
    if (filas.length) hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, COLUMNAS.length).setValues(filas);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error');
  } finally {
    lock.releaseLock();
  }
}

// Permite comprobar desde el navegador que la URL funciona
function doGet() {
  return ContentService.createTextOutput('Receptor de estadísticas de La Tragantía activo');
}

function obtenerHojaEventos() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(HOJA_EVENTOS);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA_EVENTOS);
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

// Ejecútalo a mano (o con un activador diario) para regenerar la hoja "Resumen".
function generarResumen() {
  const datos = obtenerHojaEventos().getDataRange().getValues();
  const cab = datos.shift();
  const col = nombre => cab.indexOf(nombre);
  const C = { sesion: col('sesion'), tipo: col('tipo'), portal: col('portal'), pregunta: col('pregunta'),
              correcta: col('correcta'), segundos: col('segundos'), puntos: col('puntos'), rango: col('rango'),
              dispositivo: col('dispositivo'), logro: col('logro') };

  const sesionesIniciadas = new Set(), sesionesCompletadas = new Set();
  const ultimoPortalSesion = {};
  const busqueda = {}, llegadasPorPortal = {}, completadosPorPortal = {}, pistasPorPortal = {};
  const preguntas = {}, rangos = {}, dispositivos = {}, logros = {}, erroresGps = {};
  let puntosFinales = [];

  datos.forEach(f => {
    const tipo = f[C.tipo], portal = f[C.portal], sesion = f[C.sesion];
    if (sesion && portal) ultimoPortalSesion[sesion] = Math.max(ultimoPortalSesion[sesion] || 0, Number(portal));
    if (tipo === 'partida_inicio') { sesionesIniciadas.add(sesion); dispositivos[f[C.dispositivo]] = (dispositivos[f[C.dispositivo]] || 0) + 1; }
    if (tipo === 'partida_completada') { sesionesCompletadas.add(sesion); puntosFinales.push(Number(f[C.puntos]) || 0); rangos[f[C.rango]] = (rangos[f[C.rango]] || 0) + 1; }
    if (tipo === 'llegada') {
      llegadasPorPortal[portal] = (llegadasPorPortal[portal] || 0) + 1;
      if (f[C.segundos] !== '') (busqueda[portal] = busqueda[portal] || []).push(Number(f[C.segundos]));
    }
    if (tipo === 'portal_completado') completadosPorPortal[portal] = (completadosPorPortal[portal] || 0) + 1;
    if (tipo === 'pista') pistasPorPortal[portal] = (pistasPorPortal[portal] || 0) + 1;
    if (tipo === 'error_gps') erroresGps[portal] = (erroresGps[portal] || 0) + 1;
    if (tipo === 'logro') logros[f[C.logro]] = (logros[f[C.logro]] || 0) + 1;
    if (tipo === 'respuesta') {
      const clave = portal + '-' + f[C.pregunta];
      const p = preguntas[clave] = preguntas[clave] || { portal: portal, pregunta: f[C.pregunta], intentos: 0, fallos: 0, tiempos: [] };
      p.intentos++;
      if (f[C.correcta] === 'no') p.fallos++; else p.tiempos.push(Number(f[C.segundos]) || 0);
    }
  });

  const media = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : '';
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(HOJA_RESUMEN) || libro.insertSheet(HOJA_RESUMEN);
  hoja.clear();
  const filas = [];
  const titulo = t => { filas.push(['']); filas.push([t]); };

  filas.push(['RESUMEN DE LA TRAGANTÍA', 'Actualizado: ' + new Date().toLocaleString('es-ES')]);
  titulo('PARTIDAS');
  filas.push(['Partidas iniciadas', sesionesIniciadas.size]);
  filas.push(['Partidas completadas', sesionesCompletadas.size]);
  filas.push(['Tasa de finalización', sesionesIniciadas.size ? Math.round(sesionesCompletadas.size / sesionesIniciadas.size * 100) + '%' : '']);
  filas.push(['Puntuación media final', media(puntosFinales)]);

  titulo('EMBUDO POR PORTAL (dónde se queda la gente)');
  filas.push(['Portal', 'Llegadas', 'Completados', 'Búsqueda media (min)', 'Pistas usadas', 'Errores GPS']);
  for (let n = 1; n <= 7; n++) {
    filas.push([n + '. ' + NOMBRES_PORTALES[n], llegadasPorPortal[n] || 0, completadosPorPortal[n] || 0,
                busqueda[n] ? Math.round(media(busqueda[n]) / 6) / 10 : '', pistasPorPortal[n] || 0, erroresGps[n] || 0]);
  }
  const abandonos = {};
  Object.keys(ultimoPortalSesion).forEach(s => {
    if (!sesionesCompletadas.has(s) && ultimoPortalSesion[s]) abandonos[ultimoPortalSesion[s]] = (abandonos[ultimoPortalSesion[s]] || 0) + 1;
  });
  filas.push(['Partidas sin terminar, por último portal alcanzado:', Object.keys(abandonos).map(k => 'P' + k + ': ' + abandonos[k]).join(' · ')]);

  titulo('PREGUNTAS MÁS DIFÍCILES (más fallos por intento)');
  filas.push(['Portal', 'Pregunta', 'Intentos', 'Fallos', '% fallo', 'Segundos medios al acertar']);
  Object.keys(preguntas).map(k => preguntas[k])
    .sort((a, b) => (b.fallos / b.intentos) - (a.fallos / a.intentos))
    .forEach(p => filas.push([NOMBRES_PORTALES[p.portal] || p.portal, p.pregunta, p.intentos, p.fallos,
                               Math.round(p.fallos / p.intentos * 100) + '%', media(p.tiempos)]));

  titulo('RANGOS FINALES');
  Object.keys(rangos).forEach(r => filas.push([r, rangos[r]]));
  titulo('LOGROS DESBLOQUEADOS');
  Object.keys(logros).forEach(l => filas.push([l, logros[l]]));
  titulo('DISPOSITIVOS');
  Object.keys(dispositivos).forEach(d => filas.push([d, dispositivos[d]]));

  const ancho = Math.max.apply(null, filas.map(f => f.length));
  hoja.getRange(1, 1, filas.length, ancho).setValues(filas.map(f => f.concat(new Array(ancho - f.length).fill(''))));
  hoja.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  hoja.autoResizeColumns(1, ancho);
}
