# Validation Summary: How to Implement VACUUM and Autovacuum in PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL VACUUM
- PostgreSQL autovacuum
- PostgreSQL configuration parameters
- PostgreSQL monitoring views
- pgstattuple
- pg_repack

## Sources Consulted
- PostgreSQL 18 Documentation: VACUUM - https://www.postgresql.org/docs/current/sql-vacuum.html
- PostgreSQL 18 Documentation: Routine Vacuuming - https://www.postgresql.org/docs/current/routine-vacuuming.html
- PostgreSQL 18 Documentation: Vacuuming Configuration - https://www.postgresql.org/docs/current/runtime-config-vacuum.html
- PostgreSQL 18 Documentation: Explicit Locking - https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL 18 Documentation: Progress Reporting / pg_stat_progress_vacuum - https://www.postgresql.org/docs/current/progress-reporting.html
- PostgreSQL 18 Documentation: Cumulative Statistics System / pg_stat_user_tables - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL 18 Documentation: pg_replication_slots - https://www.postgresql.org/docs/current/view-pg-replication-slots.html
- pg_repack Documentation - https://reorg.github.io/

## Issues Found
- Plain VACUUM was described as updating statistics. Changed this to table metadata, with planner statistics updated when VACUUM is run with ANALYZE.
- The lock table said regular VACUUM takes no table lock. Changed it to SHARE UPDATE EXCLUSIVE and VACUUM FULL to ACCESS EXCLUSIVE, matching PostgreSQL locking docs.
- The "Check Table Bloat" query did not estimate bloat and used unquoted text relation names with size functions. Renamed it to table size checking and changed relation references to `format('%I.%I', ...)::regclass`.
- The documented defaults for `autovacuum_vacuum_scale_factor` and `autovacuum_analyze_scale_factor` were outdated/incorrect for current PostgreSQL. Updated them to 0.2 and 0.1 respectively, and corrected related recommendation comments.
- The documented default for `vacuum_cost_page_miss` was incorrect for current PostgreSQL. Updated it from 10 to 2.
- The table XID age query referenced `relfrozenxid` from `pg_stat_user_tables`, where it does not exist. Fixed the query by joining `pg_stat_user_tables` to `pg_class`.
- The `pg_stat_progress_vacuum` example selected `max_dead_tuples`, which is not a current PostgreSQL 18 column. Replaced it with `max_dead_tuple_bytes` and `dead_tuple_bytes`.
- The pg_repack alternative was described as "no locks". Changed this to "minimal locking" to avoid overstating its behavior.
- Long transactions were described as blocking vacuum. Changed this to preventing cleanup of dead tuples, which is more precise.
- The replication slot diagnostic only showed WAL lag. Added `xmin` and `catalog_xmin`, which are the relevant slot fields for vacuum cleanup retention.

## Review Notes
The post is technically relevant and suitable as a PostgreSQL maintenance guide. Some tuning values remain intentionally workload-dependent recommendations rather than universal defaults.
