# Fruit Ninja con visión artificial

Experiencia web inspirada en Fruit Ninja: el usuario corta frutas con la mano real
captada por la cámara web, usando p5.js y ml5.js (modelo HandPose). Sin build, sin
npm, sin frameworks — solo archivos estáticos servidos desde un servidor local.

## Requisitos

- Navegador moderno de escritorio con cámara web.
- Contexto seguro: `http://localhost` o HTTPS (el navegador bloquea la cámara en `file://`).
- Servidor local de desarrollo, p. ej. la extensión **Live Server** de Visual Studio Code.

## Cómo ejecutar

1. Abre la carpeta del proyecto en Visual Studio Code.
2. Instala la extensión **Live Server** (si no la tienes).
3. Haz clic en **Go Live** (o abre `index.html` con Live Server). El sitio se sirve en
   `http://127.0.0.1:5500` (o el puerto que asigne).
4. Concede el permiso de la cámara cuando el navegador lo pida.
5. Muestra la mano: la punta del índice es el cuchillo. Corta las frutas, evita las
   bombas y no dejes que caigan frutas sin cortar (3 vidas).

No instales dependencias: `p5.js 2.3.2` y `ml5.js 1.4.0` se cargan por CDN desde
`index.html`.

## Archivos del proyecto

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura, carga de CDN en orden (p5 → ml5 → código propio) y contenedor del canvas. |
| `style.css` | Diseño arcade oscuro, responsivo, barra de estado y avisos. |
| `sketch.js` | Ciclo principal de p5.js: canvas, vídeo espejado, cuchillo con estela, HUD y menús. |
| `handTracking.js` | Inicialización de ml5 HandPose, detección continua, mapeo de coordenadas vídeo → canvas. |
| `fruit.js` | Frutas, bombas, frutas doradas/corazón, mitades animadas y sistema de partículas con pool. |
| `game.js` | Estados (inicio / partida / pausa / fin), puntuación, rachas, vidas y dificultad progresiva. |

## Cómo jugar

- La cámara se muestra de fondo, espejada para que resulte natural.
- Acercá la mano: aparece el cuchillo en la punta del índice con una estela al moverse.
- Mové la mano rápido a través de una fruta para cortarla (un punto quieto no corta: se
  requiere velocidad).
- Las frutas cortadas se parten en dos mitades que giran y caen, con partículas de jugo.
- Cortar una bomba cuesta una vida. La fruta dorada da puntos extra y el corazón recupera
  una vida.
- Cada fruta que se escapa sin cortar resta una vida. Al agotar las 3 vidas: fin de
  partida.

## Detección gestual

ml5 HandPose detecta hasta 1 mano y devuelve los 21 puntos de referencia. Se usa
`index_finger_tip` como punto de control. Las coordenadas vienen en píxeles del vídeo y se
mapean al canvas con una única función (`videoToCanvas`) que escala y respeta el espejado,
sin doble espejado. El movimiento se suaviza con EMA para evitar vibraciones, y la velocidad
para el corte se calcula sobre la posición cruda para no perder gestos rápidos.

El procesamiento de la cámara ocurre localmente en el navegador; no se envían imágenes ni
datos a servidores externos.

## Configuración

Todos los valores ajustables están en el objeto `CONFIG` al inicio de `sketch.js`
(velocidades, gravedad, probabilidades de bomba/dorada/corazón, puntuación, vidas,
suavizado, umbral de corte, dificultad). Se centralizan ahí para modificarlos fácilmente
(espec. §7 y §14.8 del `spec.md`).

## Pruebas manuales (criterios de aceptación, spec.md §11)

1. Iniciar desde un servidor local ✅
2. Permitir la cámara ✅
3. ml5 detecta la mano — se muestra el cuchillo ✅
4. El cuchillo sigue el índice ✅
5. Estela al moverse ✅
6. Movimientos rápidos cortan frutas (segmento de trayectoria, no punto) ✅
7. Las frutas cortadas se dividen en dos mitades animadas ✅
8. La puntuación sube una sola vez por fruta cortada ✅
9. Pantallas: inicio, partida, fin de partida ✅
10. Reinicio sin recargar la página ✅
11. Mensajes claros de error de cámara y modelo ✅
12. Sin backend ✅

## Licencia

Proyecto educativo. p5.js y ml5.js bajo sus respectivas licencias.
