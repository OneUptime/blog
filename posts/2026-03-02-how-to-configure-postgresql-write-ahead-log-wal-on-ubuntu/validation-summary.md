# Validation Summary: How to Configure PostgreSQL Write-Ahead Log (WAL) on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ubuntu
- PostgreSQL 14, 15, and 16
- PostgreSQL Write-Ahead Log (WAL)
- PostgreSQL replication and replication slots
- PostgreSQL WAL archiving and point-in-time recovery
- PostgreSQL monitoring views and WAL functions

## Sources Consulted
- PostgreSQL 16 Documentation: Write Ahead Log configuration: https://www.postgresql.org/docs/16/runtime-config-wal.html
- PostgreSQL 16 Documentation: Replication configuration: https://www.postgresql.org/docs/16/runtime-config-replication.html
- PostgreSQL 16 Documentation: Continuous Archiving and Point-in-Time Recovery: https://www.postgresql.org/docs/16/continuous-archiving.html
- PostgreSQL 16 Documentation: Monitoring Database Activity / cumulative statistics views: https://www.postgresql.org/docs/16/monitoring-stats.html
- PostgreSQL 16 Documentation: System Administration Functions: https://www.postgresql.org/docs/16/functions-admin.html
- PostgreSQL 15 Documentation: Write Ahead Log configuration: https://www.postgresql.org/docs/15/runtime-config-wal.html
- PostgreSQL 14 Documentation: Write Ahead Log configuration: https://www.postgresql.org/docs/14/runtime-config-wal.html

## Issues Found
- The `archive_command` example used plain `cp`, which can overwrite an existing archived WAL file. Updated it to use `test ! -f ... && cp ...`, matching the PostgreSQL documentation's safer pattern.
- The `synchronous_commit` comments were incomplete for synchronous replication and described `remote_apply` as highest durability. Updated the comments to clarify that `on` also waits for synchronous standbys when synchronous replication is configured, and that `remote_apply` is mainly about standby apply/query consistency and latency.
- The per-transaction `synchronous_commit` SQL example used session-level `SET` and an invalid placeholder `INSERT`. Replaced it with a valid transaction using `SET LOCAL synchronous_commit = off`.
- The WAL compression section implied `wal_compression = lz4` applied across PostgreSQL 14, 15, and 16. Updated it to note that named compression methods are for PostgreSQL 15+ when compiled with the selected method, while PostgreSQL 14 uses the boolean `wal_compression = on`.
- The monitoring query comment called `pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')` a per-second WAL generation rate, but it returns a position/difference value, not a rate. Updated the comment and alias accordingly.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. Future improvements could add stronger operational caveats around archive retention, archive directory permissions, replication slot disk growth limits such as `max_slot_wal_keep_size`, and measuring WAL generation rate over a time interval rather than from a single LSN value.
