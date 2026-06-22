# Validation Summary: How to Analyze Query Performance with EXPLAIN ANALYZE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL
- EXPLAIN and EXPLAIN ANALYZE
- PostgreSQL indexes and query plans
- pg_stat_statements

## Sources Consulted
- PostgreSQL 18 Documentation: EXPLAIN - https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL 18 Documentation: Using EXPLAIN - https://www.postgresql.org/docs/current/using-explain.html
- PostgreSQL 18 Documentation: Index-Only Scans and Covering Indexes - https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL 18 Documentation: Partial Indexes - https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL 18 Documentation: WITH Queries / CTE Materialization - https://www.postgresql.org/docs/current/queries-with.html
- PostgreSQL 18 Documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html

## Issues Found
- The "All Available Options" heading was inaccurate for current PostgreSQL because recent versions include additional EXPLAIN options such as `SERIALIZE`, `SUMMARY`, `MEMORY`, and `GENERIC_PLAN`. Changed the heading to "Common Options" while preserving the examples.
- The post did not mention that `EXPLAIN ANALYZE` executes write statements and can cause side effects. Added a short transaction/rollback warning consistent with PostgreSQL documentation.
- The index-only scan explanation said the index must be "up to date." PostgreSQL index-only scans depend on all referenced columns being available from the index and heap pages being marked all-visible in the visibility map. Updated the wording to reference the visibility map and heap fetches.
- The join-order example overstated what a `MATERIALIZED` CTE does by saying it forces join order. PostgreSQL documents `MATERIALIZED` as forcing separate CTE calculation, which can serve as an optimization fence but can also block useful pushdown. Updated the section title and explanation accordingly.

## Review Notes
The SQL snippets are illustrative and assume the referenced tables, columns, and indexes exist. The `pg_stat_statements` query uses current column names such as `mean_exec_time`; enabling the extension may also require adding `pg_stat_statements` to `shared_preload_libraries` and restarting PostgreSQL, depending on the environment.
