# Validation Summary: How to Implement Log-Based CDC

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Change Data Capture (CDC)
- Debezium
- Apache Kafka
- Kafka Connect
- PostgreSQL logical replication
- MySQL binary logging
- Docker Compose
- Python
- kafka-python
- psycopg2

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium MySQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium event flattening SMT documentation: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- PostgreSQL logical replication configuration documentation: https://www.postgresql.org/docs/current/logical-replication-config.html
- MySQL 8.0 binary logging options documentation: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- Docker Compose version and name documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Kafka Connect REST API documentation: https://docs.confluent.io/platform/current/connect/references/restapi.html
- kafka-python documentation: https://kafka-python.readthedocs.io/en/master/usage.html

## Issues Found
- The PostgreSQL configuration comment described `wal_sender_timeout` as a logical decoding plugin setting. Changed the comment to state that it disables idle WAL sender timeouts for long-running replication connections.
- The PostgreSQL setup text said to create a replication slot and publication, but the SQL only created a user and publication. Updated the text to match the SQL and Debezium connector configuration, where `slot.name` identifies the connector's logical replication slot.
- The MySQL snippet used deprecated `expire_logs_days` and incorrectly described it as seconds. Replaced it with `binlog_expire_logs_seconds = 604800`, the current MySQL 8.0 setting for seven days.
- The Docker Compose example used the obsolete top-level `version` field and the legacy `docker-compose` command. Removed the `version` field and changed the command to `docker compose up -d`.
- The PostgreSQL Debezium connector applied `ExtractNewRecordState`, but later sections showed raw Debezium envelopes and a consumer that parses `payload.before`, `payload.after`, `payload.source`, and `payload.op`. Removed the source-side unwrap SMT so the connector configuration matches the event format and consumer code.
- The Python consumer's JSON deserializer did not handle Kafka tombstone records with null values. Updated it to return `None` for tombstones and skip/commit those records explicitly.
- The consumer and idempotent-processing examples overclaimed exactly-once semantics. Updated the wording to describe at-least-once delivery and idempotent replay protection, which is the guarantee actually provided by the examples.

## Review Notes
- The Docker images in the tutorial are pinned to Debezium 2.4 and Confluent Platform 7.5.0. The examples remain valid for that version family, but future maintenance should consider refreshing the pinned image versions.
- The LSN watermark example is suitable as a simplified illustration of replay protection. Production systems may need a more precise event identity, such as source position plus transaction ordering or Kafka topic/partition/offset, depending on the database and sink semantics.
