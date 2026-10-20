import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.pdf': 'application/pdf', '.bib': 'text/plain' };
export function serve(root, port) {
  root = resolve(root);
  const server = createServer(async (req, res) => {
    try {
      let path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      let body = await readFile(path);
      const headers = { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
      if (/\b(gzip)\b/.test(req.headers['accept-encoding'] || '') && /\.(html|css|js|svg|json|bib)$/.test(path)) {
        body = gzipSync(body); headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding';
      }
      res.writeHead(200, { ...headers, 'Content-Length': body.length }).end(body);
    } catch { res.writeHead(404).end('Not found'); }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = Number(process.argv[3] || 4000);
  await serve(process.argv[2] || '_site', port);
  console.log(`Serving at http://127.0.0.1:${port}`);
}
