# Validation Summary: How to Set Up Debezium for Change Data Capture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Debezium
- Change Data Capture (CDC)
- Apache Kafka
- Kafka Connect
- PostgreSQL logical replication
- MySQL binary logging
- Docker Compose
- Elasticsearch Python client
- kafka-python
- Redis
- Prometheus JMX exporter

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium MySQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium monitoring documentation: https://debezium.io/documentation/reference/stable/operations/monitoring.html
- PostgreSQL replication configuration documentation: https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL WAL configuration documentation: https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL CREATE PUBLICATION documentation: https://www.postgresql.org/docs/current/sql-createpublication.html
- PostgreSQL logical replication security documentation: https://www.postgresql.org/docs/current/logical-replication-security.html
- MySQL binary logging options documentation: https://dev.mysql.com/doc/en/replication-options-binary-log.html
- MySQL replication user documentation: https://dev.mysql.com/doc/refman/8.2/en/replication-howto-repuser.html
- Kafka Connect REST API documentation: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Elasticsearch Python client configuration documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/configuration
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html

## Issues Found
- PostgreSQL publication setup was missing `CREATE` privilege on the database and did not mention table ownership requirements for Debezium-created publications. Added `GRANT CREATE ON DATABASE myapp TO debezium;` and a note about table ownership or owner-role membership.
- MySQL binlog retention used `expire_logs_days`, which is deprecated/removed in newer MySQL versions. Replaced it with `binlog_expire_logs_seconds = 604800`.
- The MySQL `LOCK TABLES` note stated it was required for all MySQL 8.0+ deployments. Adjusted the wording because Debezium documents it as relevant for deployments that cannot use global read locks.
- The Debezium event example used `{ ... }`, which is not valid JSON. Replaced it with an empty object so the snippet is syntactically valid JSON.
- The event field table conflated PostgreSQL `source.lsn` with MySQL binlog positions. Clarified that MySQL uses `source.file`, `source.pos`, and `source.row`.
- PostgreSQL schema-change handling was overstated as automatic DDL capture through the replication stream. Corrected it to explain that PostgreSQL data events include schema metadata but DDL events are not emitted to consumers through logical decoding.
- The schema-history configuration snippet mixed MySQL-specific settings into a generic schema-change section. Clarified that the snippet is for MySQL schema history and optional schema change events.
- `schema.history.internal.store.only.captured.tables.ddl` was set to `true` without caveat, which can make adding tables later harder. Changed it to the documented safer default, `false`.
- The deduplication guidance referenced `source.txId` generically. Updated it to use connector-specific source coordinates such as PostgreSQL `source.lsn` and MySQL `source.file`, `source.pos`, and `source.row`.
- The scaling guidance incorrectly said to use one connector task per table for PostgreSQL or per database for MySQL. Corrected it because both PostgreSQL and MySQL Debezium connectors run a single connector task; scaling should happen through Kafka topic partitioning and consumer groups.

## Review Notes
- The examples remain development-oriented. For production, pinning current maintained Debezium/Confluent image versions, enabling authentication/TLS, and adding Schema Registry to the Compose stack would be useful future improvements.
