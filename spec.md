# spec.md — Fruit Ninja con visión artificial

## 1. Descripción del proyecto

Desarrollar una experiencia web interactiva inspirada en Fruit Ninja, en la que el usuario pueda
cortar diferentes tipos de frutas utilizando los movimientos de su mano real captada por la cámara
web de su computadora.

El proyecto combina programación creativa, interacción gestual, visión artificial y diseño visual
mediante p5.js y ml5.js.

La experiencia debe sentirse fluida, divertida y visualmente atractiva, como un videojuego
experimental que conecta el movimiento físico del usuario con un entorno digital.

## 2. Metodología de desarrollo

Utilizar SDD (Spec-Driven Development) como metodología principal.

Antes de implementar el código:

1. Analizar esta especificación y detectar posibles ambigüedades.
2. Definir la arquitectura técnica y los componentes principales.
3. Identificar los riesgos técnicos, especialmente la detección de manos y el rendimiento de la cámara web.
4. Crear un plan de implementación dividido en tareas pequeñas y verificables.
5. Definir los criterios de aceptación y las pruebas necesarias.

No comenzar a programar toda la aplicación sin haber definido primero el plan.

Implementar el proyecto de manera incremental, verificando cada funcionalidad antes de continuar. Si
se detecta un conflicto entre la implementación y esta especificación, priorizar la especificación o
proponer explícitamente una modificación.

## 3. Tecnologías obligatorias

- HTML5 para la estructura.
- CSS3 para los estilos y la interfaz.
- JavaScript para la lógica del juego.
- p5.js mediante CDN para dibujar, animar y gestionar el entorno interactivo.
- ml5.js mediante CDN para detectar la mano mediante visión artificial.
- Cámara web mediante la API de captura de video del navegador.

No utilizar React, Vue, Angular, TypeScript, Node.js como requisito de ejecución ni frameworks
adicionales.

La aplicación debe ejecutarse directamente en un navegador moderno desde un servidor local de
desarrollo de Visual Studio Code.

Utilizar versiones compatibles y estables de p5.js y ml5.js. Consultar la documentación oficial
antes de implementar la detección de manos y verificar la API disponible en la versión seleccionada.

## 4. Detección y seguimiento de la mano

Utilizar el modelo de detección de manos compatible con la versión elegida de ml5.js, preferiblemente
HandPose.

Requisitos:

- Solicitar permiso para acceder a la cámara web.
- Mostrar una vista previa de la cámara.
- Detectar los puntos de referencia de la mano en tiempo real.
- Identificar la posición de la punta del dedo índice.
- Utilizar esa posición como punto principal de control del cuchillo.
- Suavizar el movimiento del cursor gestual para evitar vibraciones excesivas.
- Detectar cuándo la mano entra y sale del campo de visión.
- Mostrar mensajes claros mientras se solicita el permiso, se carga el modelo o se pierde la detección.
- Evitar iniciar múltiples instancias de la cámara o del modelo.

La experiencia debe funcionar con una mano y no depender de guantes, marcadores ni dispositivos
adicionales.

## 5. Mecánica principal: la mano se convierte en un cuchillo

Cuando el usuario muestre la mano frente a la cámara, aparecerá un cuchillo virtual asociado a la
punta del dedo índice.

El cuchillo debe:

- Seguir el movimiento de la mano con baja latencia.
- Tener una apariencia visual estilizada y coherente con el juego.
- Orientarse según la dirección del movimiento de la mano.
- Dejar una estela luminosa o un rastro visual breve al moverse.
- Activar el corte cuando el movimiento de la mano atraviese una fruta.

No basta con detectar que la mano está encima de una fruta: el juego debe comprobar que la
trayectoria del cuchillo cruza la zona de colisión de la fruta.

Implementar un sistema de detección de cortes basado en segmentos de trayectoria entre la posición
anterior y la posición actual del cuchillo. Esto debe permitir detectar movimientos rápidos sin que
las frutas se atraviesen accidentalmente entre dos fotogramas.

