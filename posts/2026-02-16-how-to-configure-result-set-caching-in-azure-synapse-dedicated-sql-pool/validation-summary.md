# Validation Summary: How to Configure Result Set Caching in Azure Synapse Dedicated SQL Pool

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Azure Synapse Analytics dedicated SQL pool
- Result set caching
- Transact-SQL
- Dedicated SQL pool dynamic management views
- DBCC result set cache commands
- Materialized views

## Sources Consulted
- Microsoft Learn: Performance tuning with result set caching - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/performance-tuning-result-set-caching
- Microsoft Learn: SET RESULT_SET_CACHING (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/set-result-set-caching-transact-sql?view=azure-sqldw-latest
- Microsoft Learn: ALTER DATABASE SET Options (Transact-SQL) - https://learn.microsoft.com/sql/t-sql/statements/alter-database-transact-sql-set-options
- Microsoft Learn: sys.dm_pdw_exec_requests (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-pdw-exec-requests-transact-sql
- Microsoft Learn: DBCC SHOWRESULTCACHESPACEUSED (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-showresultcachespaceused-transact-sql?view=azure-sqldw-latest
- Microsoft Learn: DBCC DROPRESULTSETCACHE (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-dropresultsetcache-transact-sql?view=azure-sqldw-latest
- Microsoft Learn: CREATE MATERIALIZED VIEW AS SELECT (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-materialized-view-as-select-transact-sql?view=azure-sqldw-latest

## Issues Found
- The post said cached results are stored in the control node's storage. Microsoft documents that dedicated SQL pool caches query results in the user database, while cache create/retrieve operations happen on the control node. Updated the wording to distinguish storage location from execution behavior.
- The post described cached results as expiring after 48 hours even if data has not changed. Microsoft documents automatic eviction every 48 hours for unused or invalidated cached results, plus eviction when the cache approaches its maximum size. Updated the cache lifecycle and invalidation language.
- The post stated the result set cache has a 10 GB total capacity per database. Current Microsoft documentation states the maximum result set cache size is 1 TB per database, while individual queries returning more than 10 GB are not cached. Updated the capacity and large-result guidance.
- The post described only `1` and `0` meanings for `sys.dm_pdw_exec_requests.result_cache_hit`. Microsoft documents `NULL` for non-SELECT requests and negative values for reasons caching was not used. Added those meanings.
- The post described `DBCC SHOWRESULTCACHESPACEUSED` output as reserved and available cache capacity. Microsoft documents the values in KB, with `reserved_space` as cache space used by the database and `unused_space` as unused space within the reserved allocation. Updated those descriptions.
- The cache-hit monitoring text implied values were only hits versus executed misses and used an unsupported fixed 50% healthy threshold. Updated it to account for ineligible/negative values and describe workload-dependent cache-hit expectations.

## Review Notes
The post is technically relevant and remains valid after the corrections. The examples use Synapse dedicated SQL pool-specific T-SQL and are not intended for serverless SQL pool, where these result set cache commands are not supported.
