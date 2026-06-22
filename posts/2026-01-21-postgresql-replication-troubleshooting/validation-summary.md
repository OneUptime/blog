# Validation Summary: How to Troubleshoot PostgreSQL Replication Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- PostgreSQL physical streaming replication
- PostgreSQL logical replication
- PostgreSQL replication slots
- PostgreSQL hot standby conflict handling
- PostgreSQL synchronous replication
- PostgreSQL WAL and recovery configuration
- PostgreSQL client utilities such as pg_basebackup

## Sources Consulted
- PostgreSQL 18 Documentation: The Cumulative Statistics System - pg_stat_replication and wait events: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL 18 Documentation: Replication configuration settings: https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL 18 Documentation: Write Ahead Log configuration, including wal_compression: https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL 18 Documentation: The pg_hba.conf File: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL 18 Documentation: Log-Shipping Standby Servers: https://www.postgresql.org/docs/current/warm-standby.html
- PostgreSQL 18 Documentation: ALTER SUBSCRIPTION: https://www.postgresql.org/docs/current/sql-altersubscription.html
- PostgreSQL 18 Documentation: Logical Replication Conflicts: https://www.postgresql.org/docs/current/logical-replication-conflicts.html
- PostgreSQL 18 Documentation: pg_basebackup: https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL 17 Release Notes: removal of old_snapshot_threshold: https://www.postgresql.org/docs/17/release-17.html

## Issues Found
- The connection test used a normal `psql` database connection, but the shown `pg_hba.conf` entry applies to physical replication connections against the `replication` pseudo-database. Changed the test to use `pg_basebackup --target=blackhole -X none`, which exercises a replication-protocol connection without storing backup contents.
- The hot standby conflict section recommended `old_snapshot_threshold`, which was removed in PostgreSQL 17 and is not a current mitigation. Replaced it with `max_standby_archive_delay`, the archive-replay counterpart to `max_standby_streaming_delay`.
- The synchronous replication wait query used `wait_event_type = 'Client'`, but PostgreSQL documents `SyncRep` as an IPC wait event. Changed it to `wait_event_type = 'IPC'`.
- The logical replication conflict skip example used `pg_replication_origin_advance()` with a placeholder LSN and did not mention that the value must be the next LSN after the finish LSN. Replaced it with the current `ALTER SUBSCRIPTION ... SKIP (lsn = ...)` syntax.
- The network tuning section described `wal_compression` as compression over slow links. PostgreSQL documents it as compression of full-page images in WAL, which reduces WAL volume but is not link-layer compression. Updated the comment accordingly.

## Review Notes
The remaining SQL, configuration snippets, and utility examples are broadly accurate for supported PostgreSQL versions. The post uses PostgreSQL 16 paths in examples, while the review checked current PostgreSQL documentation where applicable; version-specific notes for `wal_keep_size`, `wal_keep_segments`, and `max_slot_wal_keep_size` are correct.
