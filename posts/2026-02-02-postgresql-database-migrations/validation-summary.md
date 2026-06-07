# Validation Summary: How to Handle Database Migrations in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (schema migrations, data migrations, locking, indexes, constraints)
- PL/pgSQL (helper functions: apply_migration, rollback_migration, batch_update, pre_migration_check, cleanup_failed_migration)
- Bash (migration execution script using psql)
- pgcrypto (pgp_sym_encrypt example)
- PostgreSQL catalog/stats views (pg_index, pg_locks, pg_stat_activity, pg_stat_replication, pg_settings, pg_stat_user_tables, pg_indexes, pg_constraint, pg_class, pg_namespace, information_schema.columns)
- WAL/PITR concepts (pg_current_wal_lsn, archive_mode, wal_level, wal_keep_size)

## Sources Consulted
- PostgreSQL official docs — EXTRACT / date/time functions: https://www.postgresql.org/docs/current/functions-datetime.html
- PostgreSQL official docs — CREATE INDEX (CONCURRENTLY restriction inside transaction blocks): https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL official docs — ALTER TABLE (ADD COLUMN fast default since 11, ADD CONSTRAINT ... NOT VALID, VALIDATE CONSTRAINT, SET NOT NULL optimization in 12+): https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL official docs — WAL functions (pg_current_wal_lsn): https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL official docs — pgcrypto (pgp_sym_encrypt): https://www.postgresql.org/docs/current/pgcrypto.html
- PostgreSQL official docs — System views (pg_locks, pg_stat_activity, pg_stat_replication, pg_indexes, pg_index): https://www.postgresql.org/docs/current/monitoring-stats.html and https://www.postgresql.org/docs/current/view-pg-indexes.html

## Issues Found
1. **Incorrect elapsed-time calculation** (apply_migration function, ~line 127).
   - Was: `v_execution_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time);`
   - Problem: `EXTRACT(MILLISECONDS FROM interval)` only returns the seconds field (including fractions) multiplied by 1000. For any migration exceeding one minute, the minutes/hours portions are dropped and `execution_time_ms` is wrong (e.g., a 90-second migration would report 30000ms instead of 90000ms).
   - Fix: Use `EXTRACT(EPOCH FROM interval)` which returns total seconds in the interval, then multiply by 1000 and cast to INTEGER: `v_execution_ms := (EXTRACT(EPOCH FROM clock_timestamp() - v_start_time) * 1000)::INTEGER;`

2. **CREATE INDEX CONCURRENTLY wrapped in a transaction block** (Adding Columns Without Downtime section).
   - Was: The migration showed `BEGIN; ALTER TABLE ... ADD COLUMN ...; CREATE INDEX CONCURRENTLY ...; COMMIT;`
   - Problem: PostgreSQL explicitly forbids `CREATE INDEX CONCURRENTLY` inside a transaction block. The example would fail at runtime with `CREATE INDEX CONCURRENTLY cannot run inside a transaction block`. The post itself correctly states this restriction later in the "Creating Indexes Concurrently" section, so the original example was internally contradictory.
   - Fix: Removed the `BEGIN; ... COMMIT;` wrapping. Issued the `ALTER TABLE` and `CREATE INDEX CONCURRENTLY` as two separate top-level statements. Added an inline comment explaining the restriction.

3. **Inconsistent lead-in/comment about column DEFAULTs** (same section).
   - Was: The intro said "adds a new column with a default value, which is safe in PostgreSQL 11 and later" and the in-code comment said "The DEFAULT is stored in the catalog, not written to every row", but the SQL did not actually include a `DEFAULT` clause.
   - Fix: Rewrote the lead-in to accurately describe the example (adding a nullable column) while still mentioning the PostgreSQL 11+ fast-default optimization for completeness. Updated the in-code comment to match the actual SQL.

## Review Notes
- The `ALTER COLUMN ... SET NOT NULL` fast-path that skips a full table scan when there is an existing valid `CHECK (col IS NOT NULL)` constraint requires PostgreSQL 12 or later. The post does not call this out explicitly; for the PostgreSQL 12+ audience the technique works as written, but readers on older versions should be aware the SET NOT NULL step will still scan the table.
- The "Using Temporary Tables for Complex Transformations" example performs a single `UPDATE users u SET ... FROM temp_parsed_addresses t WHERE u.id = t.id;` inside a transaction. The inline comment says "using batch approach", which is mildly misleading — the UPDATE is a single statement, not batched — but the SQL itself is correct. Left as-is per "fix only what's technically wrong".
- `EXTRACT(EPOCH FROM ...)` returns a `double precision`, and the post's `execution_time_ms` column is `INTEGER`. The fix uses an explicit `::INTEGER` cast to make the truncation deterministic.
- `pg_current_wal_lsn()` (used in WAL-position checks and the bash script) is the post-10 name; this is current.
- `wal_keep_size` (queried in the WAL settings check) is PostgreSQL 13+. In PostgreSQL 12 and earlier, the equivalent setting is `wal_keep_segments`. Given the post is dated 2026 and is aimed at modern PostgreSQL, this is appropriate.
- The bash migration script uses `sha256sum`, which is the GNU coreutils name available on Linux. On macOS, the equivalent is `shasum -a 256`. Not changed because the script is written for a Linux execution environment.
- Pre-migration check function reports active locks by `COUNT(*)` of `pg_locks WHERE granted = false`. The CASE-WHEN-COUNT and string concatenation patterns are valid PL/pgSQL inside a `RETURN QUERY` and run correctly.
- All other code examples (NOT VALID + VALIDATE pattern, CREATE INDEX CONCURRENTLY restrictions, blocking-locks join via pg_locks/pg_stat_activity, VARCHAR length expansion being metadata-only, column-swap pattern for type conversion, pgp_sym_encrypt usage) were verified against the official documentation and are accurate.