La lógica del juego debe estar desacoplada de la lógica de detección de manos para facilitar futuras
mejoras.

## 6. Sistema de frutas

Crear un sistema que genere diferentes tipos de frutas de manera aleatoria.

Incluir como mínimo:

- Sandía.
- Naranja.
- Manzana.
- Plátano.
- Fresa.
- Piña.

Cada fruta debe tener una apariencia visual reconocible y diferenciada.

Comportamiento de las frutas:

- Aparecer desde la parte inferior de la pantalla.
- Desplazarse mediante una trayectoria ascendente con movimiento parabólico.
- Tener velocidad, posición, tamaño y rotación variables.
- Caer nuevamente por efecto de la gravedad.
- Desaparecer al salir de los límites de juego.
- Poder cortarse una sola vez.
- Generar una animación de corte cuando la trayectoria del cuchillo las atraviese.

Cuando una fruta sea cortada, debe dividirse visualmente en dos mitades que se separan, giran y caen
por efecto de la gravedad.

Añadir partículas, pequeñas gotas de jugo o efectos visuales al cortar, evitando sobrecargar el
rendimiento.

Los objetos del juego deben gestionarse mediante estructuras de datos reutilizables y no mediante
código duplicado para cada fruta.

## 7. Sistema de puntuación y dificultad

Implementar:

- Puntuación visible durante la partida.
- Incremento de puntos por cada fruta cortada.
- Rachas por cortar varias frutas consecutivamente.
- Un contador de tiempo o un sistema de duración de partida.
- Una pantalla inicial.
- Una pantalla de fin de partida.
- Un botón para reiniciar.
- Aumento progresivo de la dificultad mediante la velocidad o frecuencia de aparición de frutas.

Los valores de puntuación y dificultad deben centralizarse en una configuración para que puedan
modificarse fácilmente.

## 8. Diseño visual y experiencia de usuario

Crear una interfaz inspirada en los videojuegos arcade, con una identidad visual propia.

Dirección visual:

- Fondo oscuro con profundidad visual.
- Colores vivos para diferenciar las frutas.
- Efectos de luz y partículas moderados.
- Tipografía legible.
- Animaciones fluidas.
- Interfaz limpia que no compita con la acción principal.
- Diseño adaptable a diferentes tamaños de pantalla.

La vista de la cámara debe utilizarse para detectar la mano. El escenario del juego debe ser la
superficie principal de interacción.

La vista de la cámara puede aparecer en una pequeña ventana secundaria para que el usuario compruebe
si la detección funciona. No debe ocupar demasiado espacio.

Si la cámara se muestra invertida horizontalmente para que la interacción resulte natural, corregir
también las coordenadas de detección para que el cuchillo siga correctamente la mano.

## 9. Arquitectura del proyecto

Organizar el código de manera clara y modular.

Propuesta de archivos:

- `index.html`: estructura y carga de las bibliotecas mediante CDN.
- `style.css`: diseño visual, interfaz y adaptación de pantalla.
- `sketch.js`: inicialización de p5.js, renderizado y ciclo principal.
- `handTracking.js`: inicialización del modelo y seguimiento de la mano.
- `fruit.js`: lógica y comportamiento de las frutas.
- `game.js`: estado del juego, colisiones, puntuación y dificultad.

Si la compatibilidad de la versión elegida de ml5.js con módulos ES genera problemas, utilizar
scripts clásicos con un orden de carga explícito. No añadir complejidad arquitectónica innecesaria.

## 10. Rendimiento y manejo de errores

- Mantener una animación fluida en computadoras de uso general.
- Evitar crear objetos y efectos innecesarios en cada fotograma.
- Limitar la cantidad de partículas y elementos simultáneos.
- Gestionar los errores de permiso de cámara.
- Informar si la cámara no está disponible.
- Informar si el modelo de detección no carga correctamente.
- Evitar errores cuando la mano no está visible.
- Detener o pausar la interacción cuando la cámara no esté disponible.
- No enviar imágenes ni datos de la cámara a servidores externos.
- Realizar el procesamiento localmente en el navegador siempre que lo permita la biblioteca utilizada.

