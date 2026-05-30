# Validation Summary: How to Set Up Workload Management and Resource Classes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Synapse Analytics
- Dedicated SQL pool
- Workload management
- Workload groups
- Workload classifiers
- Resource classes
- Transact-SQL

## Sources Consulted
- Microsoft Learn: Workload management with resource classes in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/resource-classes-for-workload-management
- Microsoft Learn: Memory and concurrency limits for dedicated SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/memory-concurrency-limits
- Microsoft Learn: Workload classification for dedicated SQL pool in Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/sql-data-warehouse-workload-classification
- Microsoft Learn: Quickstart: Configure workload isolation in a dedicated SQL pool using T-SQL - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/quickstart-configure-workload-isolation-tsql
- Microsoft Learn: CREATE WORKLOAD GROUP (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-workload-group-transact-sql
- Microsoft Learn: CREATE WORKLOAD CLASSIFIER (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-workload-classifier-transact-sql?view=azure-sqldw-latest
- Microsoft Learn: sys.dm_workload_management_workload_groups_stats (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-workload-management-workload-group-stats-transact-sql?view=azure-sqldw-latest
- Microsoft Learn: sys.dm_pdw_exec_requests (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-pdw-exec-requests-transact-sql
- Microsoft Learn: sys.workload_management_workload_classifiers (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-workload-management-workload-classifiers-transact-sql?view=azure-sqldw-latest
- Microsoft Learn: sys.workload_management_workload_classifier_details (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-workload-management-workload-classifier-details-transact-sql?view=azure-sqldw-latest

## Issues Found
- The static resource class table listed fixed memory amounts that are not how Microsoft documents current dedicated SQL pool resource-class limits. Replaced it with documented concurrency slot usage examples at DW500c and DW1000c.
- The dynamic resource class table mixed percentages with incorrect example memory amounts. Replaced it with documented memory percentages for DW500c and DW1000c and higher.
- Several workload group examples used `REQUEST_MIN_RESOURCE_GRANT_PERCENT = 3` with nonzero `MIN_PERCENTAGE_RESOURCE` values where 3 is not a factor of the group minimum. Changed those examples to 5 so they satisfy documented workload group constraints.
- The label-based classifier example used `LABEL`, which is not valid `CREATE WORKLOAD CLASSIFIER` syntax, and omitted the mandatory `MEMBERNAME`. Changed it to `WLM_LABEL` and added `MEMBERNAME`.
- The active-query monitoring query sorted importance lexically instead of by workload-management priority. Replaced the `ORDER BY` with an explicit `CASE` expression.
- The workload group stats query selected columns that are not in `sys.dm_workload_management_workload_groups_stats`. Replaced them with documented DMV columns.
- The classifier monitoring query referenced `sys.dm_pdw_exec_classifier_info`, which does not appear in the official Synapse DMV documentation. Replaced it with documented catalog views for classifier definitions and `sys.dm_pdw_exec_requests` for recent matched requests.

## Review Notes
Microsoft Learn currently recommends Microsoft Fabric Data Warehouse for new data warehousing projects and positions existing dedicated SQL pool workloads as candidates for upgrade. The Synapse dedicated SQL pool workload management features covered in this post are still documented and technically valid.
