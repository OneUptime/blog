# Validation Summary: How to Enable Automatic Tuning in Azure SQL Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Azure SQL automatic tuning
- Query Store
- Azure CLI
- Azure Resource Manager REST API
- Transact-SQL

## Sources Consulted
- Microsoft Learn: Automatic database tuning - https://learn.microsoft.com/en-us/azure/azure-sql/database/automatic-tuning-overview?view=azuresql-db
- Microsoft Learn: Monitor queries and improve workload performance with automatic tuning in the Azure portal - https://learn.microsoft.com/en-us/azure/azure-sql/database/automatic-tuning-enable?view=azuresql
- Microsoft Learn: ALTER DATABASE SET options (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql-set-options?view=sql-server-ver17
- Microsoft Learn: sys.database_automatic_tuning_options (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-automatic-tuning-options-transact-sql?view=sql-server-ver17
- Microsoft Learn: sys.dm_db_tuning_recommendations (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-tuning-recommendations-transact-sql?view=sql-server-ver16
- Microsoft Learn: Server Automatic Tuning - Update REST API - https://learn.microsoft.com/en-us/rest/api/sql/server-automatic-tuning/update?view=rest-sql-2023-08-01
- Microsoft Learn: Database Automatic Tuning - Update REST API - https://learn.microsoft.com/en-us/rest/api/sql/database-automatic-tuning/update?view=rest-sql-2023-08-01
- Microsoft Learn: Azure CLI sql db command reference - https://learn.microsoft.com/en-us/cli/azure/sql/db?view=azure-cli-lts
- Microsoft Learn: Azure CLI sql server command reference - https://learn.microsoft.com/en-us/cli/azure/sql/server?view=azure-cli-lts

## Issues Found
- The Azure CLI examples incorrectly used `az sql server update` and `az sql db update` to set custom tags. Tags do not configure Azure SQL automatic tuning. Replaced these with `az rest` PATCH examples against the official server-level and database-level automatic tuning REST endpoints.
- The `sys.dm_db_tuning_recommendations` examples selected `state_desc`, which is not a documented column. Replaced it with `JSON_VALUE(state, '$.currentValue')` and added documented columns such as `name`, `type`, and the implementation script from `details`.
- The manual recommendation application example used `sp_execute_external_script` with a Python placeholder, which would not apply an Azure SQL tuning recommendation. Replaced it with a T-SQL example that retrieves the recommended implementation script from `sys.dm_db_tuning_recommendations` and runs it with `sp_executesql`.
- The post claimed automatic tuning "will not make things worse." Microsoft documents automatic validation and prompt reversal on regression, but this should not be stated as an absolute guarantee. Reworded the claim to match the documented behavior.
- The Query Store explanation claimed it tracks every query's execution statistics. Reworded this to reflect Query Store capture policy behavior.
- The Drop Index description claimed Azure SQL creates a backup of the index definition before dropping. Reworded this to the documented behavior: Azure SQL drops eligible unused or duplicate indexes and can revert automatic tuning changes if needed.
- The Drop Index limitation said unused indexes are typically dropped after 30+ days. Microsoft documents unused indexes over the last 90 days, duplicate index handling, unique-index exclusions, and Premium/Business Critical service-tier behavior. Updated the limitation accordingly.

## Review Notes
- Azure CLI does not expose first-class `az sql server automatic-tuning` or `az sql db automatic-tuning` commands in the checked command references, so `az rest` is the appropriate CLI-based way to call the documented Azure Resource Manager API.
- Recommendations applied manually through T-SQL do not get the same automatic performance validation and reversal behavior as recommendations applied automatically by Azure SQL Database.
