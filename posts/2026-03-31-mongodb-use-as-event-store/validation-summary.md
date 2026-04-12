# Validation Summary: How to Use MongoDB as an Event Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell commands and Node.js driver)
- Event Sourcing / Event Store pattern
- CQRS (Command Query Responsibility Segregation)
- MongoDB Change Streams
- JavaScript / Node.js

## Sources Consulted
- MongoDB documentation on `createIndex` and unique indexes: https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB documentation on `insertOne`: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/
- MongoDB documentation on Change Streams: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB documentation on TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB duplicate key error code reference (error code 11000): https://www.mongodb.com/docs/manual/reference/error-codes/

## Issues Found
1. **TTL indexes described as "archiving" events**: The original text stated "TTL indexes can archive old events automatically." TTL indexes in MongoDB automatically *delete* expired documents — they do not archive or move them elsewhere. Changed "archive" to "automatically expire" to accurately describe TTL behavior. A reader relying on TTL indexes for archival could lose data if they believed documents were being preserved.

## Review Notes
- The `fullDocument: "updateLookup"` option in the change stream example is unnecessary for insert-only event streams (the full document is always included in insert change events), but it does not cause errors or incorrect behavior. It would become useful if the collection ever receives update operations.
- The post does not specify a minimum MongoDB version. Change streams require MongoDB 3.6+ and a replica set. This is a minor omission but worth noting for readers running standalone instances.
- The event store pattern shown uses single-document inserts. For high-throughput scenarios, batching events with `insertMany` within a transaction could improve performance, but the single-insert approach is correct for illustrating the pattern.
