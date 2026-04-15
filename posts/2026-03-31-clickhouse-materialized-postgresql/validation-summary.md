# Validation Summary: How to Ingest Data from PostgreSQL with MaterializedPostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MaterializedPostgreSQL database engine)
- PostgreSQL (logical replication, WAL, replication slots)
- ReplacingMergeTree (underlying table engine)
- CDC (Change Data Capture)

## Sources Consulted
- ClickHouse official documentation for MaterializedPostgreSQL database engine: https://clickhouse.com/docs/engines/database-engines/materialized-postgresql
- ClickHouse official documentation for `system.replication_queue`: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse source code (`MaterializedPostgreSQLConsumer.cpp`) for TRUNCATE handling behavior
- PostgreSQL documentation for logical replication: https://www.postgresql.org/docs/current/logical-replication.html
- PostgreSQL documentation for `pg_replication_slots`: https://www.postgresql.org/docs/current/view-pg-replication-slots.html

## Issues Found

1. **Incorrect system table for replication errors**: The post used `system.replication_queue WHERE database = 'pg_replica'` to check for MaterializedPostgreSQL errors. `system.replication_queue` is exclusively for ReplicatedMergeTree (ZooKeeper-based replication) and has no relevance to MaterializedPostgreSQL. Replaced with `system.databases` status check and `system.text_log` query for engine error messages.

2. **Non-existent system table `system.materialized_postgresql_tables`**: The post referenced `system.materialized_postgresql_tables` in two places (Checking Replication Status and Monitoring Replication Lag sections). This system table does not exist in ClickHouse. Replaced the monitoring queries with `system.text_log` queries filtering for PostgreSQL-related log entries.

3. **Incorrect PostgreSQL minimum version**: The limitations table stated "Requires PostgreSQL 10+" but MaterializedPostgreSQL requires PostgreSQL 11+ because it depends on the `pg_replication_slot_advance` function introduced in PostgreSQL 11. Fixed to "PostgreSQL 11+".

4. **Inaccurate TRUNCATE limitation explanation**: The post stated "TRUNCATE is not captured via logical replication." This is incorrect for PostgreSQL 11+ which does include TRUNCATE in the logical replication protocol. The actual behavior is that ClickHouse receives the TRUNCATE WAL message but deliberately ignores it (the handler is a no-op in `MaterializedPostgreSQLConsumer.cpp`). Fixed to "PostgreSQL sends TRUNCATE via WAL but the engine ignores it."

## Review Notes
- The `CREATE DATABASE` syntax, `materialized_postgresql_tables_list` setting, and schema-qualified table name format are all correct per official docs.
- The description of `_sign` and `_version` hidden columns and `ReplacingMergeTree` as the underlying engine is accurate.
- The `FINAL` modifier usage for deduplication is correctly described.
- The PostgreSQL WAL lag monitoring query using `pg_replication_slots` and `pg_wal_lsn_diff` is correct for PostgreSQL 11+.
- The replication user setup SQL and `pg_hba.conf` entry are correct.
- Schema evolution (automatic DDL detection for column additions) has limitations not fully described in the post — some DDL changes may require manual intervention or database recreation. This is noted in the limitations table but the Schema Evolution section could be more cautious.
