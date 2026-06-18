# Validation Summary: How to Fix 'Broadcast Failed' WebSocket Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- WebSocket protocol
- Node.js
- `ws` WebSocket library
- WebSocket broadcasting patterns
- Backpressure and `bufferedAmount`
- Ping/pong heartbeat handling

## Sources Consulted
- `ws` API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- MDN WebSocket `readyState` documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
- MDN WebSocket `send()` documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
- WHATWG WebSockets Standard: https://websockets.spec.whatwg.org/
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455

## Issues Found
- The connection-state example said `client.send()` "will throw if client is not OPEN." For WebSocket APIs, `send()` throws in the CONNECTING state, while CLOSING/CLOSED behavior can be silent discard in browsers or callback-based failure in `ws`. Updated the comment to say it can throw or fail asynchronously when not OPEN.
- The backpressure section said a full send buffer can block the server. In `ws` and browser WebSocket APIs, sending queues data and `bufferedAmount` exposes queued bytes; the more precise failure modes are memory growth, delayed delivery, socket closure, or message loss. Updated the explanation accordingly.
- The robust broadcaster returned success immediately after calling `ws.send()` and only logged callback errors later. This could report a failed send as successful. Updated `trySend()` to await the `ws.send()` callback and to enforce the configured message timeout.
- Retry classification passed `result.error` into `isRetryableError()`, but the retry decision needed the result code. Updated it to pass the full result object and check `result.code`.
- The message queue example described retrying failed recipients by setting `message.options.onlyFailed`, but the broadcaster did not implement an `onlyFailed` option. Updated the retry path to use the existing `filter` option and restrict the retry to failed client IDs.
- The queue code comment claimed "delivery with persistence," but the example uses an in-memory queue. Updated the comment to avoid implying durable persistence.

## Review Notes
All JavaScript examples were syntax-checked after correction. The examples remain illustrative and in-memory; production systems may need durable queues, stronger client IDs, authentication/authorization checks, and centralized metrics storage.
