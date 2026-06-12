# Validation Summary: How to Configure Debezium with PostgreSQL

## Status
validated

## Post Type
Tutorial / technical configuration guide

## Technologies Covered
- Debezium PostgreSQL connector
- PostgreSQL logical replication, WAL, replication slots, and publications
- Kafka Connect REST API
- Debezium signaling, incremental snapshots, heartbeats, and SMT configuration

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium signaling documentation: https://debezium.io/documentation/reference/stable/configuration/signalling.html
- Debezium New Record State Extraction SMT documentation: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- PostgreSQL replication configuration documentation: https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL logical replication row filter documentation: https://www.postgresql.org/docs/current/logical-replication-row-filter.html
- Apache Kafka configuration providers documentation: https://kafka.apache.org/40/configuration/configuration-providers/
- Kafka Connect REST API documentation: https://docs.confluent.io/platform/current/connect/references/restapi.html

## Issues Found
- Replaced `wal_keep_size` guidance with `max_slot_wal_keep_size` for logical replication slot WAL retention. `wal_keep_size` is for retaining WAL for streaming standbys, while replication slot retention is controlled by slot behavior and capped by `max_slot_wal_keep_size`.
- Updated Kafka Connect file provider password placeholders from `${file:/secrets/postgres-password.txt}` to `${file:/secrets/postgres.properties:password}` because FileConfigProvider references require a property key.
- Changed JSON snippets with `//` comments to `jsonc` and added a note to remove comments before submitting connector JSON to Kafka Connect.
- Replaced invalid PostgreSQL connector `snapshot.locking.mode` value `minimal` with the documented `shared` value.
- Replaced deprecated Event Flattening SMT options `drop.tombstones` and `delete.handling.mode` with `delete.tombstone.handling.mode=rewrite-with-tombstone`.
- Removed invalid PostgreSQL schema history topic configuration and replaced it with PostgreSQL connector schema metadata guidance.
- Updated the snapshot mode table: replaced deprecated `never`, removed unsupported `recovery`, and added documented current modes.
- Replaced invalid `incremental.snapshot.allow.schema.changes` with the documented `read.only` incremental snapshot watermarking option.
- Updated signal examples from `pause-incremental` and `resume-incremental` to `pause-snapshot` and `resume-snapshot`, and corrected `additional-condition` to the documented `additional-conditions` array format.
- Corrected the default heartbeat topic from `dbserver1.heartbeat` to `__debezium-heartbeat.dbserver1`.
- Added `SELECT` to the heartbeat table grant because the heartbeat `UPDATE ... WHERE id = 1` reads the `id` column.
- Updated the quick reference from Debezium `2.x` as latest stable to the current Debezium `3.x` stable line verified against 3.5 documentation.

## Review Notes
The guide is technically relevant and now aligns with current Debezium 3.5 and PostgreSQL documentation. Future improvements could add version notes for PostgreSQL 17 failover replication slots and Debezium's newer `lsn.flush.mode` behavior, but those are optional additions rather than correctness fixes.
