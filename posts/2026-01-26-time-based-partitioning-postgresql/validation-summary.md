# Validation Summary: How to Scale Tables with Time-Based Partitioning in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL declarative range partitioning
- PostgreSQL PL/pgSQL
- PostgreSQL indexes, primary keys, sequences, and catalog/statistics views
- PostgreSQL partition pruning and parallel query settings
- pg_cron scheduled jobs

## Sources Consulted
- PostgreSQL 18 Documentation: Table Partitioning - https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL 18 Documentation: CREATE TABLE - https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL 18 Documentation: ALTER TABLE - https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL 18 Documentation: Sequence Manipulation Functions - https://www.postgresql.org/docs/current/functions-sequence.html
- PostgreSQL 18 Documentation: The Cumulative Statistics System - https://www.postgresql.org/docs/current/monitoring-stats.html
- pg_cron Documentation / README - https://github.com/citusdata/pg_cron

## Issues Found
- Calls to `create_monthly_partition` passed `CURRENT_DATE + INTERVAL ...` values to a function declared with a `DATE` argument. PostgreSQL resolves those expressions as timestamp values, so the examples could fail function resolution. Added explicit `::DATE` casts in the manual, migration, and `pg_cron` examples.
- The final migration sync used `created_at >= (SELECT MAX(created_at) FROM events)`, which can reinsert the boundary row already copied during batch migration. Changed it to `>` to avoid duplicate migration of rows at the maximum copied timestamp.
- The migration copied explicit `id` values into a table using `BIGSERIAL` but did not advance the backing sequence. Added a `setval(pg_get_serial_sequence(...), MAX(id))` call so subsequent default inserts continue after the imported IDs.
- The partition size query calculated row counts by querying the partitioned parent table with date bounds derived from partition names. This could misreport the default partition by counting rows from other partitions. Replaced it with `pg_stat_all_tables.n_live_tup` for each child table and renamed the column to `estimated_rows`.
- The default partition cleanup comment implied that creating a missing partition after data landed in the default partition only required detaching and reattaching. Clarified that matching rows must be moved out of the default partition before creating the missing partition.

## Review Notes
- PostgreSQL documentation confirms range partition lower bounds are inclusive and upper bounds are exclusive, matching the examples.
- PostgreSQL documentation confirms primary keys and unique constraints on partitioned tables must include all partition-key columns, matching the table definition.
- PostgreSQL documentation confirms indexes created on the partitioned parent are cloned on partitions.
- `pg_stat_all_tables.n_live_tup` is an estimate, so it is appropriate for lightweight health monitoring but not for exact billing or audit counts.
- `CREATE INDEX CONCURRENTLY` has special considerations on partitioned tables; the post uses plain `CREATE INDEX`, so this is not an error.
