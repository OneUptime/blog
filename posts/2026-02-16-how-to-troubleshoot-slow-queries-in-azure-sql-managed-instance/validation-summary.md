# Validation Summary: How to Troubleshoot Slow Queries in Azure SQL Managed Instance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure SQL Managed Instance
- SQL Server Query Store
- Transact-SQL
- Dynamic management views
- Execution plans and Showplan XML
- Wait statistics
- Automatic tuning
- Index tuning

## Sources Consulted
- Microsoft Learn: Monitor performance by using the Query Store - https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store
- Microsoft Learn: sys.query_store_runtime_stats - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-transact-sql
- Microsoft Learn: sys.query_store_plan - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-plan-transact-sql
- Microsoft Learn: Display and save execution plans - https://learn.microsoft.com/en-us/sql/relational-databases/performance/display-and-save-execution-plans
- Microsoft Learn: sys.dm_exec_requests - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-exec-requests-transact-sql
- Microsoft Learn: sys.dm_os_wait_stats - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-os-wait-stats-transact-sql
- Microsoft Learn: sys.server_resource_stats for Azure SQL Managed Instance - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-server-resource-stats-azure-sql-database
- Microsoft Learn: sys.dm_db_tuning_recommendations - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-tuning-recommendations-transact-sql
- Microsoft Learn: Enable automatic tuning - https://learn.microsoft.com/en-us/azure/azure-sql/database/automatic-tuning-enable
- Microsoft Learn: sp_query_store_force_plan - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-query-store-force-plan-transact-sql

## Issues Found
- The execution plan section described Query Store output as an actual execution plan. Query Store stores Showplan XML in `sys.query_store_plan.query_plan`, while actual execution plans include runtime execution context. Updated the wording and code comment to say stored Showplan XML.
- The `sys.server_resource_stats` example selected columns such as `avg_data_io_percent`, `avg_log_write_percent`, `avg_memory_usage_percent`, and `avg_instance_cpu_percent`, which are not documented columns for Azure SQL Managed Instance's `sys.server_resource_stats` view. Replaced them with documented Managed Instance columns: `end_time`, `avg_cpu_percent`, `io_request`, `io_bytes_read`, `io_bytes_written`, `storage_space_used_mb`, and `reserved_storage_mb`.
- The wait statistics table used `MEMORY_ALLOCATION_EXT` for memory pressure and memory grants. Replaced it with `RESOURCE_SEMAPHORE`, the documented wait type for query memory grant waits.

## Review Notes
The remaining Query Store, DMV, missing index, parameter sniffing, tempdb, and automatic tuning examples are technically plausible for Azure SQL Managed Instance. Some tuning advice, such as interpreting `CXPACKET` or creating missing-index recommendations, still requires workload-specific judgment, but the post already cautions readers not to apply index suggestions blindly.
