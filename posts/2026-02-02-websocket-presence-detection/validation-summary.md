# Validation Summary: How to Implement Presence Detection with WebSockets

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Node.js
- WebSocket protocol (RFC 6455)
- `ws` library (Node.js WebSocket implementation)
- `express` (HTTP server / static file serving)
- `uuid` (v4 UUID generation)
- `ioredis` (Redis client for Node.js)
- Redis (Pub/Sub, key TTL, pipelines)
- Browser WebSocket API (HTML5)
- HTML / CSS / vanilla JavaScript (client demo)
- Mermaid diagrams (flowchart, sequenceDiagram)

## Sources Consulted
- `ws` library documentation: https://github.com/websockets/ws — verified `WebSocket.Server`, event names (`connection`, `message`, `close`, `pong`, `error`), `ws.ping()`, `ws.terminate()`, `ws.readyState`, `WebSocket.OPEN`, `wss.clients`
- `uuid` package documentation: https://github.com/uuidjs/uuid — verified the `{ v4: uuidv4 } = require('uuid')` destructuring pattern (current for uuid v8/v9/v10)
- `express` documentation: https://expressjs.com — verified `express.static` middleware usage
- `ioredis` documentation: https://github.com/redis/ioredis — verified `setex(key, seconds, value)` argument order, `pipeline()`/`exec()` return shape (array of `[err, result]` tuples), `expire`, `del`, `keys`, `publish`/`subscribe`, `quit`
- MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket — verified browser-side `onopen`, `onmessage`, `onclose`, `onerror`, `send`, `close`, `readyState`
- MDN Page Visibility API: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API — verified `visibilitychange` event and `document.hidden`
- RFC 6455 (The WebSocket Protocol) — verified ping/pong control-frame semantics used for the server-side heartbeat
- MDN EventTarget.addEventListener `passive` option — verified the `{ passive: true }` listener option used in the activity detector

## Issues Found
No technical issues found.

All code examples are syntactically valid and use current, non-deprecated APIs:
- The `ws` server uses the documented `WebSocket.Server({ server })` constructor and the documented `isAlive`/`ping`/`pong`/`terminate` pattern for liveness checking (the same pattern recommended in the `ws` README).
- The `uuid` import uses the destructuring pattern that has been current since uuid v7 and is still current in the latest versions.
- The `ioredis` calls use correct argument orders (`setex(key, seconds, value)`, `expire(key, seconds)`) and correctly interpret pipeline results as `[err, result]` tuples (`results[index][1]`).
- The browser-side `WebSocket` usage matches the WHATWG/MDN spec, and the WSS/WS protocol selection based on `window.location.protocol` is correct.
- Mermaid syntax for `sequenceDiagram` and `flowchart TB` (subgraphs, edges, notes) is valid.

## Review Notes
- The `ActivityDetector` class accepts an `idleTimeout` option but only references `awayTimeout` in `checkActivity()`. The `idleTimeout` option is currently unused. Not technically incorrect (the code works as written), but a future revision could either wire `idleTimeout` into a separate "idle" state transition or remove it.
- `RedisPresenceStore.getOnlineUsers()` uses `redis.keys('presence:*')`. This works, but the Redis documentation recommends `SCAN` over `KEYS` for production use because `KEYS` is O(N) and blocks the Redis server. Worth a caveat in a future revision, but not strictly wrong for a tutorial.
- The Redis-based server's `handleDisconnect` only calls `removePresence` when all *local* connections close. If a user is connected to multiple WebSocket server instances simultaneously, closing connections on one instance will mark the user offline globally, even though they remain connected elsewhere. This is a known tradeoff of the simplified design and is acceptable for the tutorial's scope. A production system would track per-server connection counts in Redis (e.g., using a hash or sorted set) — could be worth a callout in a follow-up post.
- `handleAuthenticate` in the basic server preserves a previously-set non-online status (e.g., `away`/`busy`) across reconnects via the `existingPresence?.status` fallback. This is an intentional design choice and is consistent with how chat platforms like Slack behave. Not an issue.
- The `// TODO: Validate token` comment in `handleAuthenticate` is commented-out async code inside a non-async function — fine because it's illustrative-only, but a future revision adding real token validation would need to convert the handler to `async`.
