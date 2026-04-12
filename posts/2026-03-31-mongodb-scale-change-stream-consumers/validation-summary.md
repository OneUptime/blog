# Validation Summary: How to Scale Change Stream Consumers Across Multiple Processes in MongoDB

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- MongoDB Change Streams
- MongoDB Node.js Driver
- node-redis v4
- Redlock (distributed locking)
- Node.js worker_threads
- Redis (BLPOP-based work queue)

## Sources Consulted
- MongoDB Change Streams Documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Change Events Reference: https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB Node.js Driver - Change Streams: https://www.mongodb.com/docs/drivers/node/current/monitoring-and-logging/change-streams/
- MongoDB Change Streams Production Recommendations: https://www.mongodb.com/docs/manual/administration/change-streams-production-recommendations/
- node-redis v4 Migration Guide: https://github.com/redis/node-redis/blob/master/docs/v3-to-v4.md
- Redlock npm package: https://www.npmjs.com/package/redlock
- Node.js worker_threads Documentation: https://nodejs.org/api/worker_threads.html
- MDN Structured Clone Algorithm: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
- Redis BLPOP Command: https://redis.io/docs/latest/commands/blpop/

## Issues Found

1. **Strategy 3 - Worker Threads postMessage corrupts BSON types**: The original code passed raw change stream events via `worker.postMessage(event)`. The structured clone algorithm used by `postMessage` silently degrades BSON class instances (e.g., `ObjectId`, `Timestamp`) into empty plain objects `{}`, so the worker would receive corrupted event data. Fixed by serializing events to JSON strings before posting (`JSON.stringify(event)`) and deserializing on the worker side (`JSON.parse(serialized)`).

2. **Strategy 2 - Missing warning about chunk migrations**: The original note only mentioned out-of-order events across shards. However, connecting directly to shard replica set primaries (bypassing `mongos`) also risks missing events during chunk migrations between shards. MongoDB documentation recommends opening change streams through `mongos` for sharded clusters. Added a warning about this limitation.

## Review Notes
- All code examples use top-level `await` without an explicit async wrapper or ESM module context. This is a common blog post simplification and acceptable for readability.
- The `resumeAfter` option in the Leader Election example is correct, but note that after an `invalidate` event, `startAfter` must be used instead.
- The async callback in `parentPort.on("message", async ...)` will not propagate unhandled rejections from `processEvent` — in production, error handling should be added.
- The round-robin distribution to worker threads does not account for backpressure; busy workers will accumulate unbounded message queues. Production systems should implement flow control.
