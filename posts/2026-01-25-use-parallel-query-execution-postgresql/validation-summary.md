# Validation Summary: How to Use Parallel Query Execution in PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- SQL
- PostgreSQL parallel query execution
- PostgreSQL query planner configuration
- PostgreSQL query monitoring

## Sources Consulted
- PostgreSQL Documentation: Chapter 15, Parallel Query - https://www.postgresql.org/docs/current/parallel-query.html
- PostgreSQL Documentation: 15.1 How Parallel Query Works - https://www.postgresql.org/docs/current/how-parallel-query-works.html
- PostgreSQL Documentation: 15.2 When Can Parallel Query Be Used? - https://www.postgresql.org/docs/current/when-can-parallel-query-be-used.html
- PostgreSQL Documentation: 15.3 Parallel Plans - https://www.postgresql.org/docs/current/parallel-plans.html
- PostgreSQL Documentation: 15.4 Parallel Safety - https://www.postgresql.org/docs/current/parallel-safety.html
- PostgreSQL Documentation: 19.4 Resource Consumption - https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL Documentation: 19.7 Query Planning - https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL Documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html

## Issues Found
- The post stated that write queries cannot be parallelized. PostgreSQL does not generate parallel plans for ordinary data-modifying queries, but documented exceptions such as `CREATE TABLE ... AS`, `SELECT INTO`, `CREATE MATERIALIZED VIEW`, and `REFRESH MATERIALIZED VIEW` can use a parallel plan for the underlying `SELECT`. Updated the wording to "ordinary data-modifying queries" and "do not get parallel plans" to avoid conflicting with the later CTAS example.
- The post listed serializable isolation level as a current reason parallelism is not used. Current PostgreSQL documentation does not list `SERIALIZABLE` as a general parallel-query blocker. Replaced that example with row-locking queries, which PostgreSQL documents as preventing parallel plans.
- The post said reducing planner thresholds and costs means even small tables use parallel workers. PostgreSQL's planner still decides whether a parallel plan is cheapest, and workers may be unavailable at execution time. Updated the wording to say small tables "can use" parallel workers.

## Review Notes
The examples are illustrative and depend on table size, statistics, indexes, PostgreSQL version, planner cost estimates, and worker availability. Parallel index scans are currently limited to B-tree indexes, and parallel utility workers currently apply to `CREATE INDEX` for B-tree, GIN, and BRIN indexes and to non-`FULL` `VACUUM`.
