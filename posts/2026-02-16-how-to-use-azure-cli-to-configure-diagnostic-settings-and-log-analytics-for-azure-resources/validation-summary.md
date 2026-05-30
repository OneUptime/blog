# Validation Summary: How to Use Azure CLI to Configure Diagnostic Settings and Log Analytics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics workspaces
- Kusto Query Language (KQL)
- Azure App Service diagnostics
- Azure SQL Database diagnostics
- Azure Activity Log export
- Azure Monitor scheduled query alerts

## Sources Consulted
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings subscription` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings/subscription?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor log-analytics workspace` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor log-analytics query` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor scheduled-query` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query?view=azure-cli-latest
- Microsoft Learn: Diagnostic settings in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Microsoft Learn: Activity log in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log
- Microsoft Learn: Tutorial: Troubleshoot an App Service app with Azure Monitor: https://learn.microsoft.com/en-us/azure/app-service/tutorial-troubleshoot-monitor
- Microsoft Learn: Monitor and performance tuning in Azure SQL Database and Azure SQL Managed Instance: https://learn.microsoft.com/en-us/azure/azure-sql/database/monitor-tune-overview?view=azuresql-db
- Microsoft Learn: Migrate from diagnostic settings storage retention to Azure Storage lifecycle management: https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/migrate-to-azure-storage-lifecycle-policy

## Issues Found
- The Log Analytics workspace creation example used `--retention-in-days`, which is not the current Azure CLI parameter. Changed it to `--retention-time`.
- The post used the workspace ARM resource ID for `az monitor log-analytics query`, but the query command requires the workspace customer GUID. Added `WORKSPACE_CUSTOMER_ID` retrieval and used it in the query example.
- The diagnostic setting examples included `retentionPolicy` objects while sending data to Log Analytics. Diagnostic settings storage retention is deprecated and retention for Log Analytics is managed at the workspace or table level, so the examples now omit those fields.
- The destination list omitted Azure Monitor partner solutions. Added the fourth destination and updated the diagram.
- The SQL audit log example could imply diagnostic settings enable database auditing. Added a note that `SQLSecurityAuditEvents` requires database or server auditing to be enabled separately.
- The scheduled query alert example used the KQL query directly as the condition placeholder and passed `--condition-query` without a placeholder assignment. Updated it to use a named placeholder and aggregate the returned `ErrorCount` column.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was done against current Microsoft Learn CLI reference pages rather than local `az --help` output.
