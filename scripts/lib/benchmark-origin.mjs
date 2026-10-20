import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
const manifest = JSON.parse(
  await readFile('tests/fixtures/vendor/manifest.json', 'utf8'),
).chromium;
const vendor = new Map(
  Object.entries(manifest).map(([url, data]) => [
    `/__vendor/${data.file}`,
    { url, ...data },
  ]),
);
const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.bib': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};
function mirror(text, base) {
  if (base)
    text = text.replace(
      /url\((['"]?)([^)'"\s]+)\1\)/g,
      (match, quote, value) => {
        const source = new URL(value, base).href;
        const file = manifest[source];
        return file ? `url(/__vendor/${file.file})` : match;
      },
    );
  for (const [url, data] of Object.entries(manifest))
    text = text.replaceAll(url, `/__vendor/${data.file}`);
  return text.replaceAll(
    'https://www.googletagmanager.com/gtag/js?id=G-SRQFEQD9S4',
    '/__analytics',
  );
}
export async function benchmarkOrigin() {
  let root = resolve('.build/reference');
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let body, type;
      if (url.pathname === '/__analytics') {
        res
          .writeHead(200, {
            'content-type': 'text/javascript',
            'cache-control': 'no-store',
          })
          .end('');
        return;
      }
      const fixture = vendor.get(url.pathname);
      if (fixture) {
        body = await readFile(`tests/fixtures/vendor/${fixture.file}`);
        type = fixture.contentType;
        if (type.startsWith('text/css'))
          body = Buffer.from(mirror(body.toString(), fixture.url));
      } else {
        let path = resolve(root, '.' + decodeURIComponent(url.pathname));
        if (path !== root && !path.startsWith(root + sep)) {
          res.writeHead(403).end();
          return;
        }
        if ((await stat(path)).isDirectory()) path += '/index.html';
        body = await readFile(path);
        type = types[extname(path)] || 'application/octet-stream';
        if (/\.(html|css)$/.test(path))
          body = Buffer.from(mirror(body.toString()));
      }
      const headers = { 'content-type': type, 'cache-control': 'no-store' };
      if (/text\/|javascript|svg/.test(type)) {
        body = gzipSync(body);
        headers['content-encoding'] = 'gzip';
      }
      res
        .writeHead(200, { ...headers, 'content-length': body.length })
        .end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    select: (path) => {
      root = resolve(path);
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
