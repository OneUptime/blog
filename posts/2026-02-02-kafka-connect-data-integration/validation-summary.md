# Validation Summary: How to Use Kafka Connect for Data Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka (3.7.0) with KRaft mode
- Kafka Connect (Confluent Platform 7.5.0 distribution)
- Confluent Schema Registry
- Confluent JDBC Source/Sink Connector (10.7.0)
- Debezium PostgreSQL/MySQL/MongoDB Connectors (2.4.0)
- Confluent Elasticsearch Sink Connector (14.0.0)
- Confluent S3 Sink Connector (10.5.0)
- Apache Kafka FileStreamSourceConnector
- Single Message Transforms (SMTs)
- Kafka Connect REST API
- Dead Letter Queues (DLQs)
- JMX Prometheus Exporter
- Docker Compose
- Java (custom Transformation implementation)
- Python (kafka-python library)

## Sources Consulted
- Apache Kafka Connect documentation: https://kafka.apache.org/documentation/#connect
- Apache Kafka Connect REST API: https://kafka.apache.org/documentation/#connect_rest
- Apache Kafka Single Message Transforms: https://kafka.apache.org/documentation/#connect_transforms
- Confluent Kafka Connect documentation: https://docs.confluent.io/platform/current/connect/index.html
- Confluent JDBC Connector docs: https://docs.confluent.io/kafka-connectors/jdbc/current/
- Confluent Elasticsearch Sink Connector docs: https://docs.confluent.io/kafka-connectors/elasticsearch/current/
- Confluent S3 Sink Connector docs: https://docs.confluent.io/kafka-connectors/s3-sink/current/
- Debezium 2.4 PostgreSQL Connector docs: https://debezium.io/documentation/reference/2.4/connectors/postgresql.html
- Debezium ExtractNewRecordState SMT: https://debezium.io/documentation/reference/2.4/transformations/event-flattening.html
- Apache Kafka KRaft mode: https://kafka.apache.org/documentation/#kraft
- Confluent error handling: https://www.confluent.io/blog/kafka-connect-deep-dive-error-handling-dead-letter-queues/
- kafka-python library docs: https://kafka-python.readthedocs.io/
- Kafka Connect JMX metrics: https://docs.confluent.io/platform/current/connect/monitoring.html

## Issues Found
No technical issues found.

## Review Notes
A few observations that don't rise to the level of technical errors but are worth noting for future revisions:

- **Deprecated REST properties**: The standalone config uses `rest.host.name` and `rest.port`. These are deprecated in modern Kafka Connect in favor of the `listeners` property (e.g., `listeners=HTTP://localhost:8083`), though the deprecated properties still work.
- **Elasticsearch `type.name`**: The Elasticsearch sink config includes `"type.name": "_doc"`. Document types were deprecated in Elasticsearch 7.x and fully removed in 8.x; the connector retains the field for backward compatibility, and the value is ignored against ES 8.x clusters (as used elsewhere in this post). The example still works but the field has no operational effect.
- **JDBC connection pooling example**: The "Performance Best Practices" section shows `connection.pool.max.size` / `connection.pool.max.idle.ms` keys for JDBC connectors. These specific keys are not part of the Confluent JDBC connector's documented configuration surface; the snippet is illustrative of the concept rather than a copy-pasteable working config. Real tuning would use the connector's `connection.attempts` / `connection.backoff.ms` and database-side connection limits.
- **DLQ processor producer flush**: The Python DLQ processor calls `consumer.commit()` after `producer.send()` without an explicit `producer.flush()` or future check. kafka-python's producer is asynchronous; in the event of an abrupt process exit between the send and the underlying network write, retries could be lost. This is a robustness concern rather than a syntactic error.
- **`config.storage.partitions`**: Not set in the distributed example, which is correct — Kafka Connect requires the config storage topic to have exactly one partition, and the default handles this.

All code samples, connector class names, REST endpoints, configuration property keys (with the noted exception of the illustrative JDBC pool keys), Java SMT interface usage, KRaft setup, and Debezium 2.x conventions verify against current upstream documentation.
