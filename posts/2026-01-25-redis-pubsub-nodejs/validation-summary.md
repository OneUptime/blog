# Validation Summary: How to Use Redis Pub/Sub with Node.js

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis Pub/Sub
- Redis Lists and string expiration commands
- Redis Cluster
- Node.js
- ioredis
- Express
- ws WebSocket server
- Node.js cluster module

## Sources Consulted
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis `SETEX` command documentation: https://redis.io/docs/latest/commands/setex/
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/
- ioredis Pub/Sub documentation: https://github.com/redis/ioredis#pubsub
- ioredis Cluster Pub/Sub documentation: https://github.com/redis/ioredis#pubsub-1
- Node.js cluster documentation: https://nodejs.org/api/cluster.html
- ws WebSocket documentation: https://github.com/websockets/ws

## Issues Found
- The WebSocket example compared `readyState` to the numeric literal `1` while commenting that this represented `WebSocket.OPEN`. Updated the import and comparison to use the documented `WebSocket.OPEN` constant from `ws`.
- The Node.js cluster example used `cluster.isMaster`, which has been deprecated since Node.js 16. Updated it to `cluster.isPrimary`.
- The reconnection example manually re-subscribed in the `ready` handler and wrapped `subscribe`/`psubscribe` in a way that would incorrectly track callback arguments as channel names. Simplified the example to rely on ioredis `autoResubscribe`, which is the documented/default behavior.
- The performance section described `Redis.Cluster` as connection pooling. Reworded the comment to describe it as a shared Redis Cluster client instead.
- The message-size check used `message.length`, which counts JavaScript UTF-16 code units rather than UTF-8 bytes. Updated it to `Buffer.byteLength(message, 'utf8')`.
- The large-payload example used Redis `SETEX`, which Redis documents as deprecated in favor of `SET` with `EX`. Updated it to `publisher.set(key, message, 'EX', 60)`.

## Review Notes
- Redis Pub/Sub provides at-most-once delivery, so the post's warning to use Redis Streams when guaranteed delivery or persistence is required is correct.
- In Redis Cluster, standard Pub/Sub works across the cluster, but Redis 7 also supports sharded Pub/Sub for better cluster scaling. The post does not need to cover that for this introductory guide.
