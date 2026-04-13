# Validation Summary: How to Use MongoDB as an Event Store for Event-Driven Architecture

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document model, indexes, change streams)
- Node.js MongoDB Driver (insertOne, find, replaceOne, watch)
- Event Sourcing pattern
- CQRS (Command Query Responsibility Segregation)
- Optimistic Concurrency Control

## Sources Consulted
- MongoDB documentation on `createIndex` and unique indexes: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB documentation on `insertOne`: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/
- MongoDB documentation on duplicate key error code 11000: https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB documentation on `replaceOne` with upsert: https://www.mongodb.com/docs/manual/reference/method/db.collection.replaceOne/
- MongoDB documentation on Change Streams: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB documentation on Change Stream `operationType` and `fullDocument`: https://www.mongodb.com/docs/manual/reference/change-events/

## Issues Found
No technical issues found.

## Review Notes
- The `applyEvent` function's `default` case does not update the `version` field on the state for unrecognized event types. This is a design choice in the simplified example rather than a bug, but production implementations should consider handling unknown event types more explicitly (e.g., logging a warning or throwing an error).
- Change streams require a MongoDB replica set or sharded cluster. The post does not mention this prerequisite, though it is a deployment concern rather than a code correctness issue.
- The snapshot pattern stores the full state object inside the snapshot document. For very large aggregate states, this could approach MongoDB's 16 MB document size limit, though this is unlikely for most use cases.
