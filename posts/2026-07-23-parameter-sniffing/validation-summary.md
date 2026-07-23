# Validation Summary: SQL Server Parameter Sniffing: How to Diagnose It and Choose the Right Fix

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server
- Transact-SQL (T-SQL)
- Parameter sniffing and parameter-sensitive query plans
- Query Store catalog views, runtime statistics, hints, and plan forcing
- Actual execution plans and cardinality estimates
- Parameter Sensitive Plan (PSP) optimization
- Query hints: `RECOMPILE`, `OPTIMIZE FOR`, and `OPTIMIZE FOR UNKNOWN`
- Statistics, indexes, and plan cache behavior
- Parameterized dynamic SQL with `sys.sp_executesql`

## Sources Consulted

- Microsoft Learn: Query Processing Architecture Guide — https://learn.microsoft.com/en-us/sql/relational-databases/query-processing-architecture-guide?view=sql-server-ver17
- Microsoft Learn: Parameter Sensitive Plan optimization — https://learn.microsoft.com/en-us/sql/relational-databases/performance/parameter-sensitive-plan-optimization?view=sql-server-ver17
- Microsoft Learn: Query hints (Transact-SQL) — https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-query?view=sql-server-ver17
- Microsoft Learn: Query Store hints — https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-hints?view=sql-server-ver17
- Microsoft Learn: `sys.sp_query_store_set_hints` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sys-sp-query-store-set-hints-transact-sql?view=sql-server-ver17
- Microsoft Learn: Tune performance with the Query Store — https://learn.microsoft.com/en-us/sql/relational-databases/performance/tune-performance-with-the-query-store?view=sql-server-ver17
- Microsoft Learn: `sys.database_query_store_options` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-query-store-options-transact-sql?view=sql-server-ver17
- Microsoft Learn: `sys.query_store_query_text` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-query-text-transact-sql?view=sql-server-ver17
- Microsoft Learn: `sys.query_store_query` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-query-transact-sql?view=sql-server-ver17
- Microsoft Learn: `sys.query_store_runtime_stats` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-transact-sql?view=sql-server-ver17
- Microsoft Learn: `sys.database_scoped_configurations` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-scoped-configurations-transact-sql?view=sql-server-ver17
- Microsoft Learn: `ALTER DATABASE SCOPED CONFIGURATION` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-scoped-configuration-transact-sql?view=sql-server-ver17
- Microsoft Learn: `sp_executesql` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-executesql-transact-sql?view=sql-server-ver17
- Microsoft Learn: `DBCC FREEPROCCACHE` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-freeproccache-transact-sql?view=sql-server-ver17
- Microsoft Learn: Statistics — https://learn.microsoft.com/en-us/sql/relational-databases/statistics/statistics?view=sql-server-ver17
- Microsoft Learn: Update statistics — https://learn.microsoft.com/en-us/sql/relational-databases/statistics/update-statistics?view=sql-server-ver17

## Issues Found

1. The Query Store example filtered `query_sql_text` for the stored-procedure name `usp_GetOrders`. Query Store stores the text of each individual statement, so a statement compiled from a stored procedure generally does not contain the procedure name in `query_sql_text`. Changed the filter to the distinctive statement fragment `CustomerId = @CustomerId`, which matches the query used throughout the post and can also match PSP-generated variants containing that predicate. Added a second predicate to exclude the Query Store diagnostic statement itself from the results.

## Review Notes

- SQL Server 2022 introduced PSP optimization for eligible `SELECT` queries with equality predicates at database compatibility level 160. SQL Server 2025 at compatibility level 170 adds PSP support for DML statements and expands support for `tempdb`; this does not invalidate the post's SQL Server 2022 guidance.
- `sys.query_store_runtime_stats` can contain multiple rows for the active interval and separates regular, client-aborted, and exception-aborted executions. The post's weighted aggregation across retained rows is valid for an all-history overview; a production investigation may additionally filter by time window and `execution_type`.
- Query Store hints through `sys.sp_query_store_set_hints` apply to SQL Server 2022 and later and supported Azure SQL platforms. The shown `OPTION(RECOMPILE)` and clear-hint calls are valid.
