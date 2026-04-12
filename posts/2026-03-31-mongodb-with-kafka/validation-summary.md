# Validation Summary: How to Use MongoDB with Kafka for Event Streaming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Change Streams, replica sets)
- Apache Kafka (topics, producers, consumers)
- MongoDB Kafka Connector (source and sink connectors)
- Kafka Connect REST API
- KafkaJS (Node.js Kafka client)
- MongoDB Node.js Driver
- Confluent Hub CLI

## Sources Consulted
- [MongoDB Kafka Connector Documentation](https://www.mongodb.com/docs/kafka-connector/current/)
- [MongoDB Kafka Connector GitHub Releases](https://github.com/mongodb/mongo-kafka/releases) — confirmed version 1.13.0 exists; latest is r2.1.0
- [ReplaceOneBusinessKeyStrategy source code](https://github.com/mongodb/mongo-kafka/blob/master/src/main/java/com/mongodb/kafka/connect/sink/writemodel/strategy/ReplaceOneBusinessKeyStrategy.java) — confirmed upsert(true) is hardcoded
- [ReplaceOneDefaultStrategy source code](https://github.com/mongodb/mongo-kafka/blob/master/src/main/java/com/mongodb/kafka/connect/sink/writemodel/strategy/ReplaceOneDefaultStrategy.java) — confirmed upsert(true) is hardcoded, filters by _id
- [Write model strategy classes directory](https://github.com/mongodb/mongo-kafka/tree/master/src/main/java/com/mongodb/kafka/connect/sink/writemodel/strategy) — confirmed available strategies
- [Sink Connector Id Strategy Properties](https://www.mongodb.com/docs/kafka-connector/current/sink-connector/configuration-properties/id-strategy/) — verified ProvidedInKeyStrategy class path
- [Source Connector Output Format Properties](https://www.mongodb.com/docs/kafka-connector/current/source-connector/configuration-properties/output-format/) — confirmed json, bson, schema as valid values
- [Write Model Strategies documentation](https://www.mongodb.com/docs/kafka-connector/current/sink-connector/fundamentals/write-strategies/) — verified ReplaceOneBusinessKeyStrategy requires PartialValueStrategy for business key mapping

## Issues Found

### 1. Incorrect write model strategy in upsert example (Fixed)
**What was wrong:** The "Upsert Strategy for the Sink Connector" section used `ReplaceOneBusinessKeyStrategy` paired with `ProvidedInKeyStrategy`. `ReplaceOneBusinessKeyStrategy` expects the `_id` field to be a BsonDocument containing named business key fields, which is intended for use with `PartialValueStrategy`. When `ProvidedInKeyStrategy` provides a raw document `_id` from the Kafka message key (e.g., an ObjectId), the strategy would throw a `DataException` because the `_id` is not a BsonDocument with business key fields.

**What was changed:** Replaced `ReplaceOneBusinessKeyStrategy` with `ReplaceOneDefaultStrategy`, which correctly filters by `_id` and performs upsert by default — matching the described use case of syncing documents by their original `_id`.

### 2. Non-existent configuration property removed (Fixed)
**What was wrong:** The upsert connector config included `"writemodel.strategy.replace.with.upsert": "true"`, which is not a real MongoDB Kafka Connector configuration property. Both `ReplaceOneDefaultStrategy` and `ReplaceOneBusinessKeyStrategy` have `ReplaceOptions().upsert(true)` hardcoded — upsert is always enabled and cannot be toggled via configuration.

**What was changed:** Removed the `writemodel.strategy.replace.with.upsert` property from the connector configuration.

## Review Notes
- The connector version used in the manual download example (1.13.0) is valid but not the latest. The current latest is 2.1.0. This is acceptable since the post doesn't claim to use the latest version, and the APIs demonstrated are stable across versions.
- The `output.format.value` table lists `json` or `bson` as valid values. There is also a third valid value `schema`, but the table is describing what the example uses, not enumerating all options.
- Both JavaScript code examples use `require()` (CommonJS) with top-level `await`, which requires either ES module mode or wrapping in an async function. This is a common blog convention for brevity and does not affect the correctness of the MongoDB/Kafka API usage shown.
- The `resumeAfter: resumeToken` option is passed with an initial `null` value. The MongoDB Node.js driver handles this gracefully (treating it as unset), so this is not an error, though conditionally building the options object would be more explicit.
