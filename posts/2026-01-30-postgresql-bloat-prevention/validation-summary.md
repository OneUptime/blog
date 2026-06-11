# Validation Summary: How to Implement PostgreSQL Bloat Prevention

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (MVCC, VACUUM, autovacuum)
- pgstattuple extension
- pg_repack extension
- CLUSTER command
- System catalogs: pg_stat_user_tables, pg_stat_user_indexes, pg_stat_progress_vacuum, pg_stat_activity, pg_replication_slots, pg_class, pg_settings
- PL/pgSQL (CREATE FUNCTION)
- HOT (Heap-Only Tuple) updates and fillfactor storage parameter

## Sources Consulted
- PostgreSQL Documentation: Routine Vacuuming — https://www.postgresql.org/docs/current/routine-vacuuming.html
- PostgreSQL Documentation: VACUUM — https://www.postgresql.org/docs/current/sql-vacuum.html
- PostgreSQL Documentation: Automatic Vacuuming parameters — https://www.postgresql.org/docs/current/runtime-config-autovacuum.html
- PostgreSQL Documentation: Progress Reporting (pg_stat_progress_vacuum) — https://www.postgresql.org/docs/current/progress-reporting.html
- PostgreSQL Documentation: The Statistics Collector / pg_stat_user_tables — https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL Documentation: pgstattuple module — https://www.postgresql.org/docs/current/pgstattuple.html
- PostgreSQL Documentation: CREATE TABLE storage parameters (fillfactor) — https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL Documentation: Client Connection Defaults (idle_in_transaction_session_timeout) — https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL 12 Release Notes (autovacuum_vacuum_cost_delay default change) — https://www.postgresql.org/docs/release/12.0/
- PostgreSQL 17 Release Notes (pg_stat_progress_vacuum column changes) — https://www.postgresql.org/docs/release/17.0/
- PostgreSQL Documentation: pg_replication_slots — https://www.postgresql.org/docs/current/view-pg-replication-slots.html
- pg_repack project README — https://github.com/reorg/pg_repack

## Issues Found

1. **Outdated default for `autovacuum_vacuum_cost_delay`**: The post said setting it to `2ms` was "Reduced from default 20ms". This is incorrect for PostgreSQL 12+ — the default was changed from 20ms to 2ms in PostgreSQL 12, so `2ms` is now the default value. Fixed the inline comment to clarify: "Default in PostgreSQL 12+ (was 20ms in older versions)". Also added a small clarification on `autovacuum_vacuum_cost_limit` noting that its real default is `-1` (inherited from `vacuum_cost_limit`, which defaults to 200).

2. **Incorrect version note for `idle_in_transaction_session_timeout`**: The post claimed this GUC is "PostgreSQL 14+". It has actually been available since PostgreSQL 9.6. Updated the inline comment to "available since PostgreSQL 9.6".

3. **`pg_stat_progress_vacuum` column names outdated for PostgreSQL 17+**: The post used `max_dead_tuples` and `num_dead_tuples`, which were replaced in PostgreSQL 17 by `max_dead_tuple_bytes`, `dead_tuple_bytes`, and `num_dead_item_ids`. Updated the example query to the current (PostgreSQL 17+) column names and added a comment noting that PG 16 and earlier still use the old column names.

## Review Notes

- The "table bloat estimation" query in the Detecting Bloat section is mathematically rough — the `row_count * 0.1 / 8192` expression is a coarse heuristic rather than a real bloat estimator. The post correctly labels it as an "estimate" and recommends `pgstattuple` for accurate detection, so this was left as-is. Production users should rely on `pgstattuple`/`pgstattuple_approx` or the well-known check_postgres / ioguix bloat queries for reliable numbers.
- The `JOIN pg_class ON relname = tablename` in the same estimation CTE does not also join on schema, so it can produce ambiguous rows if the same `relname` exists in multiple schemas. Not strictly incorrect (the WHERE schemaname filter limits scope), but a future improvement would be to also join on `pg_namespace` and match schema.
- `postgresql-15-repack` is correct as a sample apt package name for PostgreSQL 15 on Debian/Ubuntu (PGDG repos). Readers on other PG major versions need to substitute (`postgresql-16-repack`, `postgresql-17-repack`, etc.).
- `autovacuum_max_workers` default is 3 (the post recommends bumping to 4 for "large databases with many tables", which is fine guidance).
- All SQL identifiers used (`n_dead_tup`, `n_live_tup`, `n_tup_upd`, `n_tup_hot_upd`, `last_vacuum`, `last_autovacuum`, `last_autoanalyze`, `autovacuum_count`, `autoanalyze_count`, `idx_scan`, `idx_tup_read`, `idx_tup_fetch`, etc.) match the current `pg_stat_user_tables` / `pg_stat_user_indexes` schemas.
- `pgstattuple()` return columns (`table_len`, `tuple_count`, `tuple_len`, `tuple_percent`, `dead_tuple_count`, `dead_tuple_len`, `dead_tuple_percent`, `free_space`, `free_percent`) match the official function signature.
- The HOT update explanation and fillfactor guidance are accurate. The recommendation to investigate fillfactor when `hot_update_ratio < 90%` is a reasonable rule of thumb, though the actual threshold can vary significantly with workload.
