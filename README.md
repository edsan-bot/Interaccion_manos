# Pintar en el aire con el dedo

Experiencia web para dibujar en pantalla moviendo el dedo índice frente a la cámara. La cámara se
ve de fondo en modo espejo, la punta del dedo funciona como pincel y cada color de la paleta tiene
su propia nota de piano. Sin build ni dependencias: solo archivos estáticos con p5.js 2.3.2 y
ml5.js 1.4.0 cargados por CDN.

## Qué necesitas

- Un navegador moderno de escritorio.
- Una cámara web.
- La extensión **Live Server** de Visual Studio Code (o un servidor local equivalente).

## Cómo ejecutarlo

1. Abre la carpeta del proyecto en Visual Studio Code.
2. Instala la extensión **Live Server** si no la tienes.
3. Haz clic en **Go Live** (o abre `index.html` con Live Server). El sitio se sirve en
   `http://127.0.0.1:5500` o el puerto que asigne.
4. Pulsa **"Comenzar"** y concede el permiso de la cámara.
5. Mueve el dedo índice frente a la cámara para pintar.

No abras `index.html` directamente con `file://`: el navegador bloquea la cámara fuera de un
contexto seguro (`http://localhost` o HTTPS).

## Controles

- **Dedo índice**: pinta apenas se muestra la mano, sin gestos extra.
- **Velocidad**: lento = color frío y trazo grueso; rápido = color cálido y trazo fino.
- **Nota de piano**: suena mientras pintas.
- **Puño cerrado ~1 s**: borra el lienzo.
- **Tecla C**: borra el lienzo.

Si no se detecta la mano, no se dibuja ni suena nada y aparece el mensaje "Muestra tu mano".
