# Validation Summary: How to Fix WebSocket Performance Issues

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- WebSocket protocol
- Node.js
- ws WebSocket library
- Node.js worker_threads
- Python websockets
- Redis Pub/Sub
- ioredis
- Nginx reverse proxy and load balancing
- Browser WebSocket API
- Prometheus prom-client

## Sources Consulted
- RFC 6455: The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- ws package documentation: https://www.npmjs.com/package/ws
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- Node.js worker_threads documentation: https://nodejs.org/api/worker_threads.html
- Python websockets documentation: https://websockets.readthedocs.io/
- Python websockets exceptions reference: https://websockets.readthedocs.io/en/stable/reference/exceptions.html
- ioredis Pub/Sub documentation: https://github.com/redis/ioredis
- ioredis API documentation: https://redis.github.io/ioredis/classes/Redis.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- MDN WebSocket API reference: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- prom-client documentation: https://github.com/siimon/prom-client
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus metric and label naming documentation: https://prometheus.io/docs/practices/naming/

## Issues Found
- The first JavaScript code fence redeclared `WebSocket`, `wss`, and `clients` in the same scope for the BAD and GOOD examples. Wrapped the BAD example in its own block so the combined snippet is syntactically valid JavaScript.
- The connection cleanup example could call cleanup twice from both `error` and `close`, and the stale-connection terminator removed the client before the close handler could perform resource cleanup. Added idempotent cleanup and let `terminate()` drive the close cleanup path.
- The memory section claimed to stream large messages, but the `ws` `message` event receives a complete message. Updated the wording to say large messages are routed to a dedicated handler instead of claiming streaming.
- The Python queue sender could start multiple sender tasks, and it had a race where a message could be appended while `is_sending` was being reset. Moved sender state changes under the lock and switched to `asyncio.get_running_loop().time()`.
- The worker-thread pool could resolve concurrent tasks on the same worker with the wrong result because responses were not correlated to requests. Added request IDs, per-worker callback maps, and worker-side error responses.
- The Redis direct-message path published to per-server channels but never subscribed to the current server's direct channel, never stored user-to-server mappings, and keyed local clients by generated connection IDs rather than user IDs. Added a server ID, direct-channel subscription, user mapping lifecycle, and local direct-send handling.
- The Nginx example used `proxy_connect_timeout 7d`; Nginx documentation notes this timeout normally cannot exceed 75 seconds. Changed it to `60s` and used `3600s` for send/read timeouts.
- The browser WebSocket client called `this.emit('message', message)` even though the class did not implement an event emitter. Replaced it with an optional `onMessage` callback.
- The Prometheus active-connection gauge was named `websocket_connections_total`, which suggests a counter. Renamed it to `websocket_active_connections`.

## Review Notes
- The examples still use application-specific helper functions such as `generateUniqueId`, `processMessage`, `heavyComputation`, and `getUserIdFromRequest`; those are reasonable placeholders for a blog post.
- Redis currently recommends node-redis for new Node.js projects, but the ioredis API used in the post remains a valid client API and the example is internally consistent after the direct-message fixes.
- Local verification parsed all JavaScript and Python code fences successfully. The snippets were not executed end-to-end because they intentionally depend on application-specific helper functions and external services.
