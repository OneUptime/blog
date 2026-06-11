# Validation Summary: How to Implement PostgreSQL Hot Standby Feedback

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (streaming replication, hot standby)
- PostgreSQL configuration parameters (`hot_standby_feedback`, `max_standby_streaming_delay`, `max_standby_archive_delay`, `primary_conninfo`, `primary_slot_name`)
- PostgreSQL system views (`pg_stat_replication`, `pg_replication_slots`, `pg_stat_wal_receiver`, `pg_stat_user_tables`)
- PostgreSQL functions (`pg_create_physical_replication_slot`, `pg_drop_replication_slot`, `pg_is_in_recovery`, `pg_current_wal_lsn`, `pg_wal_lsn_diff`, `pg_reload_conf`)
- PL/pgSQL
- Python (psycopg2)

## Sources Consulted
- PostgreSQL Documentation: Hot Standby — https://www.postgresql.org/docs/current/hot-standby.html
- PostgreSQL Documentation: Standby Server Settings — https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL Documentation: System Views (`pg_stat_replication`, `pg_replication_slots`, `pg_stat_wal_receiver`) — https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL Documentation: Replication Functions — https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL 16 Release Notes (re: removal of `vacuum_defer_cleanup_age`) — https://www.postgresql.org/docs/16/release-16.html
- psycopg2 documentation for connection options

## Issues Found
1. **`vacuum_defer_cleanup_age` was removed in PostgreSQL 16 and the description was wrong.** The post had `ALTER SYSTEM SET vacuum_defer_cleanup_age = 0;` on the primary with a comment claiming it "limits how long vacuum will wait for standbys." This is incorrect on two counts: (a) the parameter actually does the opposite — it defers (delays) cleanup of dead tuples by N transactions, and (b) setting it to 0 is the default and has no effect. The parameter was removed entirely in PostgreSQL 16. I removed this misleading line and reworded the surrounding paragraph to focus on the still-valid `max_standby_streaming_delay` / `max_standby_archive_delay` standby parameters, and added a `pg_reload_conf()` call so the ALTER SYSTEM changes take effect.

## Review Notes
- All other configuration parameters, system view column names, and replication functions checked against PostgreSQL 16/17 docs are accurate.
- `hot_standby_feedback` has SIGHUP context, so the post's note "(requires restart or reload)" is conservative but correct — a reload is sufficient.
- `hot_standby = on` shown in the standby config is the default since PostgreSQL 10, so the explicit setting is redundant but harmless.
- `max_standby_streaming_delay = -1` (wait indefinitely) is correctly documented.
- `standby.signal` file and `primary_conninfo`/`primary_slot_name` in `postgresql.conf` correctly reflect the PostgreSQL 12+ replication setup (post-`recovery.conf` removal).
- The Python example uses psycopg2's `options` parameter to pass `statement_timeout` in milliseconds, which is the correct mechanism.
- Future improvement: the post could mention that `pg_stat_wal_receiver` must be queried on the standby (not the primary) for clarity, though context makes this clear.
