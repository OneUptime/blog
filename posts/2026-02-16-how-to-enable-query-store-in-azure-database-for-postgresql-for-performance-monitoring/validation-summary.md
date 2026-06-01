# Validation Summary: How to Enable Query Store in Azure Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- Query Store (`pg_qs`)
- Query Store wait sampling (`pgms_wait_sampling`)
- Azure CLI
- PostgreSQL system views and SQL queries
- `pg_stat_statements`

## Sources Consulted
- Microsoft Learn: Query store in Azure Database for PostgreSQL Flexible Server: https://learn.microsoft.com/en-us/azure/postgresql/monitor/concepts-query-store
- Microsoft Learn: Best practices for Query Store: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-query-store-best-practices
- Microsoft Learn: Query Performance Insight in Azure Database for PostgreSQL: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-query-performance-insight
- Microsoft Learn: Customized Options server parameters: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/server-parameters-table-customized-options
- Microsoft Learn: Shared library preloading server parameters: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/server-parameters-table-client-connection-defaults-shared-library-preloading
- Microsoft Learn: Azure CLI `az postgres flexible-server parameter`: https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/parameter
- PostgreSQL documentation: Monitoring statistics, wait event fields in `pg_stat_activity`: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL documentation: `pg_stat_statements`: https://www.postgresql.org/docs/current/pgstatstatements.html

## Issues Found
- The post incorrectly said to enable Query Store by adding `pg_qs` to `shared_preload_libraries` and restarting the server. Current Microsoft documentation enables Query Store with the dynamic `pg_qs.query_capture_mode` server parameter, and `pg_qs` is not listed as an allowed value for `shared_preload_libraries`. I replaced that step with the documented dynamic parameter flow and removed the restart requirement.
- The post used uppercase enum values (`ALL`, `TOP`, `NONE`) while Azure documentation lists the values as `all`, `top`, and `none`. I updated the commands, table, and references to lowercase values.
- The post omitted that Query Store data is available in the `azure_sys` database. I updated the querying section to state that the `query_store` schema is in `azure_sys`.
- Several SQL examples used nonexistent `query_store.qs_view` columns such as `query_text_id`, `calls_count`, and `rows_affected`. Microsoft documents `qs_view` as exposing `query_sql_text`, `calls`, and `rows`. I rewrote the runtime-statistics queries to use the documented columns.
- The wait-statistics examples used a nonexistent `total_time` column in `query_store.pgms_wait_sampling_view`. Microsoft documents this view as exposing wait sample counts through `calls`, not total wait duration. I changed those examples to rank by summed wait samples.
- The Query Store comparison table said Query Store does not track query plans. Current Microsoft documentation shows Query Store can optionally store query plans with `pg_qs.store_query_plans`. I changed the table entry to "Optional."
- The performance section claimed overhead is usually under 5% and recommended enabling Query Store on every server. I replaced the unsupported percentage with a more conservative statement and added Microsoft's warning not to enable Query Store on the Burstable pricing tier.
- The capture description included CPU as a wait statistic. PostgreSQL wait events describe waits such as I/O, locks, memory, and other wait events, not CPU time as a wait event. I adjusted that wording.

## Review Notes
The remaining examples are illustrative and require connecting to the `azure_sys` database before running the direct `query_store` view queries. Query Store captures data in aggregation windows, so newly enabled servers may not show rows immediately.
