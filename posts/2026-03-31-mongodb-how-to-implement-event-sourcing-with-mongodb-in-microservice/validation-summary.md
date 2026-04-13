# Validation Summary: How to Implement Event Sourcing with MongoDB in Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document model, change streams, unique indexes)
- Node.js
- MongoDB Node.js Driver (`mongodb` package)
- Event Sourcing pattern
- CQRS (Command Query Responsibility Segregation) via projections
- Microservices architecture

## Sources Consulted
- MongoDB Node.js Driver API documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB `createIndex` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB `replaceOne` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.replaceOne/
- MongoDB duplicate key error code 11000: https://www.mongodb.com/docs/manual/reference/error-codes/

## Issues Found
1. **Bug in `loadOrderWithSnapshot` — `_version` not updated after replaying events**: The `_apply` method on the Order aggregate does not update `_version`. When `loadOrderWithSnapshot` called `order._apply(event)` in a loop, the `_version` field remained at its snapshot value (or 0 if no snapshot existed). This meant the subsequent `snapshotStore.saveSnapshot(aggregateId, { ...order }, order._version)` call would save the snapshot with a stale version number. On the next load, events already applied would be fetched and re-applied, corrupting state. **Fix**: Updated the loop to set `order._version = event.sequenceNumber` after each `_apply` call, consistent with how `fromEvents` works elsewhere in the post.

## Review Notes
- The `MongoClient` import in `eventStore.js` is unused since the class accepts a `db` instance via its constructor. This is harmless and common in blog tutorials to indicate which package to install.
- The `appendEvent` method uses a find-then-insert pattern for optimistic concurrency. A concurrent insert with the same sequence number will be caught by the unique index (error code 11000). The method does not retry — it throws, leaving retry logic to the caller. This is a valid design choice.
- The change stream `fullDocument: 'updateLookup'` option is unnecessary for an insert-only event store (inserts always include the full document), but specifying it is not incorrect.
- The snapshot state saved via `{ ...order }` includes internal fields like `_pendingEvents`. In production code, a dedicated serialization method would be cleaner, but it works correctly in this tutorial context since `_pendingEvents` will always be empty at snapshot time.
