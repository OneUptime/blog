# Validation Summary: How to Fix 'Connection Closed Abnormally' WebSocket Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- WebSocket protocol and close codes
- Browser WebSocket API
- Node.js
- ws Node.js WebSocket library
- Nginx reverse proxy configuration
- TLS certificate validation
- JavaScript heartbeat and reconnection logic

## Sources Consulted
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- MDN Web Docs, CloseEvent code property: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
- MDN Web Docs, WebSocket close() method: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close
- ws official documentation and README: https://github.com/websockets/ws
- ws API documentation for WebSocketServer options: https://github.com/websockets/ws/blob/master/doc/ws.md
- Nginx official WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Node.js errors documentation: https://nodejs.org/api/errors.html

## Issues Found
- The first browser client example initialized `isConnecting` to `false`, so its "failed during connection attempt" branch could never run before the first successful `open` event. Changed it to initialize as `true`.
- The browser heartbeat example called `socket.close()` after a pong timeout while reconnecting only on close code `1006`. A local `close()` can produce a clean or application-level close rather than `1006`, so the example could fail to reconnect after its own heartbeat timeout. Added a `reconnectAfterClose` flag and a valid private close code.
- The first browser client example referenced `scheduleReconnect()` without defining it. Added a small placeholder function so the snippet is structurally complete.
- The server example referenced `allowedOrigins` and `handleMessage()` without defining them. Added a minimal allowed-origin set and a placeholder handler, and used `Set.prototype.has()` for the origin check.
- The TLS browser example checked `socket.wasEverOpen`, but the code tracked the state in a separate `wasEverOpen` variable. Changed the close handler to check the actual variable.
- The robust client implementation had the same heartbeat reconnection mismatch as the first browser example: pong timeout called `close()` while reconnection only watched for `1006`. Added a `reconnectAfterClose` flag and used a valid private close code for heartbeat timeout closes.
- The robust client implementation could leave an older pong timeout active if another heartbeat started a new timer. Added `stopPongTimer()` before setting a new pong timer.

## Review Notes
The post's main technical claims about close code `1006`, reserved close codes, browser-level application heartbeats, Nginx WebSocket timeout behavior, Node.js TLS error codes, and ws ping/pong usage are consistent with the consulted specifications and official documentation. The ws `verifyClient` option is still documented, but its usage is discouraged by the ws documentation; a future revision could show HTTP upgrade handling for authentication/origin checks instead.
