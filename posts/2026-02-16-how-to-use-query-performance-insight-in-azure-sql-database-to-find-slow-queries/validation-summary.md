# Validation Summary: How to Use Query Performance Insight in Azure SQL Database to Find Slow Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Query Performance Insight
- Query Store
- Transact-SQL
- Azure Monitor alerts
- SQL Server dynamic management views

## Sources Consulted
- Microsoft Learn: Query Performance Insight for Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/query-performance-insight-use?view=azuresql
- Microsoft Learn: Monitoring Azure SQL Database with metrics and alerts - https://learn.microsoft.com/en-us/azure/azure-sql/database/monitoring-metrics-alerts?view=azuresql
- Microsoft Learn: Best practices for managing the Query Store - https://learn.microsoft.com/en-us/sql/relational-databases/performance/manage-the-query-store?view=sql-server-ver17
- Microsoft Learn: sys.database_query_store_options - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-query-store-options-transact-sql?view=sql-server-ver17
- Microsoft Learn: sys.query_store_runtime_stats - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-transact-sql?view=sql-server-ver17
- Microsoft Learn: sys.query_store_runtime_stats_interval - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-interval-transact-sql?view=sql-server-ver17
- Microsoft Learn: sys.dm_db_missing_index_group_stats - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-missing-index-group-stats-transact-sql?view=sql-server-ver17
- Microsoft Learn: Recompile a Stored Procedure - https://learn.microsoft.com/en-us/sql/relational-databases/stored-procedures/recompile-a-stored-procedure?view=sql-server-ver17

## Issues Found
- The post described Query Performance Insight as switching between CPU, Data IO, and Log IO query metrics. Current Microsoft documentation describes QPI query metrics as CPU, duration, and execution count. Updated the overview, dashboard metric list, top-query description, and the "Data IO Spikes" pattern to use QPI-supported metrics.
- The drill-down section listed logical reads and physical reads as QPI detail metrics. Microsoft documentation describes the individual query detail view as CPU consumption, duration, and execution count over time. Updated this wording.
- The time range examples included "last hour" and "7 days"; Microsoft documentation describes last 24 hours, past week, and past month options, with customization through the portal view. Updated the examples accordingly.
- The Query Store "top 10 by average CPU" query ordered raw runtime-stat rows and could return multiple rows per query/plan interval instead of one average per query. Updated it to aggregate CPU, duration, logical reads, execution count, and last execution time per query over the last 24 hours.
- The "plan regressions" example compared raw recent and historical runtime-stat rows for the same plan, which could duplicate rows and did not accurately represent the stated "recent versus historical" comparison. Updated it to aggregate recent and historical average duration per query before comparing them, and changed the surrounding description to avoid overstating it as definitive plan regression detection.

## Review Notes
The missing-index DMV example is syntactically valid and uses documented catalog views, but missing-index recommendations should still be reviewed with execution plans and workload context before creating indexes. Azure SQL Database metric alerts for CPU percentage, DTU percentage, Data IO percentage, and Log IO percentage are valid Azure Monitor use cases.
