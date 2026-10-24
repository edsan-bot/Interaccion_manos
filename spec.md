# spec.md — Manos: cuadrícula neón

## 1. Objetivo

Escena abstracta de visión artificial: fondo negro, sin video, con una cuadrícula de puntos apagados
que se encienden en colores neón cuando el usuario pasa el dedo índice cerca de ellos. El
esqueleto de cada mano detectada se dibuja siempre y cada columna de la cuadrícula es una nota.

## 2. Tecnologías

- **p5.js 2.3.2** (CDN) para el canvas y el dibujo.
- **ml5.js 1.4.0** (CDN) con `ml5.handPose()` y **`maxHands: 2`**.
- Detección continua con `handPose.detectStart(video, callback)`.
- **Web Audio API** para las notas, sin archivos de audio externos.
- HTML5, CSS3 y JavaScript. Sin frameworks ni build: solo archivos estáticos.
- Versiones fijas en el CDN, nunca `@latest`. Orden de carga: `p5` → `ml5` → `sketch.js`.

## 3. Escena

### 3.1 Fondo y arranque

Negro total. El video de la cámara **no se muestra**: se captura, se envía al modelo y se descarta.
La cámara se solicita con `{ audio: false }`.

La aplicación arranca con una **pantalla de inicio** y un botón **"Comenzar"**. Ese clic es lo que
habilita el audio (los navegadores exigen una acción del usuario) y dispara la carga de cámara y
modelo. La cuadrícula ya está dibujada detrás de la pantalla.

### 3.2 Esqueleto de las manos

Se dibuja **siempre** que haya detección, para cada mano detectada (hasta 2):

- Los **21 keypoints** como puntos y las líneas entre ellos.
- Conexiones por índice de keypoint:

  ```
  [0,1,2,3,4]  [0,5,6,7,8]  [0,9,10,11,12]  [0,13,14,15,16]  [0,17,18,19,20]
  palma: [5,9] [9,13] [13,17] [17,0]
  ```

- Trazo de 2 px con una **sombra oscura detrás** (5 px): así el esqueleto se lee aunque haya puntos
  neón debajo. Los keypoints llevan borde oscuro.
- Se dibuja **por encima** de los puntos y del cursor.
- **Mano 1: cian `#00F5FF`. Mano 2: magenta `#FF2BD6`.**
- Las **puntas de los dedos** (4, 8, 12, 16, 20) se dibujan un poco más grandes que el resto.
- El orden de las manos es estable: se ordenan por la X del esqueleto en pantalla, así los colores
  no parpadean cuando el modelo cambia el orden del array.

### 3.3 Texto de estado

Arriba a la izquierda, texto pequeño (12 px) y gris, tres líneas:

```
Cámara: lista | no
Modelo: cargado | no
Manos detectadas: N
```

Es información de diagnóstico: permite ver si la captura arrancó y cuántas manos ve el modelo. Si
falla la cámara o el modelo, se agrega una cuarta línea en rojo tenue con el error.

## 4. Cuadrícula

- **13 columnas × 16 filas** (208 puntos).
- Ocupa **toda la ventana de borde a borde**, sin recuadro centrado: la separación es
  `ancho / 13` en horizontal y `alto / 16` en vertical, y cada punto queda en el centro de su celda
  para que los del borde no se corten.
- Cada punto tiene un **tamaño final fijo y aleatorio entre 2 y 12 px de radio**, con distribución
  sesgada: muchos pequeños y algunos grandes.
- Al inicio todos son **diminutos (radio 1.5 px)** y de un **gris oscuro apagado `#2a2f38`**.
- La cuadrícula se ve desde el primer frame.
- Al redimensionar la ventana se recalculan las posiciones **conservando** el progreso de cada punto.

## 5. Crecimiento y pintado

- El **pintado** ocurre siempre que hay una mano detectada: cada punto a **menos de 80 px** de la
  punta del índice crece suavemente (`lerp` con factor 0.12) hasta su tamaño final y toma un color
  neón. No hace falta ningún gesto previo (no hay pellizco).
- Fuera de ese radio los puntos no cambian.
- La punta del índice se suaviza con `lerp` (factor 0.35) para que el cursor no tiemble.

## 6. Color neón según la velocidad

La velocidad de la mano se mide en px/s, se normaliza contra **1400 px/s** y se suaviza en el
tiempo, así que el color cambia de forma gradual y nunca da saltos.

| Velocidad | Mano 1        | Mano 2        |
| --------- | ------------- | ------------- |
| Lenta     | cian `#00F5FF` | morado `#9D4DFF` |
| Media     | lima `#B6FF00` | amarillo `#FFE600` |
| Rápida    | magenta `#FF2BD6` | naranja `#FF9100` |

Tres paradas por mano, interpoladas de forma continua: el punto toma el color del rango actual y va
pasando al siguiente mientras la mano acelera o frena.

El brillo se resuelve con **dos círculos translúcidos más grandes detrás del punto encendido**
(halo). **No se usa `shadowBlur`.**

## 7. Melodía

