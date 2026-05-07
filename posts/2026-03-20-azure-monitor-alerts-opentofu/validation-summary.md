# Validation Summary: How to Set Up Azure Monitor Alerts with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp AzureRM provider
- Microsoft Azure
- Azure Monitor
- Azure Monitor action groups
- Azure Monitor metric alerts
- Azure Monitor scheduled query rules
- Kusto Query Language (KQL)

## Sources Consulted
- HashiCorp AzureRM provider docs for `azurerm_monitor_action_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_action_group
- HashiCorp AzureRM provider docs for `azurerm_monitor_metric_alert`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert
- HashiCorp AzureRM provider docs for `azurerm_monitor_scheduled_query_rules_alert_v2`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_scheduled_query_rules_alert_v2
- Azure Monitor action groups: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups
- Supported metrics for `Microsoft.Web/serverfarms`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-serverfarms-metrics
- Supported metrics for `Microsoft.Web/sites`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics
- Supported metrics for `Microsoft.Compute/virtualMachines`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachines-metrics
- Types of Azure Monitor alerts: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alert-options
- Azure Monitor Logs reference for `AppRequests`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/apprequests
- Example log table queries for `AppRequests`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/apprequests
- Kusto `toint()` function: https://learn.microsoft.com/en-us/kusto/query/toint-function?view=azure-monitor
- Optimize log search alert queries: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-log-query

## Issues Found
- The post pinned `hashicorp/azurerm` to `~> 3.85`, which is an outdated provider major relative to the current AzureRM 4.x documentation. I updated the example to `~> 4.0`.
- The multi-resource VM alert wording implied subscription-wide coverage without the Azure Monitor same-region constraint. I corrected the prose, code comment, and description to reflect that multi-resource metric alerts apply to same-type resources in a single Azure region.
- The App Service `Http5xx` metric example and the scheduled query rule both described count-based signals as an “error rate.” I changed those references to “error count” so the text matches the actual metric and query behavior.
- The scheduled query example compared `AppRequests.ResultCode` directly to a number even though the official schema defines `ResultCode` as a string. I changed the query to use `toint(ResultCode) >= 500`.
- The scheduled query example used `count()` against `AppRequests`. Because Application Insights sampling can roll multiple requests into a single record via `ItemCount`, I changed the aggregation to `sum(ItemCount)` in line with Microsoft’s official sample queries.
- The scheduled query example embedded the threshold in KQL and then counted result rows with `time_aggregation_method = "Count"`. I rewrote it so the query returns an `ErrorCount` measure and the alert rule evaluates that measure through `metric_measure_column`, `threshold`, and `time_aggregation_method`.
- The best-practices section implied `auto_mitigate = true` as a universal default. I clarified that this applies to metric alerts, while scheduled query rules v2 use `auto_mitigation_enabled`.

## Review Notes
- The log alert example assumes request telemetry is available in the Log Analytics workspace through the `AppRequests` table, which is typical for workspace-based Application Insights data.
- The remaining Azure Monitor resource types, metric namespaces, metric names, aggregation values, severity ranges, and action group schema matched the official documentation reviewed on 2026-05-07.