La cámara debe funcionar desde localhost o desde un contexto seguro compatible. No asumir que abrir
`index.html` directamente mediante el protocolo `file://` permitirá acceder a la cámara.

## 11. Criterios de aceptación

El proyecto se considerará funcional cuando:

1. La aplicación pueda iniciarse desde un servidor local.
2. El usuario pueda autorizar el uso de la cámara web.
3. ml5.js detecte correctamente una mano.
4. El cuchillo virtual siga la punta del dedo índice.
5. El cuchillo deje una estela visual al moverse.
6. Los movimientos rápidos puedan cortar frutas de forma consistente.
7. Las frutas cortadas se dividan en dos partes animadas.
8. La puntuación aumente una sola vez por cada fruta cortada.
9. El juego tenga inicio, partida activa y fin de partida.
10. Se pueda reiniciar sin recargar la página.
11. Los errores de cámara y carga del modelo se comuniquen claramente.
12. La aplicación no dependa de servicios de backend para ejecutar el juego.

## 12. Entregables

Producir:

- La especificación técnica final.
- El plan de implementación.
- Los archivos completos del proyecto.
- Las instrucciones para ejecutar el proyecto en Visual Studio Code.
- Una lista de pruebas manuales.
- Una explicación breve de la arquitectura y del funcionamiento de la detección gestual.

No entregar solamente fragmentos de código o pseudocódigo. Implementar una experiencia funcional y
probar cada parte que sea posible verificar en el entorno disponible.

## 13. Orden de implementación

Desarrollar en este orden:

1. Crear la estructura HTML y cargar correctamente p5.js y ml5.js desde CDN.
2. Inicializar la cámara y verificar que el video se muestre.
3. Integrar HandPose y visualizar los puntos detectados de la mano.
4. Crear el cuchillo virtual y vincularlo con el dedo índice.
5. Implementar la trayectoria y las animaciones de las frutas.
6. Implementar las colisiones y el corte de las frutas.
7. Añadir puntuación, rachas, temporizador y dificultad.
8. Incorporar la dirección visual final y los efectos.
9. Probar los criterios de aceptación y corregir errores.

Priorizar primero una mecánica básica estable. Después, mejorar la estética y añadir efectos sin
comprometer la respuesta de los controles.

---

## 14. Anexo técnico verificado

> Todo lo de esta sección se verificó contra el registro de npm y el repositorio/ejemplos oficiales
> de ml5, no contra tutoriales. Fecha de verificación: octubre 2026.

### 14.1 Versiones y carga por CDN

| Librería | Versión   | URL                                                  | Formato            |
| -------- | --------- | ---------------------------------------------------- | ------------------ |
| p5.js    | **2.3.2** | `https://cdn.jsdelivr.net/npm/p5@2.3.2/lib/p5.js`    | UMD (global `p5`)  |
| ml5.js   | **1.4.0** | `https://cdn.jsdelivr.net/npm/ml5@1.4.0/dist/ml5.js` | UMD (global `ml5`) |

- **p5 2.3.2 + ml5 1.4.0 es el par que ml5 prueba oficialmente**: el `index.html` de sus ejemplos de
  `handPose` fija `p5@2.3.2`. No inventar otra combinación.
- **Fijar las versiones exactas** en el CDN. Nunca `@latest`.
- **ml5 1.4.0 se distribuye como UMD** (no hay build ESM), así que **scripts clásicos son
  obligatorios**. Esto resuelve la duda de la sección 9: usar `<script>` en orden, no `type="module"`.
- Orden obligatorio en `index.html`: `p5` → `ml5` → scripts propios (`fruit.js`, `game.js`,
  `handTracking.js`, `sketch.js`). ml5 necesita p5 cargado.
