# Validation Summary: How to Secure WebSocket Connections with TLS over IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol (wss://)
- TLS / SSL
- Python `websockets` library
- Python `ssl` standard library module
- Node.js `ws` package
- Node.js `https` module
- Nginx (TLS termination and WebSocket proxying)
- Browser `WebSocket` API

## Sources Consulted
- Python `websockets` library documentation: https://websockets.readthedocs.io/en/stable/
- Python `ssl` module documentation: https://docs.python.org/3/library/ssl.html
- Node.js `ws` package documentation: https://github.com/websockets/ws
- Node.js `https` module documentation: https://nodejs.org/api/https.html
- Nginx WebSocket proxying docs: https://nginx.org/en/docs/http/websocket.html
- Nginx `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- MDN `WebSocket` interface: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- RFC 6455 (The WebSocket Protocol)

## Issues Found
No technical issues found.

- Python server uses `ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)` and `load_cert_chain` correctly.
- `websockets.serve(..., ssl=ssl_ctx)` and `websockets.connect(..., ssl=ctx)` use the correct `ssl=` parameter for recent versions of the `websockets` library (the old `ssl_context=` is deprecated).
- Handler signature `async def handler(websocket):` is correct (the `path` argument was deprecated; `websocket.path` is used instead).
- Node.js `https.createServer` + `new WebSocket.Server({ server })` pattern is the standard way to build a wss:// server with the `ws` package.
- Nginx `Upgrade` / `Connection: upgrade` headers, `proxy_http_version 1.1`, and `proxy_read_timeout` usage match Nginx's official WebSocket proxying guidance.
- `wss://` defaulting to port 443 and browser `WebSocket` using TLS transparently are both accurate per RFC 6455 and the MDN spec.

## Review Notes
- The code commented as "mTLS" in the Python snippet correctly sets `verify_mode` and `load_verify_locations` on the server context; readers enabling mTLS will also need to supply a client cert on the Python client side (`ctx.load_cert_chain(...)` on the client context), which is not shown but is outside the scope of the post's "wss:// over IPv4" focus.
- The IPv4 angle of the post is essentially incidental — the same code works identically on IPv6 if you bind to `::` / an IPv6 literal. That is consistent with the post's stated scope but worth noting for future editorial consideration.
- The `remoteAddress.replace("::ffff:", "")` trick in the Node.js example is a common and correct way to normalize IPv4-mapped IPv6 addresses to plain IPv4 when the server listens on a dual-stack socket.
