# Validation Summary: How to Build an Email Queue with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (findOneAndUpdate, aggregation, TTL indexes, partial filter expressions, compound indexes)
- Node.js (MongoDB Node.js Driver v6+)
- JavaScript (async/await, exponential backoff)

## Sources Consulted
- MongoDB documentation on `findOneAndUpdate`: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB documentation on TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB documentation on partial filter expressions: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB documentation on `$group` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB Node.js Driver v6 API for `findOneAndUpdate` return type and `returnDocument` option: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found

### 1. Stale lock detection did not recover crashed workers (Critical)
**What was wrong:** The `claimNextJob` function filtered for `status: "pending"` with a nested `$or` on `lockedAt` (null or stale). However, when a worker crashes mid-processing, the job has `status: "processing"` — not `"pending"`. This meant the stale lock condition (`lockedAt: { $lt: lockExpiry }`) could never match a crashed worker's job, contradicting the summary's claim that "stale lock detection recovers from crashed workers."

**What was changed:** Restructured the query filter to use a top-level `$or` with two branches:
- `{ status: "pending", processAfter: { $lte: now } }` — normal job claiming
- `{ status: "processing", lockedAt: { $lt: lockExpiry } }` — reclaim jobs from crashed workers

**Why:** Without this fix, any job whose worker crashed after claiming but before completing would be permanently stuck in `"processing"` status with no recovery path.

### 2. `lockedBy` not cleared on success path (Minor)
**What was wrong:** The success `updateOne` cleared `lockedAt` but not `lockedBy`, while the error handling path cleared both fields. This was inconsistent.

**What was changed:** Added `lockedBy: null` to the success path's `$set` operation to match the error handling behavior.

**Why:** Consistency in a tutorial. While not a functional bug (the job status is "sent" and won't be re-queried), leaving stale worker IDs on completed jobs is untidy and could confuse readers implementing this pattern.

## Review Notes
- The compound index `{ status: 1, processAfter: 1, lockedAt: 1 }` still supports the corrected query, though the second `$or` branch (status + lockedAt) skips the middle field. For high-throughput queues, an additional index on `{ status: 1, lockedAt: 1 }` could improve stale lock recovery performance. This is acceptable for a tutorial.
- The code uses `returnDocument: "after"` and treats the return value as the document directly, which is correct for the MongoDB Node.js Driver v6+ (where `includeResultMetadata` defaults to `false`). Users on older driver versions (v4/v5) would need `.value` to extract the document.
- The exponential backoff formula `Math.pow(2, attempts) * 60 * 1000` grows to 8 minutes at attempt 3. For production use, a cap on backoff duration would be advisable, but this is fine for a tutorial.
- The TTL index with `partialFilterExpression: { sentAt: { $ne: null } }` is correctly used — this is supported since MongoDB 3.2 and efficiently limits the index to only completed jobs.
