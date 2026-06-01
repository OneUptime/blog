# Validation Summary: How to Monitor Azure SQL Database Performance with Azure Monitor

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure SQL Database
- Azure Monitor metrics
- Azure Monitor diagnostic settings and resource logs
- Log Analytics and Kusto Query Language (KQL)
- Azure CLI
- Azure Monitor alerts
- Azure dashboards and workbooks
- Database watcher for Azure SQL

## Sources Consulted
- Microsoft Learn: Azure SQL Database monitoring data reference - https://learn.microsoft.com/en-us/azure/azure-sql/database/monitoring-sql-database-azure-monitor-reference?view=azuresql
- Microsoft Learn: Supported logs for Microsoft.Sql/servers/databases - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-sql-servers-databases-logs
- Microsoft Learn: az monitor diagnostic-settings - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: az monitor metrics alert - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: AzureDiagnostics table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azurediagnostics
- Microsoft Learn: AzureSQLQueryStoreRuntimeStatistics table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azuresqlquerystoreruntimestatistics
- Microsoft Learn: SQL Insights has been retired - https://learn.microsoft.com/en-us/azure/azure-sql/database/sql-insights-overview?view=azuresql
- Microsoft Learn: Monitor Azure SQL workloads with database watcher - https://learn.microsoft.com/en-us/azure/azure-sql/database-watcher-overview?view=azuresql

## Issues Found
- The post referred to "Workers count" as an Azure SQL Database metric. Azure Monitor exposes "Workers percentage" (`workers_percent`) for Azure SQL Database, so the wording was corrected.
- The dashboard recommendation used the ambiguous phrase "Memory metrics." Azure SQL Database exposes SQL instance memory percent (`sql_instance_memory_percent`) for database engine instance memory, while "Memory percentage" applies only to data warehouses. The dashboard wording was updated to "SQL instance memory metrics."
- The post recommended the Azure SQL Analytics solution (preview). SQL Insights/Azure SQL Analytics was retired on December 31, 2024 and is no longer supported. The section was updated to recommend database watcher (preview), Microsoft's current recommended advanced monitoring solution for Azure SQL Database and Azure SQL Managed Instance.

## Review Notes
- The Azure CLI commands match current documented command syntax, but the local environment does not have the Azure CLI installed, so command validation was performed against Microsoft Learn rather than local `az --help` output.
- The diagnostic log categories listed in the post are supported for `Microsoft.Sql/servers/databases`.
- The KQL examples are consistent with Azure Monitor Logs table and column references for Azure SQL diagnostic data.
