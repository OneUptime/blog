# Validation Summary: How to Create MongoDB TTL Index Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB TTL indexes
- MongoDB partial indexes
- MongoDB capped collections
- MongoDB serverStatus TTL metrics
- JavaScript / MongoDB Node.js driver-style examples
- mongosh commands

## Sources Consulted
- MongoDB Manual: TTL Indexes - https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: Expire Data from Collections by Setting TTL - https://www.mongodb.com/docs/manual/tutorial/expire-data/
- MongoDB Manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: Sparse Indexes - https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: db.collection.deleteMany() - https://www.mongodb.com/docs/manual/reference/method/db.collection.deletemany/
- MongoDB Manual: Capped Collections - https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB Manual: collMod - https://www.mongodb.com/docs/manual/reference/command/collmod/
- MongoDB Manual: serverStatus - https://www.mongodb.com/docs/manual/reference/command/serverstatus/

## Issues Found
- The opening flowchart said deleted documents lead to "Space Reclaimed." MongoDB deletes make storage available for reuse, but file space is not necessarily returned to the operating system immediately. Changed the diagram label to "Storage Reused Over Time."
- The expiration characteristics said TTL deletions "do not block other operations." TTL work runs in the background, but the deletes are still normal delete operations that consume server resources. Updated the wording to avoid implying zero operational impact.
- The TTL monitoring helper divided by `passesInPeriod` without checking for zero, which could produce `Infinity` or `NaN` if no TTL pass occurred during the sample interval. Added a zero-pass guard.
- The manual batch-delete helper passed `{ limit: batchSize }` to `deleteMany()`. MongoDB's `deleteMany()` options do not include `limit`. Reworked the example to fetch a limited batch of `_id` values and then delete those IDs.
- The manual batch-delete helper mixed async JavaScript with shell-style `db[collectionName]` access. Updated it to use `db.collection(collectionName)`, matching MongoDB Node.js driver-style code.

## Review Notes
The main TTL index behavior, `expireAfterSeconds: 0` pattern, partial TTL index examples, `collMod` usage for changing `expireAfterSeconds`, primary-only TTL deletion behavior in replica sets, and date-field requirements are consistent with MongoDB documentation. Future improvements could mention TTL monitor batching limits and that creating a TTL index when many existing documents already qualify for expiration can create an initial delete workload.
