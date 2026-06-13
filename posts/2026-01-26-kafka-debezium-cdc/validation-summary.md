# Validation Summary: How to Stream Database Changes with Debezium in Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Kafka Connect
- Debezium
- PostgreSQL logical replication
- MySQL binary logging
- Docker Compose
- Java Spring Kafka
- Jackson JSON processing

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium MySQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium 2.4 PostgreSQL connector documentation source: https://raw.githubusercontent.com/debezium/debezium/v2.4.2.Final/documentation/modules/ROOT/pages/connectors/postgresql.adoc
- Debezium 2.4 MySQL connector documentation source: https://raw.githubusercontent.com/debezium/debezium/v2.4.2.Final/documentation/modules/ROOT/pages/connectors/mysql.adoc
- Debezium 2.4 event flattening SMT documentation source: https://raw.githubusercontent.com/debezium/debezium/v2.4.2.Final/documentation/modules/ROOT/pages/transformations/event-flattening.adoc
- Debezium event flattening SMT documentation: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- Debezium Docker image documentation: https://hub.docker.com/r/debezium/connect
- PostgreSQL logical replication configuration documentation: https://www.postgresql.org/docs/current/logical-replication-config.html
- PostgreSQL CREATE PUBLICATION documentation: https://www.postgresql.org/docs/current/sql-createpublication.html
- Confluent Kafka Connect source connector configuration reference: https://docs.confluent.io/platform/current/installation/configuration/connect/source-connect-configs.html
- Confluent Kafka Connect sink connector configuration reference: https://docs.confluent.io/platform/current/installation/configuration/connect/sink-connect-configs.html

## Issues Found
- The Debezium Docker image referenced Docker Hub even though the image documentation states the repository has moved to Quay. Changed `debezium/connect:2.4` to `quay.io/debezium/connect:2.4`.
- The PostgreSQL update/delete examples implied full previous row values are always present in `before`. Debezium documents that PostgreSQL's default replica identity generally exposes only previous primary-key values. Added `ALTER TABLE customers REPLICA IDENTITY FULL` and changed the update handler to avoid reading `before.name`.
- The MySQL example used the same server ID value for the MySQL server and the Debezium connector. Debezium requires unique IDs for each server and replication client, so the connector ID was changed to `184054` and the MySQL server ID to `223344`.
- The MySQL binlog retention example used deprecated `expire_logs_days`. Replaced it with `binlog_expire_logs_seconds = 604800`.
- Two fenced `json` examples used ellipsis placeholders that were not valid JSON. Replaced them with minimal valid JSON structures.
- The Java listener called Jackson `readTree` without handling its checked exception. Added `throws Exception` to the listener method.
- The monitoring MBean examples used the non-specific `debezium.metrics` domain. Replaced them with PostgreSQL connector MBean names for streaming and snapshot metrics.
- The failure-handling section configured dead letter queue properties as if they applied to the Debezium source connector. Kafka Connect DLQ properties are for sink connector failed records, so the source connector example was changed to logging/tolerance settings and the text now notes that DLQs belong on sink connectors consuming Debezium topics.

## Review Notes
The post pins Debezium 2.4, so the SMT and snapshot-mode examples were validated against Debezium 2.4 documentation rather than rewritten to current Debezium 3.5 property names. A future refresh should update the full stack versions together before switching to newer Debezium settings such as `delete.tombstone.handling.mode` and `no_data`.
