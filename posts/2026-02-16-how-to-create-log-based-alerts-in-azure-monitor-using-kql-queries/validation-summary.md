# Validation Summary: How to Create Log-Based Alerts in Azure Monitor Using KQL Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Monitor
- Log search alerts / scheduled query rules
- Kusto Query Language (KQL)
- Log Analytics workspaces
- Application Insights workspace tables
- Azure CLI
- Azure Monitor action groups

## Sources Consulted
- Microsoft Learn: Create Azure Monitor log search alert rules, https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-create-log-alert-rule
- Microsoft Learn: Tutorial - Create a log search alert for an Azure resource, https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/tutorial-log-alert
- Microsoft Learn: Overview of Azure Monitor alerts, https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview
- Microsoft Learn: Choosing the right type of alert rule, https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alert-options
- Microsoft Learn: Troubleshoot log search alerts in Azure Monitor, https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-troubleshoot-log
- Microsoft Learn: Azure CLI `az monitor scheduled-query`, https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Microsoft Learn: Azure CLI `az monitor action-group`, https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Microsoft Learn: Azure Monitor Logs reference - AppRequests, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/apprequests
- Microsoft Learn: Azure Monitor Logs reference - AppDependencies, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/appdependencies
- Microsoft Learn: Azure Monitor Logs reference - SigninLogs, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs
- Microsoft Learn: Azure Monitor Logs reference - AzureActivity, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azureactivity
- Microsoft Learn: Monitor operational issues logged in your Azure Monitor Log Analytics workspace, https://learn.microsoft.com/en-us/azure/azure-monitor/logs/monitor-workspace

## Issues Found
- The first AppRequests example grouped by `Url = Name` while describing grouping by request URL. Changed it to group by the documented `Url` column.
- The portal condition settings used "Lookback period" wording for log alerts. Updated this to "Aggregation granularity (window size)", matching Azure Monitor log search alert terminology.
- The Azure CLI scheduled query sample used an inline query in `--condition` and also used `AggregatedValue`, which is reserved in log search alert rules. Updated the command to use the documented `--condition-query` placeholder pattern.
- The webhook example implied Azure Monitor could post directly to Slack's incoming webhook format. Changed the wording and URL to a generic webhook endpoint because Azure Monitor sends its own alert payload schema.
- The dimensions example used `cloud_RoleName` with the `AppRequests` workspace table. Updated it to the documented `AppRoleName` column.
- The alert rule health example queried `_LogOperation` with `Category == "Alert"`, which is not a documented `_LogOperation` category. Replaced it with an `AzureActivity` query for scheduled query rule disable events, consistent with Azure Monitor troubleshooting documentation.
- The cost section said log alert rules are billed per evaluation and that KQL consumes Log Analytics query units. Updated this to reflect that lower evaluation frequency increases alert-rule cost, dimension splitting can add time-series cost, and Log Analytics ingestion and retention are billed separately.

## Review Notes
The post is technically relevant and broadly accurate after the targeted fixes. The local environment did not have Azure CLI installed, so CLI validation was performed against the official Microsoft Learn Azure CLI reference rather than local `az --help` output.
