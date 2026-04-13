# Validation Summary: How to Scale WebSocket Connections with MongoDB Change Streams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- Node.js
- Socket.io (server and client)
- Socket.io Redis Adapter (`@socket.io/redis-adapter`)
- Redis pub/sub (via ioredis)
- Express.js
- PM2 (process manager, cluster mode)

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB `$toLong` aggregation operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/toLong/
- Socket.io documentation: https://socket.io/docs/v4/
- Socket.io Redis Adapter documentation: https://socket.io/docs/v4/redis-adapter/
- Socket.io client documentation: https://socket.io/docs/v4/client-api/
- ioredis documentation: https://github.com/redis/ioredis
- PM2 documentation: https://pm2.keymetrics.io/docs/usage/cluster-mode/

## Issues Found

1. **Missing `@socket.io/redis-adapter` in npm install command.** The server code imports `@socket.io/redis-adapter` but the install command only listed `mongodb socket.io express ioredis`. Added `@socket.io/redis-adapter` to the install command.

2. **`$toLong` cannot convert ObjectId in partitioned change streams.** The original code used `{ $toLong: "$documentKey._id" }` to partition by document ID. MongoDB's `$toLong` operator only works with booleans, doubles, decimals, integers, longs, numeric strings, and dates — not ObjectIds. Changed the example to partition by a numeric document field (`fullDocument.userId`) and added `fullDocument: "updateLookup"` option. Added a comment explaining the limitation.

3. **Client-side code used native WebSocket API instead of Socket.io client.** The server uses Socket.io, which has its own protocol on top of WebSocket/Engine.IO. A native `WebSocket` client cannot connect to a Socket.io server. Replaced the entire client section with proper Socket.io client usage, including the built-in reconnection configuration (which supports the same exponential backoff pattern the original code implemented manually).

4. **PM2 cluster mode would cause duplicate events.** With PM2 cluster mode, each worker process opens its own change stream watching the same collection. When each worker calls `io.emit()`, the Redis adapter broadcasts to ALL connected clients across all servers. This means N workers produce N duplicate messages per change event. Added a comment in the PM2 config section warning about this and directing readers to use partitioned change streams.

## Review Notes
- The overall architecture (MongoDB change streams + Socket.io Redis adapter for multi-server broadcasting) is sound and well-explained.
- The `io.sockets.sockets.size` usage in the monitoring section is correct for Socket.io v4 where `sockets` is a Map.
- The partitioned change streams approach with `fullDocument: "updateLookup"` will not capture delete events (since `fullDocument` is null for deletes). This is a trade-off worth noting but was not flagged as an error since it depends on application requirements.
- The backpressure/connection limit code is a useful pattern but the `MAX_CHANGE_STREAMS = 10` limit is arbitrary. The actual limit depends on MongoDB server configuration and available resources.
