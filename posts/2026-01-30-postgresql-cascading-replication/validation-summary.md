# Validation Summary: How to Create PostgreSQL Cascading Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (versions 9.2+, with examples targeting PG 12+ and PG 16)
- Streaming replication / cascading replication
- WAL (Write-Ahead Log) and replication slots
- `pg_basebackup` CLI tool
- `pg_stat_replication` / `pg_stat_wal_receiver` system views
- `pg_promote()` / `pg_ctl promote`
- `synchronous_standby_names` / synchronous replication
- PgBouncer (connection pooling)
- systemd / Bash shell scripting

## Sources Consulted
- PostgreSQL documentation: High Availability, Load Balancing, and Replication (https://www.postgresql.org/docs/current/high-availability.html)
- PostgreSQL documentation: Hot Standby (`hot_standby_feedback` parameter) (https://www.postgresql.org/docs/current/runtime-config-replication.html)
- PostgreSQL documentation: `pg_basebackup` (https://www.postgresql.org/docs/current/app-pgbasebackup.html)
- PostgreSQL documentation: `pg_stat_replication` and `pg_stat_wal_receiver` views (https://www.postgresql.org/docs/current/monitoring-stats.html)
- PostgreSQL documentation: `pg_promote()` (https://www.postgresql.org/docs/current/functions-admin.html)
- PostgreSQL 9.2 release notes (cascading replication introduction)
- PostgreSQL 12 release notes (`recovery.conf` removal, `standby.signal`, `pg_promote()`)
- PostgreSQL 13 release notes (`wal_keep_size` replacing `wal_keep_segments`)

## Issues Found
- **`hot_standby_feedback = on` in primary `postgresql.conf`**: The original primary configuration listed `hot_standby_feedback = on` with a comment claiming it improves WAL retention. This parameter only has effect on a standby server (it controls whether the standby reports its oldest xmin back to the upstream). Setting it on the primary has no functional effect and the comment was misleading. Removed the parameter and its comment from the primary's config example. It is correctly retained on the cascade-replica and leaf-replica configs.

## Review Notes
- The recursive CTE in "Comprehensive replication monitoring view" is syntactically valid SQL but will not actually traverse downstream replicas — `pg_stat_replication` is local to each server, so the join cannot reach replicas attached to cascade nodes. The query runs without error and is fine as illustrative starter SQL; it's not technically wrong, just limited.
- `wal_keep_size` is correct for PostgreSQL 13+. The post uses PG 16 data directory paths consistently, so this is appropriate. On PG < 13, readers would need `wal_keep_segments` instead.
- `pg_promote()` correctly noted as PostgreSQL 12+.
- `synchronous_standby_names = 'FIRST 1 (cascade_west, cascade_eu)'` uses valid PG 10+ priority-based syntax.
- `pg_basebackup -Xs -R -S <slot>` flag combination is correct; `-R` produces both `standby.signal` and `primary_conninfo`/`primary_slot_name` entries in `postgresql.auto.conf` (PG 12+).
- All referenced columns in `pg_stat_replication` and `pg_stat_wal_receiver` are valid in current PostgreSQL versions.
- The post correctly notes that `max_wal_senders` requires a server restart (it is PGC_POSTMASTER).
