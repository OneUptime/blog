# Validation Summary: How to Use Change Streams with the Kafka Connector for MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- Apache Kafka / Kafka Connect
- MongoDB Kafka Source Connector
- MongoDB Kafka Sink Connector
- CDC (Change Data Capture)

## Sources Consulted
- MongoDB Kafka Connector official documentation: https://www.mongodb.com/docs/kafka-connector/current/
- MongoDB Kafka Source Connector configuration reference: https://www.mongodb.com/docs/kafka-connector/current/source-connector/configuration-properties/
- MongoDB Kafka Sink Connector configuration reference: https://www.mongodb.com/docs/kafka-connector/current/sink-connector/configuration-properties/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- Apache Kafka Connect documentation: https://kafka.apache.org/documentation/#connect

## Issues Found

1. **Incorrect resume token storage claim**: The post stated that resume tokens are persisted to a MongoDB collection called `_mongodb_kafka_source_config`. This is incorrect — the MongoDB Kafka Source Connector uses Kafka Connect's standard offset storage mechanism (the `connect-offsets` Kafka topic in distributed mode, or a local file in standalone mode). Fixed the description and removed the misleading `topic.namespace.map` example that was presented as configuring a "resume token collection."

2. **Incorrect `publish.full.document.only` default value**: The post claimed the default for `publish.full.document.only` is `true`. The actual default is `false`. Fixed the wording in the "Publishing Delete Events" section to correctly state the default is `false` and clarify that the earlier example explicitly sets it to `true`.

3. **`change.stream.full.document: "whenAvailable"` version incompatibility**: The "Publishing Delete Events" section used `"whenAvailable"` as the value for `change.stream.full.document`, but this option requires MongoDB 6.0+, while the prerequisites state MongoDB 4.0+. Changed to `"default"` which is compatible with MongoDB 4.0+ and appropriate for the delete events use case (where there is no full document to look up anyway).

## Review Notes
- The connector class names (`MongoSourceConnector`, `MongoSinkConnector`) and their fully qualified paths are correct.
- The `pipeline` configuration syntax with escaped JSON is correct for the Kafka Connect REST API.
- The topic naming convention `{prefix}.{database}.{collection}` is accurate.
- The sink connector's `PartialValueStrategy` and `ReplaceOneBusinessKeyStrategy` class paths are correct.
- The Confluent Hub install command format is correct.
- If users need MongoDB 6.0+ features like `whenAvailable` or `required` for `change.stream.full.document`, the prerequisites section should be updated accordingly in a future revision.
