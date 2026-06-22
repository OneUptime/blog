# Validation Summary: How to Speed Up Scans with Parallel Queries in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL parallel query
- PostgreSQL query planning and EXPLAIN
- PostgreSQL configuration parameters
- PostgreSQL parallel-safe functions
- PostgreSQL parallel index builds

## Sources Consulted
- PostgreSQL Documentation: Chapter 15, Parallel Query - https://www.postgresql.org/docs/current/parallel-query.html
- PostgreSQL Documentation: 15.1, How Parallel Query Works - https://www.postgresql.org/docs/current/how-parallel-query-works.html
- PostgreSQL Documentation: 15.2, When Can Parallel Query Be Used? - https://www.postgresql.org/docs/current/when-can-parallel-query-be-used.html
- PostgreSQL Documentation: 15.3, Parallel Plans - https://www.postgresql.org/docs/current/parallel-plans.html
- PostgreSQL Documentation: 15.4, Parallel Safety - https://www.postgresql.org/docs/current/parallel-safety.html
- PostgreSQL Documentation: 19.4, Resource Consumption / Worker Processes - https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL Documentation: 19.7, Query Planning - https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL Documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL Documentation: CREATE FUNCTION - https://www.postgresql.org/docs/current/sql-createfunction.html
- PostgreSQL Documentation: 27.2, Cumulative Statistics System / pg_stat_activity - https://www.postgresql.org/docs/current/monitoring-stats.html

## Issues Found
- The post listed `parallel_tuple_cost` as having a default of `0.01`. PostgreSQL documentation lists the current default as `0.1`, so both occurrences were corrected.
- The post described the testing settings as forcing parallelism. PostgreSQL parallel plans are still cost-based and conditional, so the wording was changed to "encourage parallelism" while keeping the example intact.
- The write-operation section said `INSERT`, `UPDATE`, and `DELETE` are not parallelized with an exception for `CREATE TABLE AS SELECT`. PostgreSQL documents this more precisely as data-modifying queries that write or lock rows not receiving parallel plans, while table-creating commands such as `CREATE TABLE ... AS` can use a parallel plan for the underlying `SELECT`. The sentence was updated accordingly.

## Review Notes
The remaining examples are plan-dependent, which is normal for PostgreSQL tuning content. A specific query may or may not receive a parallel plan depending on table size, statistics, cost parameters, available workers, indexes, and the PostgreSQL version.