- ml5 1.4.0 **no declara** dependencia de p5 (`peerDependencies` ausente); la compatibilidad se
  sostiene por el par versionado de arriba, no por un rango declarado.

### 14.2 API de detección de manos (ml5 1.4.0)

- Inicialización: `const handPose = await ml5.handPose({ maxHands: 1, modelType: "lite" })`.
- **`maxHands` explícito en 1**: el default depende del runtime (con `mediapipe` el default es 4; con
  `tfjs` es 2). Para una sola mano, hay que fijarlo.
- `runtime`: el default es **`mediapipe`** (no `tfjs`). Está bien quedarse con el default, pero no
  asumirlo: cambió entre versiones.
- `modelType`: el default es `"full"`; acá se elige `"lite"` por rendimiento.
- **Detección continua**: `handPose.detectStart(video, callback)`. ml5 maneja el ciclo asíncrono y
  entrega los resultados al callback. No hace falta re-disparar `detect()` a mano ni hacer `await`
  dentro de `draw()`. Para frenar: `handPose.detectStop()`.
- `createCapture`: pasar `{ audio: false }` en las constraints; por defecto p5 captura video **y
  audio** y el navegador pide permiso de micrófono. Ocultar el elemento con `video.hide()` y
  dibujarlo con `image(video, ...)`.
- Landmarks con nombre disponibles en el objeto `hand`: `index_finger_tip`, `thumb_tip`, `wrist`,
  `middle_finger_mcp`, etc. ml5 los agrega a partir de `hand.keypoints`; cada uno trae `x`, `y` y
  además `x3D`, `y3D`, `z3D`.
- Punto de control del cuchillo: `hand.index_finger_tip`.
- **HandPose no es un modelo de clasificación de gestos**: no hay "pinza" ni "puño". Todo gesto (el
  corte incluido) se deriva de la geometría de los landmarks, y el corte se define por
  **movimiento**, no por postura.

### 14.3 Contrato de coordenadas (crítico)

- Los landmarks llegan en **píxeles intrínsecos del video** (`videoWidth` × `videoHeight`), **no** en
  tamaño de canvas.
- Si el canvas no mide lo mismo que el video, **hay que escalar**: los ejemplos de ml5 usan canvas
  640×480 igual que el video, y por eso ahí los valores coinciden.
- El video se muestra **espejado** (modo selfie) para que la interacción resulte natural. Espejar el
  video **no** espeja los landmarks: ml5 lee los píxeles crudos.
- El espejado de landmarks se hace en **una sola función** `videoToCanvas(landmark) -> {x, y}`, que
  además escala. Esa función es la única responsable de la transformación; el render del video puede
  usar `createCapture(VIDEO, { flipped: true })` sin afectar los landmarks.
- Regla: nada de transformar coordenadas fuera de esa función (evita el doble espejado, que deja todo
  invertido otra vez).

### 14.4 Detección de corte (implementación de la sección 5)

- El "cuchillo" es un **segmento entre la punta del índice anterior y la actual**: se mapean ambas y
  se testea ese segmento, no un punto.
- Para frutas circulares, la prueba es **distancia segmento↔centro ≤ radio** de colisión.
- **Umbral de velocidad mínima**: el corte requiere que el segmento supere una velocidad mínima. Sin
  eso, dejar la mano quieta sobre una fruta la corta, y eso contradice la sección 5.
- Cada fruta lleva un **flag `cortada`**: se corta una sola vez.
- Evitar recortes múltiples de la misma fruta con trozos/partículas en el mismo frame.

### 14.5 Suavizado del cursor gestual

- Suavizar con **EMA / lerp**: `smooth = smooth + alpha * (raw - smooth)`, `alpha` ≈ 0.3–0.5 a 60 FPS.
- Hay un compromiso explícito: más suavizado = menos vibración pero **más latencia**. No hay almuerzo
  gratis; ajustar el valor en `CONFIG` y probar con la mano quieta y en movimiento rápido.
