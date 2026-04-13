# Validation Summary: How to Handle Event Ordering with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver v4+)
- MongoDB Change Streams
- MongoDB findOneAndUpdate / atomic operations
- Event Sourcing pattern
- Optimistic Concurrency Control

## Sources Consulted
- MongoDB Node.js Driver documentation for `findOneAndUpdate` return type and options (`returnDocument: "after"`) — https://www.mongodb.com/docs/drivers/node/current/usage-examples/findOneAndUpdate/
- MongoDB documentation on Change Streams ordering guarantees — https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB documentation on Change Streams behavior on sharded clusters — https://www.mongodb.com/docs/manual/changeStreams/#change-streams-on-sharded-clusters
- MongoDB documentation on duplicate key error code 11000 — https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB documentation on `$inc` operator — https://www.mongodb.com/docs/manual/reference/operator/update/inc/

## Issues Found
1. **Incorrect claim about change stream ordering on sharded clusters.** The post stated: "On sharded clusters, ordering is guaranteed per shard but not across shards. Use `globalSequence` for cross-shard ordering." This is misleading. Since MongoDB 4.0, change streams on sharded clusters DO provide a total ordering across shards — the `mongos` merges per-shard oplog entries using cluster time. Updated the note to clarify that total ordering is provided via cluster time, but that `globalSequence` may still be needed if strict causal ordering across different streams on different shards is required.

## Review Notes
- Strategy 2 (`appendEventAtomic`) does not use a transaction, so if the process crashes between the `findOneAndUpdate` on `stream_meta` and the `insertOne` on `events`, there will be a gap in the version sequence. This is a design trade-off rather than a bug, and the post doesn't claim transactional safety for this strategy.
- The `fullDocument: "updateLookup"` option in the change stream example is unnecessary for an insert-only event store (inserts always include the full document). It's not wrong, just redundant for this use case.
- The `getStreamVersion` and `ConcurrencyError` references in Strategy 1 are not defined in the post but are clearly implied helper functions/classes, which is acceptable for a tutorial.
