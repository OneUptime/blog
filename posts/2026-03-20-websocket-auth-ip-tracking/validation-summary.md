# Validation Summary: How to Implement WebSocket Authentication with IPv4 Client Tracking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- WebSocket protocol (RFC 6455)
- Python `websockets` library (legacy server API)
- Node.js `ws` library
- IPv4 / IPv4-mapped IPv6 address handling
- Token-based authentication (Bearer tokens, query parameters)
- Sliding-window rate limiting

## Sources Consulted
- Python `websockets` library documentation: https://websockets.readthedocs.io/
- Node.js `ws` library documentation: https://github.com/websockets/ws
- RFC 6455 (The WebSocket Protocol) Section 7.4 (Status Codes)
- Node.js `http.IncomingMessage` documentation (for `req.socket.remoteAddress`)
- Python `urllib.parse` standard library docs
- Python `str.removeprefix` (PEP 616 / Python 3.9+)

## Issues Found
No technical issues found.

- The Python handler signature `async def handler(websocket, path)` and use of `websocket.request_headers` / `WebSocketServerProtocol` are valid under the `websockets` legacy server API, which is still supported.
- Close codes 4001 and 4029 fall within the 4000–4999 application-specific range allowed by RFC 6455.
- `req.socket.remoteAddress.replace("::ffff:", "")` correctly normalizes IPv4-mapped IPv6 addresses to their IPv4 form.
- `new URLSearchParams(url.parse(req.url).query)` is functionally correct; `url.parse` returns the query as a string, which `URLSearchParams` accepts.
- The sliding-window rate limiter using `time.monotonic()` and list filtering is logically sound.
- `ConnectionClosed` is re-exported at the top level of the `websockets` package, so `websockets.ConnectionClosed` in the third example works.

## Review Notes
- The two Python examples use slightly different handler signatures (first uses `(websocket, path)`, third uses `(websocket)` only). Both are accepted by the library, but future versions of `websockets` (15+) are migrating toward the single-argument form with `websocket.request.headers` / `websocket.request.path`. This post's code will continue to work with the legacy API but may need updating as the legacy implementation is eventually removed.
- `url.parse()` in Node.js is a legacy API — still functional in Node 20+/22+ but marked deprecated in favor of the WHATWG `URL` constructor. Not a correctness issue today.
- The in-memory rate-limiting state (`_windows`) grows unbounded across unique IPs; in a long-running production deployment, eviction or a bounded data structure would be advisable. This is a scalability note, not a correctness issue.
- Token auth via query string can leak tokens into server access logs; the post correctly supports the `Authorization` header as an alternative. Worth emphasizing in a future revision.
