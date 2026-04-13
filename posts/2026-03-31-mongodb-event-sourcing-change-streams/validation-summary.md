# Validation Summary: How to Build Event Sourcing with MongoDB Change Streams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Change Streams, $jsonSchema validation, collection watch API)
- Node.js MongoDB Driver
- KafkaJS
- Event Sourcing / CQRS architectural patterns

## Sources Consulted
- MongoDB $jsonSchema `bsonType` documentation: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/#available-keywords
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js Driver BSON serialization behavior (JavaScript numbers serialize as BSON doubles by default): https://www.mongodb.com/docs/drivers/node/current/fundamentals/bson/
- KafkaJS Producer documentation (connect required before send): https://kafka.js.org/docs/producing
- MongoDB duplicate key error code 11000: https://www.mongodb.com/docs/manual/core/write-operations-atomicity/

## Issues Found

1. **`bsonType: "int"` causes validation failure with Node.js driver** — The schema defined `version` with `bsonType: "int"` (BSON int32), but the Node.js MongoDB driver serializes JavaScript numbers as BSON doubles by default. This means `insertOne` with `version: expectedVersion + 1` would be rejected by the schema validator. Changed to `bsonType: "number"`, which accepts int32, int64, double, and decimal128.

2. **Missing `producer.connect()` in KafkaJS example** — The Kafka publishing section created a producer with `kafka.producer()` but never called `await producer.connect()` before `producer.send()`. KafkaJS requires an explicit connect call before producing messages. Added the missing `await producer.connect()` line.

## Review Notes
- The `fullDocument: "updateLookup"` option in the Change Stream watcher is unnecessary when only processing insert operations (inserts always include `fullDocument`), but it is not incorrect and does no harm.
- The Change Stream section uses `for await...of` (async iterator), while the Kafka section uses `.on("change", callback)` (EventEmitter). Both are valid APIs for MongoDB ChangeStream, but readers may be confused by the inconsistency. This is a stylistic observation, not an error.
- The post does not mention that Change Streams require a replica set or sharded cluster — they do not work on standalone MongoDB instances. This is worth noting for readers setting up a development environment.
- The snapshotting section's `loadOrderFromSnapshot` correctly uses optional chaining (`snapshot?.state ?? null`), which requires Node.js 14+.
