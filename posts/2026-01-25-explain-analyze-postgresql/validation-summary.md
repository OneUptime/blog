# Validation Summary: How to Read and Optimize Slow Queries with EXPLAIN ANALYZE

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- PostgreSQL
- SQL
- EXPLAIN and EXPLAIN ANALYZE
- PostgreSQL query planner and execution plans
- PostgreSQL indexes and index-only scans
- PostgreSQL statistics and ANALYZE
- PostgreSQL pg_prewarm extension

## Sources Consulted
- PostgreSQL 18 documentation: EXPLAIN: https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL 18 documentation: ANALYZE: https://www.postgresql.org/docs/current/sql-analyze.html
- PostgreSQL 18 documentation: Query Planning: https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL 18 documentation: WITH Queries / Common Table Expressions: https://www.postgresql.org/docs/current/queries-with.html
- PostgreSQL 18 documentation: Indexes: https://www.postgresql.org/docs/current/indexes.html
- PostgreSQL 18 documentation: Index-Only Scans and Covering Indexes: https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL 18 documentation: pg_prewarm: https://www.postgresql.org/docs/current/pgprewarm.html
- PostgreSQL 18 documentation: ALTER TABLE SET STATISTICS: https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL 18 documentation: pg_stats: https://www.postgresql.org/docs/current/view-pg-stats.html
- PostgreSQL 18 documentation: Cumulative Statistics System: https://www.postgresql.org/docs/current/monitoring-stats.html

## Issues Found
- The post described `Buffers: shared read` as pages read from disk. PostgreSQL documents these as blocks read into PostgreSQL shared buffers; the underlying read may come from the operating system cache or storage. Updated the wording and example comments to avoid implying guaranteed physical disk I/O.
- The post stated that a sequential scan on a large filtered table means a missing index. PostgreSQL can legitimately choose sequential scans when they are cheaper, especially for low-selectivity filters. Updated the wording to say this may indicate a missing or unsuitable index for a selective filter.
- The nested loop example said to "force" a hash join by setting `enable_nestloop = off`. PostgreSQL planner settings discourage plan types rather than absolutely suppressing them in all cases. Updated the wording to describe this as testing an alternative plan.
- The CTE example claimed PostgreSQL can optimize the subquery independently for better plan control. Current PostgreSQL can fold a single-use, side-effect-free CTE into the parent query for joint optimization. Updated the comment and surrounding wording accordingly.
- The common fixes table suggested increasing `shared_buffers` as a direct fix for high `shared read` counts and increasing `work_mem` for nested loops. Updated these recommendations to better match PostgreSQL behavior: reduce pages read with better indexes, pre-warm frequently used data where appropriate, and compare join strategies for high-loop plans.

## Review Notes
The SQL snippets use illustrative table and column names, so they require matching schema definitions to run exactly. The `pg_prewarm` example assumes the `pg_prewarm` extension is installed and available in the database.
