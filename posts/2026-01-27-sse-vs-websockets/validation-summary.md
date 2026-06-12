# Validation Summary: How to Use SSE vs WebSockets for Real-Time Communication

## Status
validated

## Post Type
Guide / Tutorial (comparative technology guide with implementation examples)

## Technologies Covered
- Server-Sent Events (SSE) / EventSource API
- WebSockets / WebSocket API (RFC 6455)
- HTTP/1.1 and HTTP/2
- Node.js
- Express
- `ws` library (Node.js WebSocket implementation)
- Socket.IO and `@socket.io/redis-adapter`
- node-redis (ioredis and redis v4+ clients)
- Redis Pub/Sub

## Sources Consulted
- WHATWG HTML Living Standard — Server-Sent Events: https://html.spec.whatwg.org/multipage/server-sent-events.html
- MDN — Server-Sent Events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- MDN — EventSource: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- MDN — WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- RFC 6455 — The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- RFC 7692 — Compression Extensions for WebSocket (permessage-deflate): https://datatracker.ietf.org/doc/html/rfc7692
- RFC 8441 — Bootstrapping WebSockets with HTTP/2: https://datatracker.ietf.org/doc/html/rfc8441
- `ws` library docs: https://github.com/websockets/ws
- Socket.IO Redis adapter docs: https://socket.io/docs/v4/redis-adapter/
- node-redis client docs: https://github.com/redis/node-redis
- Express docs: https://expressjs.com/

## Issues Found
No technical issues found. The post's technical claims, code examples, and protocol details all check out against official documentation:

- The `Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==` example is the canonical sample from RFC 6455.
- `Sec-WebSocket-Version: 13` is correct (the current/only standardized version).
- WebSocket frame overhead range of 2-14 bytes is accurate (2 byte minimum header + up to 8 byte extended payload length + 4 byte client masking key).
- SSE event-stream format, `Content-Type: text/event-stream`, and the `event:`/`data:`/`id:`/`retry:` field semantics are correct per WHATWG spec.
- `Last-Event-ID` reconnection behavior is accurate.
- Browser support claims (IE never supported SSE; Edge does; WebSockets in IE10+) are correct.
- The Express SSE server example uses correct headers and flushHeaders semantics.
- The `ws` library code (`WebSocket.Server`, `wss.on('connection')`, `ws.ping()`, `ws.terminate()`, `ws.readyState === WebSocket.OPEN`) matches the official API.
- The `@socket.io/redis-adapter` package name and `createAdapter(pubClient, subClient)` signature are correct.
- The HTTP/1.1 6-connection-per-origin limit is accurate.
- Per-message deflate for WebSocket compression (RFC 7692) is correctly referenced.

## Review Notes
- The post says HTTP/2 multiplexing applies to SSE but not WebSockets. In practice this is true, though RFC 8441 (Bootstrapping WebSockets with HTTP/2) does allow WebSockets over HTTP/2 streams; adoption is limited, so the practical statement in the post stands and is appropriate for the guide's audience.
- The Socket.IO Redis adapter example does not show the required `await pubClient.connect()` / `await subClient.connect()` call for node-redis v4+. As an illustrative snippet within a "scaling pattern" section it's acceptable, but a reader copying this verbatim outside an async context would need to add the connect calls. Considered a minor omission of context rather than a technical error.
- The "Max connections per domain" entry for WebSockets says "Separate limit" — accurate (browsers maintain a separate per-host WebSocket connection pool, e.g., Chrome ~256, Firefox ~200), though no exact number is given. This is fine for a comparison guide.
- The decision framework and recommendations align with current industry consensus.
