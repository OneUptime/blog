# Validation Summary: How to Scale an Azure SQL Database Up or Down Without Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure SQL Database
- Azure CLI
- Azure PowerShell
- Transact-SQL
- Entity Framework Core
- pyodbc
- Azure Automation
- Azure Monitor alerts and Azure Functions

## Sources Consulted
- Microsoft Learn: Dynamically scale database resources with minimal downtime - https://learn.microsoft.com/en-us/azure/azure-sql/database/scale-resources
- Microsoft Learn: Scale single database resources in Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/single-database-scale
- Microsoft Learn: Azure CLI `az sql db update` reference - https://learn.microsoft.com/en-us/cli/azure/sql/db
- Microsoft Learn: `Set-AzSqlDatabase` PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.sql/set-azsqldatabase
- Microsoft Learn: `ALTER DATABASE` for Azure SQL Database - https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql
- Microsoft Learn: `sys.dm_operation_status` - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-operation-status-azure-sql-database
- Microsoft Learn: `sys.database_service_objectives` - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-service-objectives-azure-sql-database
- Microsoft Learn: Azure SQL Database Hyperscale FAQ - https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale-frequently-asked-questions-faq
- Microsoft Learn: Migrate Azure Automation Run As accounts to managed identities - https://learn.microsoft.com/en-us/azure/automation/migrate-run-as-accounts-managed-identity
- Microsoft Learn: Azure Automation managed identity usage - https://learn.microsoft.com/en-us/azure/automation/enable-managed-identity-for-automation
- Microsoft Learn: EF Core connection resiliency - https://learn.microsoft.com/en-us/ef/core/miscellaneous/connection-resiliency

## Issues Found
- The post said Azure always copies the database to a new resource during scaling. Microsoft documents that copying is required only for some combinations of tier and compute-size changes, so the workflow description was narrowed.
- The post gave the final switch duration as approximately 10-30 seconds. Microsoft documents that the interruption is generally less than 30 seconds and often only a few seconds, so the wording was corrected.
- The post said storage can only be scaled up and later said storage cannot be scaled down. Microsoft documents that max data size can be increased or decreased, subject to tier and size constraints, while reclaiming allocated file space is a separate shrink operation. Both statements were corrected.
- The DTU service objective list used `B` for Basic. Official service objective examples and catalog values use `Basic`, so the list was corrected.
- The T-SQL monitoring query selected `service_objective` and `edition` directly from `sys.databases`, which is not the documented Azure SQL view for service objective details and does not show operation progress. It was replaced with a `sys.dm_operation_status` query from `master`, which Microsoft documents for tracking alter and service-tier operations.
- The Azure Automation runbook authenticated with the retired Run As account pattern. Azure Automation Run As accounts retired on September 30, 2023, so the sample was updated to use `Connect-AzAccount -Identity` with a managed identity.
- The post overstated that scaling up is generally faster than scaling down and that Hyperscale compute scaling is almost instant. The wording was adjusted to match Microsoft guidance: latency depends on source and target tiers, data copying requirements, and Hyperscale compute model.

## Review Notes
- The Azure CLI and PowerShell scaling examples match the current documented command parameters.
- The Entity Framework Core retry example uses the documented `EnableRetryOnFailure` API.
- `Gen5` remains accepted in Azure CLI and PowerShell examples, although Microsoft documentation notes the hardware has been renamed to standard-series (Gen5).
