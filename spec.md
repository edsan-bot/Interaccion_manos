# spec.md — Pintar en el aire con el dedo

## 1. Objetivo del proyecto

Crear una experiencia web en la que el usuario dibuja sobre la pantalla con el dedo índice
frente a la cámara. La cámara se ve como fondo en modo espejo, la punta del dedo funciona como
pincel y el color, el grosor y el sonido responden a la velocidad del movimiento.

## 2. Tecnologías

- **p5.js 2.3.2** (CDN) para el canvas, el video y el dibujo.
- **ml5.js 1.4.0** (CDN) con el modelo `ml5.handPose()` para detectar la mano.
- **Detección continua** con `handPose.detectStart(video, callback)`.
- **Web Audio API** (o `p5.sound`) para generar las notas de piano por síntesis, sin archivos de
  audio externos.
- HTML5, CSS3 y JavaScript. Sin frameworks ni build: solo archivos estáticos.

Versiones fijas en el CDN, nunca `@latest`. Orden de carga: `p5` → `ml5` → código propio.

## 3. Funcionalidades

### 3.1 Cámara como fondo, en espejo

La imagen de la cámara ocupa el fondo del canvas, en modo espejo (selfie) para que el movimiento se
sienta natural. La cámara se solicita con `{ audio: false }`.

### 3.2 Puntos de la mano

- La punta del dedo índice es el punto de dibujo: `index_finger_tip` (keypoint **8**).
- Las coordenadas se convierten del espacio del video al del canvas en una única función de mapeo
  que escala y aplica el espejo.

### 3.3 Pintar con el dedo

- Se dibuja siempre que se detecta la mano: no hace falta ningún gesto de pellizco.
- La punta del dedo índice deja el trazo; el cursor la sigue.
- Al desaparecer la mano el trazo se corta: el punto siguiente empieza una línea nueva.
- El puño no pinta: se reserva para borrar (ver 3.7).

### 3.4 El color depende de la velocidad

- Movimiento lento → tonos fríos (violetas, azules, verdes).
- Movimiento rápido → tonos cálidos (amarillos, naranjas, rojos).
- La velocidad se mide en píxeles por segundo y se normaliza entre 0 y 1 (máximo de referencia:
  **1400 px/s**).
- El cambio es gradual: el valor de velocidad se suaviza y el color se interpola en un gradiente
  continuo de 6 paradas: violeta → azul → verde → amarillo → naranja → rojo.
- Los cambios de color nunca son bruscos.

### 3.5 Sonido: una nota por rango de color

- La velocidad se divide en **5 rangos**; cada rango tiene su nota de piano:

| Rango de velocidad | Color        | Nota |
| ------------------ | ------------ | ---- |
| Muy lento          | Violeta/azul | Do   |
| Lento              | Azul/verde   | Re   |
| Medio              | Verde        | Mi   |
| Rápido             | Amarillo     | Sol  |
| Muy rápido         | Naranja/rojo | La   |

- La nota suena **mientras se pinta** (mano visible y sin puño), se repite de forma suave y cambia
  cuando se pasa a otro rango.
- Sin mano no suena nada.
- Las notas se generan por síntesis (Web Audio API o `p5.sound`). **No se usan archivos de audio
  externos.**

### 3.6 El grosor depende de la velocidad

- Movimiento lento → trazo más grueso (máximo **16 px**).
- Movimiento rápido → trazo más fino (mínimo **4 px**).
- El grosor máximo es el doble del grosor anterior (8 px).
- El trazo usa puntas y uniones redondeadas.

### 3.7 Puño para borrar

- Si la mano se cierra en puño durante cerca de **1 segundo**, se borra todo el lienzo.
- El puño se detecta cuando **ningún dedo está extendido** (se comparan las puntas con sus
  nudillos). Señalar con el índice no cuenta como puño.
- El borrado se ejecuta una sola vez por puño: hay que abrir la mano antes de volver a borrar.
- La tecla **C** sigue borrando el lienzo.

### 3.8 Chispas

- Mientras se pinta salen partículas pequeñas del color actual desde la punta del dedo.
- Cada chispa se desvanece en menos de **1 segundo**.
- La cantidad está limitada por un conjunto fijo de **60** partículas reutilizadas, para no
  ralentizar la aplicación.

### 3.9 Sin mano no hay acción

Si no se detecta ninguna mano:

- No se dibuja.
- No suena nada.
- Se muestra en pantalla el mensaje **"Muestra tu mano"**.

### 3.10 Pantalla de inicio

La aplicación arranca con una pantalla de inicio y un botón **"Comenzar"**. Ese clic es necesario
para activar la cámara y el audio, porque los navegadores exigen una acción del usuario para
habilitar el sonido.

### 3.11 Borrar el lienzo

La tecla **C** borra todo el dibujo y deja el lienzo vacío.

## 4. Controles

| Acción                       | Cómo                                          |
| ---------------------------- | --------------------------------------------- |
| Iniciar                      | Clic en el botón **"Comenzar"**               |
| Pintar                       | Mover el dedo índice frente a la cámara       |
| Cambiar color y grosor       | Automático, según la velocidad del movimiento |
| Escuchar la nota             | Mientras se pinta                             |
| Borrar el lienzo             | Puño cerrado ~1 s, o tecla **C**              |

## 5. Estructura de archivos

- `index.html`: estructura de la página y carga de las librerías por CDN.
- `style.css`: estilos, pantalla de inicio y mensajes.
- `sketch.js`: lógica de p5.js, cámara, detección con ml5, gestos, trazo, color y sonido.

## 6. Criterios de aceptación

1. La aplicación se inicia desde un servidor local y muestra el botón "Comenzar".
2. Al pulsar "Comenzar" se activan la cámara y el audio.
3. La cámara se ve de fondo y en espejo.
4. El cursor sigue el dedo índice y deja trazo sin hacer ningún gesto extra.
5. El trazo es curvo y continuo, sin esquinas ni tramos rectos visibles.
6. Al desaparecer la mano el trazo se corta.
7. El color cambia de forma gradual entre tonos fríos (lento) y cálidos (rápido).
8. El grosor va de 16 px (lento) a 4 px (rápido) con puntas redondeadas.
9. La nota del rango de velocidad suena mientras se pinta.
10. Un puño de ~1 s borra el lienzo; la tecla C también.
11. Mientras se pinta salen chispas del color actual y se desvanecen en menos de 1 s.
12. Sin mano no se dibuja, no suena nada y se muestra "Muestra tu mano".
13. No se usan archivos de audio externos.
