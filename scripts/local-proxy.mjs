import http from "node:http";

const listenPort = Number(process.env.PROXY_PORT ?? "3000");
const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:8080";
const frontendOrigin =
  process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:5173";

function targetFor(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/")
    ? apiOrigin
    : frontendOrigin;
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    res.end("Missing request URL");
    return;
  }

  const origin = targetFor(req.url);
  const target = new URL(req.url, origin);
  const headers = { ...req.headers, host: target.host };

  const upstream = http.request(
    target,
    {
      method: req.method,
      headers,
    },
    (response) => {
      res.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(res);
    },
  );

  upstream.on("error", (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end(`Proxy error: ${error.message}`);
  });

  req.pipe(upstream);
});

server.listen(listenPort, "127.0.0.1", () => {
  console.log(
    `Local proxy listening on http://127.0.0.1:${listenPort} ` +
      `(API ${apiOrigin}, frontend ${frontendOrigin})`,
  );
});