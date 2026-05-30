# Validation Summary: How to Sync Dataverse Tables with Azure SQL Database Using Power Automate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Dataverse
- Azure SQL Database
- Power Automate cloud flows
- Power Automate SQL Server connector
- Transact-SQL
- Power BI
- Azure Functions
- Azure Data Factory

## Sources Consulted
- Microsoft Learn: Use lists of rows in flows - https://learn.microsoft.com/en-us/power-automate/dataverse/list-rows
- Microsoft Learn: Microsoft Dataverse connector overview for Power Automate - https://learn.microsoft.com/en-us/power-automate/dataverse/overview
- Microsoft Learn: SQL Server connector for Power Automate and Logic Apps - https://learn.microsoft.com/en-us/connectors/sql/
- Microsoft Learn: Use table-valued parameters - https://learn.microsoft.com/en-us/sql/relational-databases/tables/use-table-valued-parameters-database-engine
- Microsoft Learn: contact EntityType reference - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/contact
- Microsoft Learn: Web API properties and lookup properties - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-properties
- Microsoft Learn: Manage Dataverse auditing - https://learn.microsoft.com/en-us/power-platform/admin/manage-dataverse-auditing
- Microsoft Learn: Optimize flows with parallel execution and concurrency - https://learn.microsoft.com/en-us/power-automate/guidance/coding-guidelines/implement-parallel-execution
- Microsoft Learn: Employ robust error handling - https://learn.microsoft.com/en-us/power-automate/guidance/coding-guidelines/error-handling
- Microsoft Learn: Limits of automated, scheduled, and instant flows - https://learn.microsoft.com/en-us/power-automate/limits-and-config
- Microsoft Learn: Copy and transform data in Dynamics 365 (Microsoft Dataverse) or Dynamics CRM using Azure Data Factory or Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/connector-dynamics-crm-office-365

## Issues Found
- The incremental sync filter used only `modifiedon gt LastSyncTime` and later updated `LastSyncTime` to `GETUTCDATE()`. That can skip records modified while the flow is running. I changed the flow to capture `SyncStartedAt`, filter with a bounded window, and update metadata to that same timestamp.
- The Dataverse selected columns list used `parentcustomerid` for the contact lookup value. In Dataverse Web API responses, lookup ID values use the computed lookup property format, so I changed it to `_parentcustomerid_value`.
- The deletion comparison SQL referenced `@CurrentDataverseIds` without declaring a table type or procedure parameter, so the snippet was not executable as shown. I changed it to define a table type and stored procedure with a `READONLY` table-valued parameter, using `NOT EXISTS` for the comparison.
- The batch optimization section implied Power Automate could directly send an array to SQL as a table-valued parameter. The SQL connector documentation exposes dynamic stored procedure parameters but does not document direct array-to-TVP binding from a flow action. I changed the guidance to move TVP or bulk-copy writes behind an Azure Function or custom API.
- The post referred to an "Azure SQL REST API for bulk operations." Azure SQL's REST APIs are management-plane APIs, not a general bulk data-write API for this scenario. I replaced this with Azure Function/custom API guidance using `SqlBulkCopy` or table-valued parameters.

## Review Notes
The remaining guidance is technically sound for a moderate-volume Power Automate sync pattern. For high-volume or low-latency production scenarios, Azure Synapse Link, Fabric/Data Factory, or a custom integration service would usually be more robust than record-by-record Power Automate actions.
