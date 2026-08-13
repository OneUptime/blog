# Validation Summary: Why Did Partition Pruning Fail? Diagnose Casts, Functions, and Predicates

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- PostgreSQL declarative partitioning and constraint exclusion
- PostgreSQL system catalogs and partition metadata functions
- PostgreSQL prepared statements and execution-time partition pruning
- PostgreSQL `EXPLAIN`, `EXPLAIN ANALYZE`, and `ANALYZE`
- MySQL 8.4 partition pruning and explicit partition selection
- MySQL 8.4 `EXPLAIN` and `ANALYZE TABLE`
- SQL predicates, casts, functions, Boolean logic, and set operations
- Timestamp, time-zone, and UUID semantics

## Sources Consulted

- PostgreSQL: Table Partitioning and Partition Pruning (https://www.postgresql.org/docs/current/ddl-partitioning.html)
- PostgreSQL: System Administration Functions, including `pg_partition_tree` (https://www.postgresql.org/docs/current/functions-admin.html)
- PostgreSQL: System Information Functions, including `pg_get_expr` and `pg_get_partkeydef` (https://www.postgresql.org/docs/current/functions-info.html)
- PostgreSQL: `pg_class`, including `relpartbound` (https://www.postgresql.org/docs/current/catalog-pg-class.html)
- PostgreSQL: Planner Method Configuration (https://www.postgresql.org/docs/current/runtime-config-query.html)
- PostgreSQL: `EXPLAIN` (https://www.postgresql.org/docs/current/sql-explain.html)
- PostgreSQL: Using `EXPLAIN` (https://www.postgresql.org/docs/current/using-explain.html)
- PostgreSQL: `PREPARE` and generic versus custom plans (https://www.postgresql.org/docs/current/sql-prepare.html)
- PostgreSQL: Date/Time Types (https://www.postgresql.org/docs/current/datatype-datetime.html)
- PostgreSQL: Date/Time Functions and Operators (https://www.postgresql.org/docs/current/functions-datetime.html)
- PostgreSQL: UUID Type (https://www.postgresql.org/docs/current/datatype-uuid.html)
- PostgreSQL: Combining Queries with `UNION`, `INTERSECT`, and `EXCEPT` (https://www.postgresql.org/docs/current/queries-union.html)
- PostgreSQL: `psql` meta-commands (https://www.postgresql.org/docs/current/app-psql.html#APP-PSQL-META-COMMANDS)
- PostgreSQL: `ANALYZE` (https://www.postgresql.org/docs/current/sql-analyze.html)
- MySQL 8.4: Partition Pruning (https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html)
- MySQL 8.4: Partitioning Limitations Relating to Functions (https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-functions.html)
- MySQL 8.4: Obtaining Information About Partitions (https://dev.mysql.com/doc/refman/8.4/en/partitioning-info.html)
- MySQL 8.4: Partition Selection (https://dev.mysql.com/doc/refman/8.4/en/partitioning-selection.html)
- MySQL 8.4: `EXPLAIN` Statement (https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- MySQL 8.4: `ANALYZE TABLE` Statement (https://dev.mysql.com/doc/refman/8.4/en/analyze-table.html)

## Issues Found

1. The query introduced as inspecting leaf bounds selected every row from `pg_partition_tree`, including the root and intermediate partitioned tables. Added `WHERE isleaf` so it now returns only leaf partitions with leaf bounds.
2. The PostgreSQL metadata block contained `\d+`, which is a `psql` meta-command rather than server SQL. Changed the introduction to identify that the block is intended for `psql`.
3. The UTC half-open timestamp range was described as equivalent to `occurred_at::date = DATE '2026-08-13'` without requiring the cast to use UTC. Clarified that equivalence requires a UTC session `TimeZone`; otherwise the bounds must be derived for the same reporting zone as the original cast.
4. Moving the UUID cast from `event_id` to the parameter was presented without its input-semantic difference. Clarified that PostgreSQL accepts noncanonical UUID input forms, emits canonical UUID text, and rejects invalid UUID text during the cast, so the rewrite is appropriate only when native UUID equality and those input semantics are intended.
5. Plain `UNION` was presented as a generally correct way to remove overlap after splitting an `OR`. Under SQL bag semantics, `UNION` can also collapse distinct source rows with identical projected values. Replaced that advice with `UNION ALL` plus a null-safe anti-overlap condition, and limited plain `UNION` to unique projections or intended set semantics.
6. The MySQL example relied on the traditional `EXPLAIN` `partitions` column but used bare `EXPLAIN`. In MySQL 8.4, `@@explain_format` can change bare output format. Added `FORMAT=TRADITIONAL` to guarantee that column.
7. The final bare `ANALYZE` advice was valid for PostgreSQL but not MySQL. Replaced it with explicit PostgreSQL `ANALYZE events` and MySQL `ANALYZE TABLE events` commands.

## Review Notes

- All supplied PostgreSQL and MySQL documentation URLs resolved to the intended official documentation.
- The PostgreSQL catalog queries and pruning examples were additionally exercised against a local PostgreSQL server; the corrected leaf filter and static/runtime pruning behavior worked as described.
- PostgreSQL's current documentation resolved to version 18 on the validation date. The discussed pruning, catalog, prepared-plan, and constraint-exclusion features remain current across supported PostgreSQL releases.
- The MySQL function claim is accurate for 8.4: pruning is specifically documented for `TO_DAYS()`, `TO_SECONDS()`, and `YEAR()` in supported `DATE`/`DATETIME` partitioning contexts, and `UNIX_TIMESTAMP()` with `TIMESTAMP` columns.
- No deprecated APIs or commands remain in the post.
