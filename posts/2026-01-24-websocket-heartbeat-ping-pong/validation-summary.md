# Validation Summary: How to Configure WebSocket Heartbeat/Ping-Pong

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- WebSocket protocol
- WebSocket ping and pong control frames
- JavaScript
- Browser WebSocket API
- Node.js
- `ws` WebSocket library
- Connection heartbeat, keep-alive, reconnection, and monitoring patterns

## Sources Consulted
- RFC 6455, The WebSocket Protocol: https://www.rfc-editor.org/rfc/rfc6455
- `ws` official README, heartbeat example and API usage: https://github.com/websockets/ws
- MDN Web Docs, WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- MDN Web Docs, Writing WebSocket servers: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers

## Issues Found
- The basic server heartbeat example defined `CLIENT_TIMEOUT` but never used it. Removed the unused constant so the snippet does not imply a separate timeout mechanism that is not implemented.
- The advanced heartbeat manager accepted and stored a `timeout` option, and the usage comment said it would wait 35 seconds for pong, but the code actually terminates based on `maxMissedPings`. Removed the unused option and misleading usage line.
- The client-side heartbeat example could leave an older pong timeout active if `sendPing()` were called again before the previous timeout fired. Added a `clearTimeout()` before creating a new pong timeout.
- The hybrid heartbeat example parsed incoming JSON without error handling, unlike the earlier application-level server example. Added guarded parsing so malformed non-heartbeat messages do not throw out of the message handler.
- The recovery heartbeat example could also stack stale pong timeout handles. Added `clearTimeout()` before setting a new heartbeat timeout.
- The monitoring example calculated a recent dead-connection "rate" by averaging cumulative counters, which can produce misleading alerts. Changed it to compute the delta across the recent metrics window.

## Review Notes
- The protocol-level ping/pong explanation is consistent with RFC 6455: ping uses opcode `0x9`, pong uses opcode `0xA`, and a pong response must carry the same application data as the ping.
- The `ws` server heartbeat pattern is consistent with the official `ws` README example using `isAlive`, `pong`, `ping()`, and `terminate()`.
- Browser WebSocket applications cannot directly send protocol ping frames through the standard WebSocket API, so the application-level heartbeat examples are appropriate for browser clients.
