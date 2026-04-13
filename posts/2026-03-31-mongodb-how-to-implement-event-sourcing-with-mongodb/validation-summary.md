# Validation Summary: How to Implement Event Sourcing with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document model, indexes, change streams)
- Node.js
- MongoDB Node.js Driver (v4+)
- Event Sourcing pattern
- CQRS (Command Query Responsibility Segregation)
- Optimistic concurrency control

## Sources Consulted
- MongoDB Node.js Driver API documentation — `Collection.findOne()`, `Collection.createIndex()`, `Collection.insertOne()`, `Collection.watch()` — https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Manual — Change Streams — https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Manual — Unique Indexes — https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB Manual — Duplicate Key Error Code 11000 — https://www.mongodb.com/docs/manual/reference/error-codes/

## Issues Found
1. **Unused `MongoClient` import in EventStore class** (line 49): `const { MongoClient } = require('mongodb');` was imported but never used. The `EventStore` class receives a `db` object through its constructor and does not instantiate a `MongoClient`. Removed the unused import to avoid confusing readers.

## Review Notes
- The `fullDocument: 'updateLookup'` option in the change stream `startListening()` method is redundant for an append-only event store (insert operations always include the full document in change events). It is not incorrect, but readers should know it is primarily useful for update operations.
- The `open()` command validates `initialDeposit < 0` but the error message says "must be positive," which technically permits zero. This is a business logic decision rather than a technical error.
- The optimistic concurrency implementation is well-structured: soft version check before insert plus the unique compound index on `(aggregateId, sequenceNumber)` as a hard safety net against race conditions.
- All MongoDB Node.js driver API calls are current and correct for driver v4+/v5+/v6+.
