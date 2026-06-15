# Validation Summary: How to Optimize PostgreSQL for Analytics Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL configuration and query planning
- PostgreSQL parallel query execution
- PostgreSQL declarative partitioning
- PostgreSQL BRIN indexes
- PostgreSQL materialized views
- Citus columnar storage
- SQL analytics features including CTEs, window functions, GROUPING SETS, and JIT

## Sources Consulted
- PostgreSQL documentation: Resource Consumption, including work_mem, maintenance_work_mem, and shared_buffers: https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL documentation: Query Planning, including effective_cache_size and JIT cost settings: https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL documentation: Parallel Query: https://www.postgresql.org/docs/current/how-parallel-query-works.html
- PostgreSQL documentation: Table Partitioning and partition pruning: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL documentation: BRIN Indexes: https://www.postgresql.org/docs/current/brin.html
- PostgreSQL documentation: REFRESH MATERIALIZED VIEW: https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
- PostgreSQL documentation: WITH Queries / CTE materialization controls: https://www.postgresql.org/docs/current/queries-with.html
- Citus documentation: Timeseries data and columnar storage: https://docs.citusdata.com/en/stable/use_cases/timeseries.html
- Citus source documentation: columnar table access method behavior and limitations: https://github.com/citusdata/citus/blob/main/src/backend/columnar/README.md
- Citus changelog: columnar table access method separated into a logical extension in Citus 11.1: https://github.com/citusdata/citus/blob/main/CHANGELOG.md

## Issues Found
- The materialized view example refreshed with `CONCURRENTLY` before creating the required unique index. Moved the unique index creation before `REFRESH MATERIALIZED VIEW CONCURRENTLY` because PostgreSQL only allows concurrent refresh when the materialized view has a suitable unique index and is already populated.
- The BRIN index size query cast `indexname` directly to `regclass`, which can fail outside the current `search_path` or with duplicate index names across schemas. Updated it to schema-qualify the index name with `format('%I.%I', schemaname, indexname)::regclass`.
- The Citus columnar example only created the `citus` extension. Current Citus versions separate the columnar access method into the `citus_columnar` extension, so the example now creates both `citus` and `citus_columnar`.
- The restart note only mentioned `shared_buffers`. Updated it to also mention `max_worker_processes`, which is another setting in the summary that requires a PostgreSQL restart.

## Review Notes
Most recommendations are workload-dependent tuning starting points rather than universal safe defaults. In particular, `work_mem = '256MB'` should usually be applied selectively or calculated against realistic concurrent query operations to avoid memory pressure.
