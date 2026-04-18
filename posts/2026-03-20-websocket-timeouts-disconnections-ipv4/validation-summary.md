# Validation Summary: How to Handle WebSocket Timeouts and Disconnections on IPv4

## Status
validated

## Post Type
Tutorial / Guide (code-heavy)

## Technologies Covered
- Node.js
- `ws` library (WebSocket server)
- Browser WebSocket API (`WebSocket` global)
- WebSocket protocol (RFC 6455) ping/pong frames
- Exponential backoff reconnection pattern

## Sources Consulted
- `ws` library docs: https://github.com/websockets/ws/blob/master/doc/ws.md (Server events `connection`, `close`; WebSocket events `message`, `pong`, `close`, `error`; methods `ping()`, `terminate()`, `clients` Set)
- MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket (readyState, event handlers, close())
- MDN WebSocket.close(): https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close — "Allowed values are: 1000, and the range of 3000 to 4999"
- WHATWG WebSockets spec: https://websockets.spec.whatwg.org/#dom-websocket-close — throws InvalidAccessError if code is not 1000 or 3000-4999
- RFC 6455 (The WebSocket Protocol), §7.4 for status codes

## Issues Found

1. **Invalid close code in browser `close()` call.** The client called `this.ws.close(1001, 'Ping timeout')`. Per the WHATWG spec and MDN, the browser WebSocket `close()` method only accepts code `1000` or codes in the range `3000-4999`; passing `1001` raises `InvalidAccessError`. Code `1001` (Going Away) is only valid when sent by the endpoint itself as part of the closing handshake, not as an argument to the browser's `close()` API. Changed to `4000` (application private-use range) which is valid and consistent with an application-driven timeout close.

2. **Server did not reply to client's application-level `__ping__`.** The client implementation sends `__ping__` text messages and resets its pong timer only when a `__pong__` text message arrives. The server's `on('message')` handler processed these as regular messages without replying, which means the client's pong timer would fire on every interval and force a reconnect loop. Added an early branch in the server's message handler that detects `__ping__` and replies with `__pong__`. This is also the correct pattern because browser JavaScript cannot send WebSocket protocol-level ping frames (only server-initiated protocol ping/pong works automatically for browser clients via `ws.ping()` → browser's auto-pong).

## Review Notes

- `PING_TIMEOUT` is declared on the server but never referenced. The effective timeout is actually `PING_INTERVAL` (the alive flag is only rechecked at the next interval). This is not wrong but is slightly misleading — left as-is since it is a dead-code style issue rather than a correctness bug.
- The server and client now use complementary mechanisms: server-initiated protocol ping (browser auto-replies, `on('pong')` marks alive) AND client-initiated application ping over text messages (server replies with `__pong__`). Together they cover both directions.
- `req.socket.remoteAddress` is correct in Node.js. Note that with `host: '0.0.0.0'` the server binds IPv4 only; IPv6 clients connecting via a dual-stack listener would appear as `::ffff:x.x.x.x`. This is consistent with the IPv4 framing of the post.
- The exponential backoff formula `initialDelay * 2^retryCount` capped at `maxDelay` is correct. No jitter is applied; in production, adding jitter is advisable to avoid reconnection storms.
- The browser `WebSocket` error `event` is a plain `Event` (no `.message`), so `err.message || 'Unknown error'` correctly falls through to the default string.
