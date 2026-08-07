# Validation Summary: PostgreSQL Read-After-Write: `remote_apply`, LSN Fences, or Primary Reads?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- PostgreSQL 18
- Physical streaming replication and hot standby
- Synchronous replication with `synchronous_commit = remote_apply`
- WAL log sequence numbers (`pg_lsn`) and replay fences
- PostgreSQL transaction isolation and MVCC snapshots
- Read routing, bounded fallback, and database failover handling

## Sources Consulted

- [PostgreSQL 18: `synchronous_commit`](https://www.postgresql.org/docs/18/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT)
- [PostgreSQL 18: replication configuration and `synchronous_standby_names`](https://www.postgresql.org/docs/18/runtime-config-replication.html#GUC-SYNCHRONOUS-STANDBY-NAMES)
- [PostgreSQL 18: synchronous replication](https://www.postgresql.org/docs/18/warm-standby.html#SYNCHRONOUS-REPLICATION)
- [PostgreSQL 18: WAL and recovery information functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-RECOVERY-CONTROL)
- [PostgreSQL 18: `pg_lsn` data type](https://www.postgresql.org/docs/18/datatype-pg-lsn.html)
- [PostgreSQL 18: `pg_stat_replication`](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)
- [PostgreSQL 18: transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
- [PostgreSQL 18: hot standby query conflicts](https://www.postgresql.org/docs/18/hot-standby.html#HOT-STANDBY-CONFLICT)
- [PostgreSQL 19 development documentation: `WAIT FOR`](https://www.postgresql.org/docs/19/sql-wait-for.html)

## Issues Found

No technical issues found.

## Review Notes

The post accurately limits the lack of a built-in blocking replay-LSN command to PostgreSQL 18 and earlier. PostgreSQL 19 development documentation introduces `WAIT FOR LSN`, so this version boundary should be revisited when PostgreSQL 19 becomes the target version. The SQL, configuration examples, function names, statistics columns, routing requirements, snapshot caveats, lag-metric limitations, and failover qualifications are otherwise consistent with the PostgreSQL 18 documentation.
