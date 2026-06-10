# Validation Summary: How to Implement Change Data Capture (CDC) Pipelines

## Status
validated

## Post Type
Tutorial / Guide — a comprehensive technical guide with code examples, configuration snippets, and architecture diagrams.

## Technologies Covered
- Change Data Capture (CDC) concepts and patterns
- Debezium 2.4 (PostgreSQL connector, ExtractNewRecordState SMT, ByLogicalTableRouter SMT)
- Apache Kafka and Kafka Connect (Confluent Platform 7.5.0 images)
- PostgreSQL 15 (logical replication, WAL, replication slots, publications)
- Python (psycopg2, kafka-python, SQLAlchemy, redis-py)
- Confluent Schema Registry + Avro
- Transactional outbox pattern
- Docker Compose
- Mermaid architecture diagrams

## Sources Consulted
- Debezium 2.0 release notes / backward incompatible changes (renaming of `database.server.name` to `topic.prefix`)
- Debezium ExtractNewRecordState (event flattening) SMT documentation
- Debezium PostgreSQL connector configuration reference
- PostgreSQL 13+ documentation for `wal_keep_size` and `max_slot_wal_keep_size`
- PostgreSQL `pg_replication_slots` and `pg_wal_lsn_diff` / `pg_current_wal_lsn()` functions
- Confluent backward-incompatible-changes notes for Debezium V2 connectors: https://docs.confluent.io/cloud/current/connectors/cc-mysql-source-cdc-v2-debezium/cc-debezium-v2-backward-incompatible-changes.html
- Debezium ExtractNewRecordState source: https://github.com/debezium/debezium/blob/main/debezium-core/src/main/java/io/debezium/transforms/ExtractNewRecordStateConfigDefinition.java
- kafka-python KafkaConsumer / KafkaProducer API
- redis-py `SET` with `nx` and `ex` options

## Issues Found
1. **Debezium connector config included both `database.server.name` and `topic.prefix`.**
   - What was wrong: In Debezium 2.0+, the `database.server.name` property was renamed to `topic.prefix`. The post pins the image to `debezium/connect:2.4`, where `database.server.name` is no longer a valid property. Including both is redundant and can cause connector validation errors.
   - What I changed: Removed the line `"database.server.name": "inventory"` from the PostgreSQL connector registration JSON. `topic.prefix: "cdc"` is already present and sufficient.
   - Why: To match Debezium 2.4's actual connector property schema.

## Review Notes
- The post correctly uses `delete.handling.mode` and `drop.tombstones` for the ExtractNewRecordState SMT. These were deprecated in favor of `delete.tombstone.handling.mode` only starting in Debezium 2.5 (DBZ-6907), so they remain correct for the 2.4 image used here. If the post is ever updated to a newer Debezium version, those options should be migrated.
- The Avro converter example pairs Debezium 2.4 with Confluent Schema Registry on port 8081 — correct defaults.
- PostgreSQL settings (`wal_level=logical`, `max_replication_slots`, `max_wal_senders`, `max_slot_wal_keep_size`, `wal_keep_size`) are correct. `wal_keep_size` (rather than the older `wal_keep_segments`) is appropriate for PostgreSQL 13+, matching the `postgres:15` image.
- The PostgreSQL replication-lag queries using `pg_wal_lsn_diff`, `pg_current_wal_lsn()`, `restart_lsn`, and `pg_replication_slots` are accurate.
- The Debezium CDC operation codes (`c`, `u`, `d`, `r`) are correct as defined by the Debezium envelope schema.
- The kafka-python, psycopg2, SQLAlchemy, and redis-py code samples use current, non-deprecated APIs (e.g., `redis.set(..., nx=True, ex=ttl)`).
- The trigger-based and outbox-pattern SQL/Python examples are syntactically valid PostgreSQL and Python.
- Docker Compose `version: '3.8'` field is technically still accepted but is informational/ignored by Compose V2; not worth changing here.
- The `ByLogicalTableRouter` SMT is described as a "partition strategy," which is a slight conceptual stretch (it's primarily a topic-routing transform that can also influence keying via `key.field.name`), but the configuration shown is valid Debezium syntax.
