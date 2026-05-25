# Validation Summary: How to Create Azure Monitor Log Alerts in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Monitor log search alerts
- Azure Monitor scheduled query rules
- Log Analytics workspaces
- Kusto Query Language (KQL)
- Azure Monitor action groups
- Application Insights log tables

## Sources Consulted
- Terraform Registry: `azurerm_monitor_scheduled_query_rules_alert_v2` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_scheduled_query_rules_alert_v2
- Terraform Registry: AzureRM provider Azure CLI authentication guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/azure_cli
- Terraform Registry: `azurerm_log_analytics_workspace` data source: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/log_analytics_workspace
- Terraform Registry: `azurerm_monitor_action_group` data source: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/monitor_action_group
- Microsoft Learn: Create Azure Monitor log search alert rules: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-create-log-alert-rule
- Microsoft Learn: Optimize log search alert queries: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-log-query
- Microsoft Learn: Types of Azure Monitor alerts: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alert-options
- Microsoft Learn: Kusto `datetime_diff()` function: https://learn.microsoft.com/en-us/kusto/query/datetime-diff-function
- Microsoft Learn: Azure Monitor Logs reference for `AppExceptions`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/appexceptions
- Microsoft Learn: Azure Monitor Logs reference for `AppTraces`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/apptraces
- Microsoft Learn: Azure Monitor Logs reference for `AppRequests`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/apprequests
- Microsoft Learn: Azure Monitor Logs reference for `SigninLogs`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs
- Microsoft Learn: Azure Monitor Logs reference for `AzureActivity`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azureactivity

## Issues Found
- The Terraform foundation snippet pinned the AzureRM provider to `~> 3.0`. Updated it to `~> 4.0` and added an explicit `subscription_id` variable/provider setting because AzureRM v4 requires a subscription ID for plan/apply.
- The heartbeat missing-data alert used a `PT10M` window while filtering for hosts whose last heartbeat was older than 10 minutes. That can omit hosts with no records inside the evaluation window. Updated the window to `PT30M` and added `where TimeGenerated > ago(30m)` so the query can see recent historical heartbeats and flag hosts that have gone quiet for more than 10 minutes.

## Review Notes
- The scheduled query rule resource, criteria fields, action group usage, ISO 8601 evaluation/window durations, and `failing_periods` blocks match the current Terraform AzureRM resource schema.
- The KQL examples start from concrete tables, which aligns with Azure Monitor log alert query guidance.
- Microsoft notes that log search alerts can detect missing data, but they are more latency-sensitive than metric alerts for heartbeat-style scenarios. A production heartbeat alert should ideally use a known inventory or metric-based signal for hosts that have been silent longer than the query lookback.
