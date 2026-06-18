# Validation Summary: How to Handle WebSocket Connection Pooling

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- WebSocket protocol
- Browser WebSocket API
- Node.js
- Node.js cluster module
- ws WebSocket library
- JavaScript connection pooling patterns
- Metrics and monitoring

## Sources Consulted
- Node.js cluster documentation: https://nodejs.org/api/cluster.html
- Node.js os.availableParallelism documentation: https://nodejs.org/api/os.html#osavailableparallelism
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- MDN WebSocket readyState documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
- MDN WebSocket send documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
- IANA WebSocket Close Code Number Registry: https://www.iana.org/assignments/websocket/websocket.xhtml
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455

## Issues Found
- The server-side cluster example used `cluster.isMaster`, which is deprecated in current Node.js. Changed it to `cluster.isPrimary`, matching current Node.js documentation.
- The server-side cluster example used `os.cpus().length` to size workers. Updated it to `availableParallelism()`, which Node.js documentation recommends for determining default parallelism.
- The cluster example registered both `cluster.on('message')` and `worker.on('message')`, causing each worker message to be handled twice. Removed the per-worker listener and kept the cluster-level listener.
- The `ws` message handler treated the message payload as directly parseable JSON without accounting for the documented `(data, isBinary)` signature. Updated the handler to accept `isBinary`, reject binary payloads with close code `1003`, and parse text with `message.toString()`.
- The worker stats interval called `process.send()` unconditionally. Updated it to `process.send?.(...)` so the snippet does not throw if the worker code is run outside an IPC-enabled cluster worker.
- The basic pool capacity check counted only active client mappings, not idle pooled connections. Added `getTotalConnectionCount()` and used it before creating another connection so the pool cannot exceed `maxConnections`.
- The basic pool used `String.prototype.substr()`, a legacy method. Replaced it with `slice()`.
- The client-side wait queue timeout tried to remove timed-out requests by comparing against the original Promise resolver, but the stored resolver was a wrapper function. Changed it to store a request object and remove that exact object.
- The priority preemption path re-queued a preempted client without `resolve` or `reject`, which could later crash `release()` when it called `waiting.resolve(...)`. Removed that invalid requeue because the code already notifies and closes the preempted client.

## Review Notes
The examples are educational and omit production concerns such as authentication, cross-worker pub/sub for broadcasts, backpressure handling with `bufferedAmount`, heartbeat/ping-pong liveness checks, graceful shutdown, and horizontal scaling across multiple hosts. These omissions are acceptable for the scope of the post but should be considered before using the snippets in production.