- Usar la posición **suavizada** para dibujar el cuchillo; calcular la **velocidad** con la posición
  **cruda** (si no, el suavizado esconde los movimientos rápidos justo cuando hay que cortar).

### 14.6 Rendimiento

- **Pool de partículas**: un máximo fijo de partículas vivas, recicladas. Nunca crear objetos en cada
  frame.
- ml5 descarga los pesos del modelo desde un CDN externo en el primer uso; la inferencia corre
  **local** en el navegador (no se suben imágenes a ningún servidor).
- `modelType: "lite"` y `maxHands: 1` son las dos palancas principales de FPS.

### 14.7 Servidor local y contexto seguro

- Usar la extensión **Live Server** de VS Code (o equivalente): sirve en
  `http://127.0.0.1:5500`, que es un **contexto seguro** y habilita la cámara.
- **`file://` no es confiable** para `getUserMedia`. No usar como método de prueba.
- Errores de cámara esperables: `NotAllowedError` (permiso denegado), `NotFoundError` (sin cámara),
  `NotReadableError` (cámara ocupada por otra app). Cada uno con su mensaje.

### 14.8 Configuración centralizada (`CONFIG`)

Los valores que la sección 7 pide centralizar, como mínimo:

| Grupo      | Valores                                                          |
| ---------- | ---------------------------------------------------------------- |
| Manos      | `maxHands`, `modelType`, `smoothingAlpha`, `minCutSpeed`         |
| Frutas     | tabla por tipo: color, radio de colisión, puntaje, forma         |
| Aparición  | intervalo inicial, intervalo mínimo, velocidad inicial, gravedad |
| Dificultad | factor de aceleración por tiempo, cantidad máxima simultánea     |
| Puntaje    | puntos por fruta, bonus de racha, umbral de racha                |
| Partículas | cantidad máxima, vida, gravedad local                            |

## 15. Reglas de partida (confirmadas)

- **Fin de partida: sistema de fallos.** N vidas (default **3**, valor en `CONFIG`). Cada fruta que
  sale de la pantalla sin cortarse cuenta como **un fallo**. Al agotarlas: pantalla de fin de partida.
- **Salvaguardas contra los hipos del tracking.** Son la contracara obligatoria del modelo de vidas:
  sin ellas, cada fallo de detección se cobra como error del jugador.
  - Los fallos no se cuentan hasta que el modelo esté listo y haya habido al menos una detección real.
  - Si no se detecta ninguna mano por más de ~1 s, la partida **se pausa** en vez de acumular fallos
    (es coherente con el requisito de la sección 4: detectar cuándo la mano sale del campo de visión).
  - Una fruta recién aparecida no puede contar como fallo antes de haber sido visible durante un
    tiempo mínimo, para no castigar un spawn en el borde.
  - Con **una sola mano** y sin detección, no hay cuchillo: el estado debe ser "esperando mano", no
    "perdiendo".

### Objetos del juego (confirmado)

- **Frutas**: los 6 tipos de la sección 6.
- **Bombas**: aparecen mezcladas con las frutas, con probabilidad configurable. **Cortar una cuesta
  una vida.** No cortarla es lo correcto y no penaliza.
- **Fruta dorada**: puntos extra (multiplicador en `CONFIG`), con baja frecuencia.
- **Fruta corazón**: recupera **+1 vida** hasta el máximo (default 3, tope configurable), con
  frecuencia más baja todavía.
- Los tipos comparten la misma mecánica de vuelo parabólico; lo que cambia es el campo `type` en los
  datos del objeto y su comportamiento al ser cortado.

## 16. Decisiones abiertas

Pendientes de definir antes de cerrar la spec:

1. **Sonido**: no está especificado (efectos al cortar, ambiente, o sin audio).
2. **Valores concretos** de puntuación, vidas, dificultad, probabilidades e intervalos (van a `CONFIG`).
