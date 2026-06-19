# Validation Summary: How to Configure Kafka Connect Connectors

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Apache Kafka Connect
- Kafka Connect REST API
- Kafka Connect Single Message Transforms
- Debezium PostgreSQL connector
- Confluent JDBC Source connector
- Confluent Elasticsearch Sink connector
- Confluent Amazon S3 Sink connector
- Python requests

## Sources Consulted
- Apache Kafka Connect User Guide: https://kafka.apache.org/40/kafka-connect/user-guide/
- Apache Kafka Configuration Providers: https://kafka.apache.org/40/configuration/configuration-providers/
- Confluent Kafka Connect Worker Configuration Properties: https://docs.confluent.io/platform/current/connect/references/allconfigs.html
- Confluent Kafka Connect REST API Reference: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Debezium PostgreSQL Connector Documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium New Record State Extraction SMT Documentation: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- Confluent JDBC Source Connector Configuration Reference: https://docs.confluent.io/kafka-connectors/jdbc/current/source-connector/source_config_options.html
- Confluent Elasticsearch Sink Connector Configuration Reference: https://docs.confluent.io/kafka-connectors/elasticsearch/current/configuration_options.html
- Confluent Amazon S3 Sink Connector Configuration Reference: https://docs.confluent.io/kafka-connectors/s3-sink/current/configuration_options.html

## Issues Found
- The connector examples used `${file:...}` secret placeholders, but the worker configuration did not enable a file config provider. Added `config.providers=file` and `config.providers.file.class=org.apache.kafka.common.config.provider.FileConfigProvider`.
- The Debezium PostgreSQL example included the obsolete `database.server.name` property alongside the current `topic.prefix` property. Removed `database.server.name`.
- The Debezium heartbeat topic property used the old `heartbeat.topics.prefix` name. Changed it to the current `topic.heartbeat.prefix`.
- The Debezium unwrap SMT used older delete/tombstone options. Replaced `drop.tombstones=false` and `delete.handling.mode=rewrite` with `delete.tombstone.handling.mode=rewrite-with-tombstone`.
- The Elasticsearch Sink connector example included `type.name`, which is not part of the current self-managed connector configuration reference for Elasticsearch 7+ / 8+. Removed it.
- The Elasticsearch Sink connector example used lowercase values for enum-like settings. Updated `write.method` and `behavior.on.null.values` to documented uppercase values.
- The S3 Sink connector example configured a time-based `path.format` and `partition.duration.ms` without setting `partitioner.class`. Added `io.confluent.connect.storage.partitioner.TimeBasedPartitioner`.
- The SMT predicate example put `negate` on the predicate configuration. Kafka Connect documents `negate` as an implicit transform property, not a predicate property. Updated the example to explicitly filter tombstone records using a `RecordIsTombstone` predicate.
- The REST validation command reused the full connector create payload file name, but the validation endpoint expects a connector configuration object. Changed the example file name to `connector-config-only.json`.
- The Python restart helper did not treat `202 Accepted` as a successful response, even though Kafka Connect returns it for asynchronous restart operations. Added `202` to the accepted status codes.

## Review Notes
The examples are version-sensitive because Debezium and Confluent connector properties change across major releases. The reviewed post now aligns with the current official documentation consulted on 2026-06-19.
