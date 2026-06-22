# Validation Summary: How to Configure Kafka Connect for Database CDC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Connect
- Debezium
- PostgreSQL logical replication
- MySQL binary logging
- Kafka Connect REST API
- Avro serialization and Schema Registry
- Kafka Connect Single Message Transforms
- JMX monitoring

## Sources Consulted
- Apache Kafka Connect configuration reference: https://kafka.apache.org/41/configuration/kafka-connect-configs/
- Confluent Kafka Connect REST API reference: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Debezium 2.4 PostgreSQL connector documentation: https://debezium.io/documentation/reference/2.4/connectors/postgresql.html
- Debezium 2.4 MySQL connector documentation: https://debezium.io/documentation/reference/2.4/connectors/mysql.html
- Debezium 2.4 Avro serialization documentation: https://debezium.io/documentation/reference/2.4/configuration/avro.html
- Debezium 2.4 event flattening SMT documentation: https://debezium.io/documentation/reference/2.4/transformations/event-flattening.html
- Debezium 2.4 release series compatibility notes: https://debezium.io/releases/2.4/
- MySQL binary logging options documentation: https://dev.mysql.com/doc/mysql-replication-excerpt/8.0/en/replication-options-binary-log.html
- PostgreSQL replication configuration documentation: https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL CREATE PUBLICATION documentation: https://www.postgresql.org/docs/current/sql-createpublication.html

## Issues Found
- Removed `internal.key.converter` and `internal.value.converter` from the Kafka Connect worker config because modern Kafka Connect configuration references no longer list those worker properties.
- Replaced `rest.host.name` and `rest.port` with `listeners=HTTP://0.0.0.0:8083`, which matches current Kafka Connect listener configuration.
- Replaced deprecated MySQL `expire_logs_days` with `binlog_expire_logs_seconds`.
- Removed `heartbeat.action.query` from the PostgreSQL connector example because the guide did not create the referenced heartbeat table; the remaining `heartbeat.interval.ms` setting is valid on its own.
- Changed the CDC message example from pseudo-JSON to valid JSON by replacing `"{ ... }"` with an empty schema object.
- Updated the consumer lag command to use an application consumer group placeholder instead of the Kafka Connect worker group.
- Clarified that schema history configuration applies to MySQL connectors, not PostgreSQL connectors.
- Updated the Kafka Connect config validation command to send the connector `config` object and use the fully qualified Debezium PostgreSQL connector class.
- Removed `tasks.max=4` from the high-latency tuning example because Debezium PostgreSQL and MySQL connectors always use a single task.

## Review Notes
Debezium 2.4 is an older release series, but the post explicitly uses Debezium 2.4.0.Final artifacts and the reviewed connector properties are valid for that series. A future refresh could update the post to the latest Debezium release series and its corresponding Kafka Connect compatibility baseline.
