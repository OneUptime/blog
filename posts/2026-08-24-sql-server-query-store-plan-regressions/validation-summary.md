# Validation Summary: Detect SQL Server Plan Regressions with Query Store Intervals

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Microsoft SQL Server
- Transact-SQL (T-SQL)
- SQL Server Query Store
- Query Store runtime-statistics intervals and catalog views
- Execution-plan regression analysis
- Query Store plan forcing and Query Store hints
- Query Store for readable secondary replicas

## Sources Consulted

- [Microsoft Learn: `sys.query_store_runtime_stats`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: `sys.query_store_runtime_stats_interval`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-interval-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: `sys.query_store_plan`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-plan-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: `sys.query_store_query`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-query-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: `sys.query_store_query_text`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-query-text-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: How Query Store collects data](https://learn.microsoft.com/en-us/sql/relational-databases/performance/how-query-store-collects-data?view=sql-server-ver17)
- [Microsoft Learn: Monitor performance by using the Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store?view=sql-server-ver17)
- [Microsoft Learn: Query Store usage scenarios](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-usage-scenarios?view=sql-server-ver17)
- [Microsoft Learn: Best practices for managing the Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/manage-the-query-store?view=sql-server-ver17)
- [Microsoft Learn: Query Store for readable secondary replicas](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-for-secondary-replicas?view=sql-server-ver17)
- [Microsoft Learn: Query Store hints](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-hints?view=sql-server-ver17)
- [Microsoft Learn: `sp_query_store_force_plan`](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-query-store-force-plan-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: Display and save execution plans](https://learn.microsoft.com/en-us/sql/relational-databases/performance/display-and-save-execution-plans?view=sql-server-ver17)
- [Microsoft Learn: Permissions (Database Engine)](https://learn.microsoft.com/en-us/sql/relational-databases/security/permissions-database-engine?view=sql-server-ver17)
- [Microsoft Learn: `SYSUTCDATETIME`](https://learn.microsoft.com/en-us/sql/t-sql/functions/sysutcdatetime-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: `DATEADD`](https://learn.microsoft.com/en-us/sql/t-sql/functions/dateadd-transact-sql?view=sql-server-ver17)

## Issues Found

- The first heading said the aggregation returned one row per plan and interval, but the documented key and the query also separate `execution_type`. Updated the heading to state the actual cardinality.
- The execution-type prose used “Normal” instead of the catalog view's documented “Regular” label. Updated the term while retaining the correct numeric value and population split.
- The retained-metrics list called the available row-count data a distribution. Query Store exposes summary statistics rather than raw per-execution values, so this was corrected to “row-count summary statistics.”
- The alert prose required an absolute latency increase, while the shown predicate implements an absolute recent-latency floor. Updated the prose to match the policy, description, and conclusion.
- The diagnostic SQL used an undeclared `@query_id`, so it would not run as a standalone batch. Added a typed example declaration with an instruction to replace the value.
- The diagnosis guidance implied that the stored Query Store plan could show spill evidence. Query Store retains an estimated plan without runtime-only warnings, so the post now directs readers to confirm spills with an actual plan or other runtime instrumentation.
- The post described capture as asynchronous. Query Store captures new data in memory and asynchronously persists it to disk, so the wording now identifies persistence as the asynchronous operation.
- The permissions statement incorrectly applied database-scoped state permissions to `sys.query_store_query_text`. It now distinguishes the database-scoped permissions used by the runtime, interval, query, and plan views from the server-scoped state permissions documented for the query-text view.
- The remediation text did not state that Query Store hints are a SQL Server 2022-and-later feature. Added the version qualification; Query Store plan forcing remains available on earlier Query Store-capable releases.

## Review Notes

- The runtime-statistics aggregation query is valid for SQL Server 2016 and later. Its execution-weighted duration, CPU, and logical-read formulas correctly combine duplicate active-interval rows, and the documented units match the aliases used.
- The normalization query intentionally includes the active interval. The post correctly requires completed or delayed windows for alert evaluation; an implementation can enforce this with an end-time predicate.
- When Query Store for readable secondary replicas is enabled, the post correctly requires `replica_group_id` in grouping and comparison keys. Microsoft currently labels the feature preview: SQL Server 2025 supports enabling it, while SQL Server 2022 access is a limited preview requiring trace flag 12606 and is not supported for production.
- Execution types `3` and `4` are useful diagnostic populations, but Query Store should not be treated as an exhaustive error counter because statistics might not be recorded when a session terminates or a client restarts or crashes.
- All five Microsoft Learn links already present in the post resolve to the intended documentation.
