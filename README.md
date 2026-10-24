# Manos — cuadrícula neón

Experiencia web de visión artificial: una cuadrícula de puntos apagados que se encienden en colores
neón cuando pasas el dedo índice cerca de ellos. Cada columna de la cuadrícula suena con una nota
de la escala de Do. El esqueleto de cada mano detectada se dibuja siempre, en cian y
magenta, sobre un fondo negro. La cámara no se muestra: solo alimenta al modelo. La cuadrícula ocupa
toda la ventana, de borde a borde.

Sin build ni dependencias locales: archivos estáticos con p5.js 2.3.2 y ml5.js 1.4.0 por CDN.

## Qué necesitas

- Un navegador moderno de escritorio.
- Una cámara web.
- La extensión **Live Server** de Visual Studio Code (o un servidor local equivalente).

## Cómo ejecutarlo

1. Abre la carpeta del proyecto en Visual Studio Code.
2. Instala la extensión **Live Server** si no la tienes.
3. Haz clic en **Go Live** (o abre `index.html` con Live Server). El sitio se sirve en
   `http://127.0.0.1:5500` o el puerto que asigne.
4. Pulsa **"Comenzar"** y acepta el permiso de la cámara. Ese clic activa también el sonido.

No abras `index.html` directamente con `file://`: el navegador bloquea la cámara fuera de un
contexto seguro (`http://localhost` o HTTPS).

## Cómo se usa

- **Muestra la mano**: aparece su esqueleto con 21 puntos. La mano izquierda de la pantalla es cian
  y la otra magenta.
- **Pasa el dedo índice** por la pantalla: los puntos a menos de 80 px se encienden y crecen. No
  hace falta ningún gesto previo.
- **Muévete rápido o lento**: la velocidad decide el color neón (frío cuando vas lento, cálido
  cuando vas rápido).
- **Cada columna tiene su nota**: la cuadrícula sonora va de grave (izquierda) a agudo (derecha),
  con la escala de Do completa. La nota suena cuando el punto llega al 70% de su tamaño.

## Sonidos de gestos

- **Comenzar**: arpegio ascendente.
- **Aplauso**: chasquido.
- **Puño**: golpe grave.
- **Tecla C**: barrido descendente.

## Borrar

- **Aplaude**: las dos palmas se juntan rápido (enfriamiento de 1 s).
- **Cierra el puño** durante un segundo.
- O pulsa la tecla **C**.

El borrado es una animación: los puntos se encogen y vuelven al gris en medio segundo.

## Apagado lento

Los puntos se apagan solos en unos 20 segundos. Si pintas seguido, el lienzo se llena; si paras,
vuelve al estado inicial.

## Estado en pantalla

Arriba a la izquierda, en gris: `Cámara: lista`, `Modelo: cargado` y `Manos detectadas: N`. Sirve
para saber si el modelo arrancó y cuántas manos está viendo.
