# Validation Summary: How to Scale WebSocket Servers with Redis Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Pub/Sub
- WebSocket (ws library)
- Socket.IO with @socket.io/redis-adapter
- Node.js
- ioredis (Redis client for Node.js)
- node-redis (Redis client for Node.js)

## Sources Consulted
- Socket.IO Redis adapter official documentation: https://socket.io/docs/v4/redis-adapter/
- ioredis README and API documentation: https://github.com/redis/ioredis
- node-redis documentation: https://github.com/redis/node-redis
- Redis SUBSCRIBE command documentation: https://redis.io/commands/subscribe/
- Redis PSUBSCRIBE command documentation: https://redis.io/commands/psubscribe/

## Issues Found

### Issue 1: Incorrect npm package in install command (Section 2)
- **What was wrong:** The npm install command listed `ioredis` as a dependency, but the code imports `createClient` from the `redis` (node-redis v4+) package. These are two different Redis client libraries with different APIs.
- **What was changed:** Changed `npm install socket.io @socket.io/redis-adapter ioredis` to `npm install socket.io @socket.io/redis-adapter redis`.
- **Why:** The `@socket.io/redis-adapter` supports both `redis` and `ioredis`, but the code example uses the `redis` package API (`createClient`, `.duplicate()`, `.connect()`). The install command must match the imports.

### Issue 2: Invalid glob pattern with `subscribe` (Section 3)
- **What was wrong:** `subscriber.subscribe('ws:room:*')` does not perform pattern matching. Redis `SUBSCRIBE` subscribes to exact channel names, so this subscribed to a literal channel named `ws:room:*`. Pattern matching requires `PSUBSCRIBE`. Additionally, this line was redundant since the code already dynamically subscribes to specific room channels on demand when clients join.
- **What was changed:** Removed the `subscriber.subscribe('ws:room:*')` line entirely.
- **Why:** The on-demand `subscriber.subscribe(channel)` calls inside the `ws.on('message')` handler already handle room subscriptions correctly. The pattern subscribe line was both incorrect in its mechanism and unnecessary.

### Issue 3: Wrong event handler for `subscribe` (Section 3)
- **What was wrong:** The code used `subscriber.on('pmessage', (pattern, channel, message) => { ... })`. The `pmessage` event is only emitted for pattern subscriptions made via `psubscribe`. Since the code uses `subscribe` (exact channel subscriptions), the correct event is `message` with the callback signature `(channel, message)`.
- **What was changed:** Changed `subscriber.on('pmessage', (pattern, channel, message) => {` to `subscriber.on('message', (channel, message) => {`.
- **Why:** With ioredis, `subscribe` emits `message` events and `psubscribe` emits `pmessage` events. Using the wrong event handler means no messages would ever be received.

## Review Notes
- The raw WebSocket example tracks only one channel per client via `ws.currentChannel`. If a client subscribes to multiple rooms, only the last room is tracked for cleanup on disconnect. This is an acceptable simplification for a tutorial but would need improvement in production code.
- The `total_connections` counter using `INCR`/`DECR` could drift if a server crashes without cleanly unregistering its clients. A production system would typically use server-specific keys with TTLs and periodic reconciliation instead.
- The overall architecture and explanation of the scaling problem are accurate and well-presented.
