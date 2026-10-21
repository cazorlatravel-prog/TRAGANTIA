# Estadísticas de uso de La Tragantía

El juego registra eventos anónimos (sin nombres, correos ni ubicaciones) y los envía a una
**Hoja de cálculo de Google**. No hace falta servidor ni pagar nada.

Mientras no configures la URL, el juego guarda los eventos en cola en el propio móvil
(máximo 300) y los enviará en cuanto la URL exista y haya conexión.

## Qué se registra

| Evento | Cuándo | Datos útiles |
|---|---|---|
| `partida_inicio` | Al validar un código | dispositivo (iOS/Android), app instalada o navegador |
| `busqueda_inicio` | Al pulsar "Activar búsqueda" en un portal | portal |
| `llegada` | Al entrar en el radio del portal | segundos que tardó en encontrarlo |
| `error_gps` | Permiso denegado / sin señal / GPS lento | código de error |
| `respuesta` | Cada respuesta del quiz | pregunta, acierto sí/no, segundos |
| `pista` | Al usar una pista | pregunta |
| `portal_completado` | Al sellar un portal | puntos, tiempo, fallos, pistas |
| `logro` | Al desbloquear un logro | logro |
| `reanudacion` | Al continuar un portal interrumpido | fase (quiz / llegada / narrativa) |
| `salida` | Al pulsar "Abandonar misión" | portal |
| `partida_completada` | Al terminar el portal 7 | puntos, rango, logros, tiempo total |

Cada partida tiene un identificador aleatorio (`sesion`) para poder seguirla de principio a fin.

## Instalación (10 minutos, una sola vez)

1. Entra en <https://sheets.google.com> con la cuenta de Cazorla Travel y crea una hoja nueva.
   Llámala, por ejemplo, **Estadísticas Tragantía**.
2. En la hoja: menú **Extensiones → Apps Script**.
3. Borra el contenido que aparece y pega todo el archivo `apps-script.gs` de esta carpeta.
   Pulsa el icono de guardar.
4. Arriba a la derecha: **Implementar → Nueva implementación**.
   - Tipo (rueda dentada): **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario**.
   - Pulsa **Implementar** y autoriza los permisos que pida Google
     (aparecerá un aviso de "aplicación no verificada": pulsa *Configuración avanzada → Ir a…*).
5. Copia la **URL de la aplicación web** (termina en `/exec`).
   Puedes abrirla en el navegador: debe decir *"Receptor de estadísticas de La Tragantía activo"*.
6. Abre `tragantia-final/juego.js` y pega la URL entre las comillas de esta línea:

   ```js
   const ESTADISTICAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```

7. Sube `juego.js` al servidor. No hace falta cambiar la versión del Service Worker:
   los `.js` propios se descargan siempre de la red primero.

## Ver el resumen

- La pestaña **Eventos** se rellena sola con cada partida.
- Para el resumen: en Apps Script, elige la función `generarResumen` y pulsa **Ejecutar**.
  Se crea la pestaña **Resumen** con:
  - partidas iniciadas, completadas y tasa de finalización;
  - embudo por portal (llegadas, completados, minutos de búsqueda, pistas, errores de GPS)
    y en qué portal se quedan las partidas sin terminar;
  - las preguntas con más fallos (candidatas a reescribir);
  - rangos finales, logros y dispositivos.
- Para que se actualice solo cada día: en Apps Script, menú lateral **Activadores (reloj)
  → Añadir activador → `generarResumen` → Según tiempo → Diario**.

## Privacidad

No se envían códigos de activación, nombres, correos ni coordenadas GPS. Solo el número
de portal, tiempos, aciertos y el tipo de dispositivo. Si en el futuro se añadiera algún
dato personal, habría que mencionarlo en la política de privacidad de la web.
