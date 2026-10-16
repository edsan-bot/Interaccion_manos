const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8'
};

http
  .createServer((req, res) => {
    let url = req.url === '/' ? '/index.html' : req.url;
    // quitar query string
    url = url.split('?')[0];
    const file = path.join(root, url);
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('no encontrado: ' + url);
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(4000, '127.0.0.1', () => {
    console.log('Servidor local en http://127.0.0.1:4000/  (sirve ' + root + ')');
  });
