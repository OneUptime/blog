# Validation Summary: How to Fix 'Disconnect' Event Not Firing Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- WebSocket protocol
- Node.js
- `ws` WebSocket library
- Socket.IO v4
- JavaScript browser WebSocket API
- WebSocket heartbeat and ping/pong handling

## Sources Consulted
- `ws` README heartbeat guidance: https://github.com/websockets/ws#how-to-detect-and-close-broken-connections
- `ws` API documentation for `autoPong`, `close`, `ping`, `pong`, and `terminate`: https://github.com/websockets/ws/blob/master/doc/ws.md
- Socket.IO v4 server options for `pingInterval`, `pingTimeout`, `connectTimeout`, and transports: https://socket.io/docs/v4/server-options/
- Socket.IO v4 "How it works" heartbeat and disconnection detection: https://socket.io/docs/v4/how-it-works/
- Socket.IO v4 server API for server-side disconnect reasons and Engine.IO `connection_error`: https://socket.io/docs/v4/server-api/
- Socket.IO v4 middlewares documentation for middleware error behavior: https://socket.io/docs/v4/middlewares/
- Socket.IO v4 client API for client-side disconnect reasons and `connect_error`: https://socket.io/docs/v4/client-api/
- MDN WebSocket `close` event reference: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close_event
- WHATWG WebSockets Standard for close event behavior: https://websockets.spec.whatwg.org/

## Issues Found
- The Socket.IO example stated that default disconnect detection might take up to 5 minutes. Socket.IO v4 defaults are `pingInterval: 25000` and `pingTimeout: 20000`, so the default heartbeat window is about 45 seconds. Updated the wording and comment.
- The Socket.IO server-side disconnect handler used client-side reason strings (`io server disconnect` and `io client disconnect`). Updated them to the server-side reason strings documented for v4 (`server namespace disconnect` and `client namespace disconnect`) and added `server shutting down`.
- The Socket.IO server example listened for `io.on('connect_error')`, which is a client-side event for middleware connection failures. Replaced it with the server-side Engine.IO `io.engine.on('connection_error')` handler.
- The raw `ws` heartbeat example defined `HEARTBEAT_TIMEOUT` but did not use it. Removed the unused constant to avoid implying a timeout behavior that the code did not implement.
- The robust server example used `PING_INTERVAL = 15000` with `PONG_TIMEOUT = 20000`, which could create overlapping pong timeouts and false termination. Changed the pong timeout to 10 seconds so each timeout resolves before the next ping.
- The network failure test attempted to ignore pings by registering a `ping` listener, but `ws` automatically sends pongs by default. Updated the client construction to use `{ autoPong: false }`.

## Review Notes
The code snippets are illustrative and depend on external packages that are not installed in this blog repository, so they were reviewed against official documentation rather than executed locally. The test examples still focus on small client-side observations and would need a dedicated test harness to assert server-side cleanup behavior end to end.
