# Validation Summary: How to Implement WebSocket Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol
- Node.js
- TypeScript
- ws
- Socket.IO
- Jest-style asynchronous testing

## Sources Consulted
- RFC 6455: The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- ws README and API documentation: https://github.com/websockets/ws
- Socket.IO v4 testing documentation: https://socket.io/docs/v4/testing/
- Socket.IO v4 server API: https://socket.io/docs/v4/server-api/
- Socket.IO v4 server-side Socket instance documentation: https://socket.io/docs/v4/server-socket-instance/

## Issues Found
- The `ws` broadcast example attempted to read `(ws as any).server`, but `ws` WebSocket instances do not expose a server reference. Changed `handleMessage` to receive the `WebSocketServer` instance explicitly and use `wss.clients`, matching the official `ws` broadcast and heartbeat examples.
- The test server helper always listened on a random port, but the reconnection test claimed to restart the server on the same port. Added an optional `listenPort` parameter and used it in the restart examples.
- The test server shutdown helper only called `wss.close()`, which can leave existing WebSocket clients open. Added termination of connected clients before closing the WebSocket server and HTTP server so restart tests can release the port.
- The server-initiated close test installed the close listener after calling `client.close()`, creating a race where the close event could be missed. Moved the close promise setup before initiating the close.
- The connection error test used `ws://localhost:99999`, which is outside the valid TCP port range. Changed it to `ws://127.0.0.1:65535`.
- The exponential backoff test did not trigger retries because it connected to an already-running server. Changed it to stop the server, schedule a restart on the same port, assert multiple attempts, and verify the first retry delay.
- The Socket.IO teardown called both `ioServer.close()` and `httpServer.close(done)`. Socket.IO v4 documents that `server.close()` also closes the underlying HTTP server, so the example now uses `ioServer.close(done)`.
- The Socket.IO acknowledgment handler was registered in the test after creating a client, which could race with the connection event and also add extra listeners per test. Moved the handler into the main server connection setup.
- Removed an unused `Socket` import from the Socket.IO client example.

## Review Notes
The examples were reviewed against official documentation and statically checked for API correctness. They were not executed locally because this blog repository does not include `ws`, `socket.io`, or `socket.io-client` dependencies.