- **Cada columna es una nota**: escala diatónica de Do (7 notas por octava: do, re, mi, fa, sol,
  la, si), de grave a la izquierda a aguda a la derecha. Con 13 columnas:

  | Columna | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
  | ------- | - | - | - | - | - | - | - | - | - | - | -- | -- | -- |
  | Nota    | Do4 | Re4 | Mi4 | Fa4 | Sol4 | La4 | Si4 | Do5 | Re5 | Mi5 | Fa5 | Sol5 | La5 |
  | Hz      | 261.63 | 293.66 | 329.63 | 349.23 | 392.00 | 440.00 | 493.88 | 523.25 | 587.33 | 659.25 | 698.46 | 783.99 | 880.00 |

- La nota suena **la primera vez que un punto alcanza el 70% de su tamaño final**, y vuelve a
  armarse cuando el punto baja del 35%.
- **El volumen es proporcional al tamaño del punto** (de 0.06 a 0.20).
- **Máximo 4 notas por segundo** (250 ms entre notas): si varios puntos cruzan el umbral en el
  mismo frame, suena el más grande. Así se escucha como melodía y no como ruido.
- Timbre suave tipo piano: ataque rápido (~10 ms) y caída corta (~0.6 s), síntesis con dos
  osciladores (triángulo + armónico sinusoidal). **Sin archivos de audio externos.**
- El audio se habilita con el botón **"Comenzar"**. Sin ese clic, no suena nada.

### 7.1 Efectos de gestos

Todos sintetizados con Web Audio, sin archivos:

| Momento | Sonido |
| ------- | ------ |
| Pulsar **"Comenzar"** | Arpegio ascendente corto (Do5, Mi5, Sol5). |
| **Aplauso** | Chasquido de ruido filtrado (~0.16 s). |
| **Puño** sostenido | Golpe grave descendente (140 → 55 Hz). |
| Tecla **C** | Barrido descendente (720 → 150 Hz). |

## 8. Apagado lento

- Un punto encendido **vuelve solo a su estado diminuto en unos 20 segundos**, a velocidad
  constante según su tamaño final.
- Mientras se pinta, el punto se mantiene encendido; al apartar el dedo empieza a apagarse.
- El color acompaña al tamaño: cuando el punto vuelve a 1.5 px, vuelve al gris apagado.
- La intención es que, si pintas seguido, el lienzo se llene; si paras, se vacíe solo.

## 9. Borrar

Tres formas, con la misma animación suave de vuelta al estado inicial:

| Acción | Cómo |
| ------ | ---- |
| Aplauso | Las dos palmas se juntan rápido. Enfriamiento de **1 segundo**. |
| Puño | Cerrar la mano (ningún dedo extendido) durante **1 segundo**. Se ejecuta una sola vez por puño. |
| Tecla | **C** |

- El aplauso se detecta cuando la distancia entre los centros de las palmas baja de
  `1.5 × (largo de palma A + largo de palma B)` y las manos se están acercando.
- El borrado **no es instantáneo**: los puntos se encogen con `lerp` rápido (~0.5 s) hasta 1.5 px y
  vuelven al gris, y la melodía se rearma.
- Cada gesto tiene su efecto: aplauso (chasquido), puño (golpe grave), tecla C (barrido descendente).
- El esqueleto y el texto de estado no cambian durante el borrado.

## 10. Controles

| Acción                 | Cómo                                    |
| ---------------------- | --------------------------------------- |
| Iniciar                | Clic en **"Comenzar"**                   |
| Ver el esqueleto       | Mostrar la mano frente a la cámara       |
| Pintar / encender      | Pasar el dedo índice por la pantalla     |
| Escuchar la melodía    | Encender puntos: cada columna suena      |
| Borrar                 | Aplauso, puño 1 s o tecla **C**          |

## 11. Estructura de archivos

- `index.html`: estructura de la página, pantalla de inicio y carga de librerías por CDN.
- `style.css`: fondo negro, canvas a pantalla completa y pantalla de inicio.
- `sketch.js`: cámara, ml5, esqueleto, cuadrícula, pintado, color, melodía, apagado y borrado.

## 12. Criterios de aceptación

1. La página carga con el botón "Comenzar"; al pulsarlo se activan cámara, modelo y audio.
2. El video no se muestra: el fondo es negro.
3. El esqueleto de cada mano detectada se dibuja siempre: 21 puntos y las conexiones indicadas.
4. Una mano es cian y la otra magenta; las puntas de los dedos son más grandes.
5. El eje X está invertido: mover la mano a la derecha se ve a la derecha.
6. El texto de estado muestra cámara, modelo y cantidad de manos.
7. La cuadrícula tiene 13×16 puntos, ocupa todo el ancho y alto de la ventana de borde a borde, con
   tamaños finales aleatorios entre 2 y 12 px.
8. Los puntos arrancan en radio 1.5 px y gris apagado.
9. La punta del índice enciende los puntos a menos de 80 px, con crecimiento suave, sin gesto de
   pellizco.
10. Sin mano detectada no se enciende ningún punto.
11. El color pasa gradualmente entre los tres rangos de velocidad.
12. El halo se dibuja con círculos translúcidos, sin `shadowBlur`.
13. Un frame sin detección no borra el progreso.
14. Cada columna tiene su nota de la escala de Do; suena al 70% del tamaño, con volumen proporcional.
15. Nunca suenan más de 4 notas por segundo.
16. Los puntos se apagan solos en ~20 s.
17. El aplauso (1 s de enfriamiento), el puño de 1 s y la tecla C borran con animación suave.
18. No se usan archivos de audio externos.
19. Comenzar, aplauso, puño y tecla C tienen efectos de sonido sintetizados y distintos.
