# Validation Summary: How to Configure Azure SQL Auditing with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Database
- Azure SQL Auditing
- Azure Monitor diagnostic settings
- Azure Log Analytics
- Azure Storage
- OpenTofu
- AzureRM provider

## Sources Consulted
- Azure SQL auditing setup: https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-setup?view=azuresql
- Supported log categories for `Microsoft.Sql/servers/databases`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-sql-servers-databases-logs
- Supported metrics for `Microsoft.Sql/servers/databases`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics
- Azure Monitor diagnostic settings ARM examples for Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/resource-manager-diagnostic-settings
- `azurerm_mssql_server_extended_auditing_policy`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server_extended_auditing_policy
- `azurerm_mssql_database_extended_auditing_policy`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database_extended_auditing_policy
- `azurerm_monitor_diagnostic_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting

## Issues Found
- The server-level auditing comment said `enabled = true` enabled audit for all event types. Azure SQL auditing uses the default auditing policy action groups unless you configure custom action groups separately, so I changed the comment to say it enables the auditing policy.
- The database-level auditing example claimed the `storage_endpoint` and storage key fields sent logs to Log Analytics. Those fields configure storage-based auditing, not Log Analytics delivery. I removed the storage arguments from the database auditing policy and left `log_monitoring_enabled = true`, which is the Azure Monitor side of the configuration.
- The diagnostic settings example included `SQLInsights` even though the step described routing audit logs. I removed that log category so the example focuses on the actual auditing stream, `SQLSecurityAuditEvents`.
- The diagnostic settings example used the deprecated `metric` block. I replaced it with the current `enabled_metric` block documented by the AzureRM provider.
- The `log_analytics_workspace_id` output returned `workspace_id`, which is the Log Analytics customer/workspace GUID, not the Azure resource ID implied by the output name. I corrected it to `azurerm_log_analytics_workspace.law.id`.

## Review Notes
- The post’s Log Analytics path is now technically correct for database-level auditing. If the goal is to send server-level audit events to Log Analytics as well, the AzureRM docs note that the `master` database must also be configured for Azure Monitor auditing.
- The storage account access key approach shown in the post is still supported by AzureRM, but Microsoft recommends managed identity for storage auditing when possible.
- The example resource names are valid formats, but Azure Storage account names and Azure SQL logical server names must be globally unique in a real deployment.
