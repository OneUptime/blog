# Validation Summary: How to Prevent Table Bloat with Autovacuum Tuning in PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- Autovacuum
- VACUUM and VACUUM FULL
- PostgreSQL system catalogs and statistics views
- pgstattuple extension

## Sources Consulted
- PostgreSQL Documentation: Routine Vacuuming - https://www.postgresql.org/docs/current/routine-vacuuming.html
- PostgreSQL Documentation: Vacuuming Configuration Parameters - https://www.postgresql.org/docs/current/runtime-config-vacuum.html
- PostgreSQL Documentation: Cumulative Statistics System - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL Documentation: Progress Reporting - https://www.postgresql.org/docs/current/progress-reporting.html
- PostgreSQL Documentation: pgstattuple - https://www.postgresql.org/docs/current/pgstattuple.html
- PostgreSQL Documentation: ALTER TABLE - https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL Documentation: ALTER SYSTEM - https://www.postgresql.org/docs/current/sql-altersystem.html

## Issues Found
- Clarified that transaction IDs are 32-bit and wrap after about 4 billion transactions, while row versions must be frozen before they become more than 2 billion transactions old. The original wording compressed these two related facts into "wrap around after approximately 2 billion transactions."
- Added restart notes for `autovacuum_max_workers` and `autovacuum_freeze_max_age`, because PostgreSQL documents them as settings that take effect only at server start. This prevents readers from assuming `pg_reload_conf()` applies those changes immediately.
- Updated the wraparound monitoring query to include TOAST table `relfrozenxid` age using `GREATEST(age(c.relfrozenxid), age(t.relfrozenxid))`, matching PostgreSQL's documented approach for checking table age.
- Fixed the production monitoring query to join `pg_stat_user_tables` to `pg_class` by `relid`/OID instead of table name. The original `JOIN pg_class c ON c.relname = s.relname` could produce incorrect matches across schemas and made unqualified column references ambiguous.
- Adjusted the production monitoring query's dead tuple percentage calculation to use `live + dead` tuples as the denominator, consistent with the earlier dead tuple count query.

## Review Notes
The guide is broadly accurate for current PostgreSQL releases. Some tuning recommendations, especially aggressive per-table thresholds and zero autovacuum cost delay, should still be tested under production-like load because they can increase I/O pressure.
