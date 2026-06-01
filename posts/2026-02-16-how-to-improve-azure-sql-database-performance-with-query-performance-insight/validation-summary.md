# Validation Summary: How to Improve Azure SQL Database Performance with Query Performance Insight

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Query Performance Insight
- Query Store
- Transact-SQL
- Azure CLI
- Azure Monitor metrics
- Azure SQL Database automatic tuning

## Sources Consulted
- Microsoft Learn: Query Performance Insight for Azure SQL Database - https://learn.microsoft.com/azure/azure-sql/database/query-performance-insight-use
- Microsoft Learn: Best practices for managing the Query Store - https://learn.microsoft.com/sql/relational-databases/performance/manage-the-query-store
- Microsoft Learn: sys.database_query_store_options - https://learn.microsoft.com/sql/relational-databases/system-catalog-views/sys-database-query-store-options-transact-sql
- Microsoft Learn: sys.query_store_runtime_stats - https://learn.microsoft.com/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-transact-sql
- Microsoft Learn: sys.query_store_plan - https://learn.microsoft.com/sql/relational-databases/system-catalog-views/sys-query-store-plan-transact-sql
- Microsoft Learn: sys.dm_db_missing_index_details - https://learn.microsoft.com/sql/relational-databases/system-dynamic-management-views/sys-dm-db-missing-index-details-transact-sql
- Microsoft Learn: Azure SQL Database automatic tuning REST API - https://learn.microsoft.com/rest/api/sql/database-automatic-tuning/update
- Microsoft Learn: Azure CLI az sql db - https://learn.microsoft.com/cli/azure/sql/db
- Microsoft Learn: Azure CLI az monitor metrics - https://learn.microsoft.com/cli/azure/monitor/metrics
- Microsoft Learn: Supported Azure Monitor metrics for Microsoft.Sql/servers/databases - https://learn.microsoft.com/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics

## Issues Found
- The Query Performance Insight feature list overstated that the portal directly shows individual execution plans and performance regression detection. Updated the list to match the documented portal behavior: top query details, query text, resource history, and recommendation annotations.
- The CLI example said it verified Query Store status, but `az sql db show --query "currentServiceObjectiveName"` returns the service objective, not Query Store state. Reworded the example so it only confirms the target database resource, and kept the T-SQL Query Store status check as the authoritative check.
- The top-query Query Store example ordered individual runtime-stat rows, which could misrepresent total query impact across multiple plans or intervals. Updated it to aggregate per `query_id` over the 24-hour window using execution-count-weighted averages and total CPU impact.
- The missing index section described the DMV query as "from Query Store." Corrected the wording to identify the missing index DMVs as the source.
- The automatic tuning Azure CLI example used `az sql db update --set automaticTuning...`, which is not documented on the current `az sql db update` surface. Replaced it with an `az rest` PATCH call to the documented database automatic tuning ARM resource.
- The execution plan warning about hash/merge joins implied those join types are inherently inefficient. Reworded it to focus on unexpectedly expensive joins caused by missing indexes, stale statistics, or inaccurate row estimates.

## Review Notes
The remaining examples are generally valid for Azure SQL Database, but production users should still validate index recommendations against write overhead, storage, and workload-specific regressions before applying them.
