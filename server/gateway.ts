import http from 'node:http';
const ports = [4318, 4319, 4320];
let cursor = 0;
http
  .createServer((req, res) => {
    const target = ports[cursor++ % ports.length];
    const upstream = http.request(
      {
        host: '127.0.0.1',
        port: target,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: '127.0.0.1:' + target },
      },
      (response) => {
        res.writeHead(response.statusCode || 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'An API instance is unavailable. Retry the request.' }));
    });
    req.pipe(upstream);
  })
  .listen(4317, '127.0.0.1', () => console.log('Local round-robin gateway ready on 4317'));
