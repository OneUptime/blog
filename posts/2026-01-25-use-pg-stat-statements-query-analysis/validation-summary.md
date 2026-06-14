# Validation Summary: How to Use pg_stat_statements for Query Analysis in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- pg_stat_statements
- SQL
- PostgreSQL configuration
- pg_cron
- Prometheus metric export patterns

## Sources Consulted
- PostgreSQL documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL documentation: EXPLAIN - https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL 13 documentation: pg_stat_statements - https://www.postgresql.org/docs/13/pgstatstatements.html
- pg_cron official repository documentation - https://github.com/citusdata/pg_cron

## Issues Found
- Added `compute_query_id = on` to the setup snippet because current PostgreSQL documentation states query identifier calculation must be enabled for `pg_stat_statements` to be active.
- Replaced `regexp_matches(...) AS table_name` with `(regexp_match(...))[1] AS table_name` so the table extraction query returns the captured table name instead of a text array/set-returning result.
- Fixed two SQL examples that used two-argument `round()` on `double precision` expressions. PostgreSQL requires casting to `numeric` for `round(value, scale)`.
- Added `nullif(previous.mean_exec_time, 0)` in the improvement percentage calculation to avoid division by zero.
- Added a note that the `cron.schedule(...)` example requires pg_cron to be installed and enabled separately.
- Adjusted the `queryid` best-practice note because PostgreSQL documents only limited stability guarantees for `queryid`; it should not be treated as stable across major PostgreSQL versions.

## Review Notes
The examples target PostgreSQL 13+ style `pg_stat_statements` columns such as `total_exec_time`, `mean_exec_time`, and `total_plan_time`. Older PostgreSQL releases used different column names, so readers on unsupported or older versions would need to adapt the queries.
