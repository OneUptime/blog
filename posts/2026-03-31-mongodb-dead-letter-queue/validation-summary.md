# Validation Summary: How to Implement Dead Letter Queues with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver)
- Node.js
- Dead Letter Queue pattern

## Sources Consulted
- MongoDB Node.js Driver API documentation: https://mongodb.github.io/node-mongodb-native/6.0/
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB `createIndexes` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndexes/
- MongoDB `findOneAndUpdate` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB Transactions documentation: https://www.mongodb.com/docs/manual/core/transactions/

## Issues Found

1. **Duplicate index on `movedAt` field** — The DLQ `createIndexes` call defined both a plain index `{ key: { movedAt: 1 } }` and a TTL index `{ key: { movedAt: 1 }, expireAfterSeconds: 7776000 }` on the same field. MongoDB does not allow two indexes on the same key pattern. Removed the redundant plain index since the TTL index already serves as a usable index on `movedAt`.

2. **Double increment of `attempts` counter** — The worker's `findOneAndUpdate` included `$inc: { attempts: 1 }`, and `failJob`'s retry branch also included `$inc: { attempts: 1 }`. This caused attempts to be incremented twice per failed processing cycle, meaning a job with `MAX_ATTEMPTS = 3` would only actually be processed twice before being moved to the DLQ. Fixed by removing the `$inc` from the worker and keeping attempt tracking solely in `failJob`, using a computed `nextAttempt` variable for clarity.

3. **`retryDelay` computed but never applied** — The backoff delay was calculated and logged but never used to actually delay the retry. The job was immediately set back to `pending` status. Fixed by storing a `nextRunAt` timestamp on the job document so the worker (or a scheduler) can respect the backoff delay.

4. **Incorrect "atomically" claim** — The post described the `insertOne` + `deleteOne` pattern as "atomic", but these are two separate operations without a transaction. If the process crashes between them, the job could exist in both collections or be lost. Updated the text to clarify that a multi-document transaction is needed for true atomicity.

## Review Notes
- The worker loop does not filter by `nextRunAt` when picking up jobs, so the backoff delay relies on an external scheduler or additional query logic to be fully effective. This is acceptable for a tutorial but worth noting for production use.
- The `replayDead` function loads all matching dead jobs into memory with `.toArray()`. For large DLQs, a cursor-based approach would be more memory-efficient.
- The aggregation pipeline for inspecting the DLQ uses `$last` for `lastError`, which depends on natural document order. In practice this works but is not guaranteed to return the chronologically latest error unless documents are sorted first.
