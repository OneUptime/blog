# Validation Summary: How to Combine Metrics and Logs in a Single Azure Workbook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Workbooks
- Azure Monitor Metrics
- Azure Monitor Logs
- Log Analytics
- Azure Resource Graph
- Azure Activity Log
- Kusto Query Language (KQL)
- Application Insights

## Sources Consulted
- Microsoft Learn: Azure Workbooks data sources - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-data-sources
- Microsoft Learn: Workbook parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-parameters
- Microsoft Learn: Workbook resource parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-resources
- Microsoft Learn: Workbook time parameters - https://learn.microsoft.com/en-ca/azure/azure-monitor/visualize/workbooks-time
- Microsoft Learn: Metrics in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/metrics/data-platform-metrics
- Microsoft Learn: Azure Monitor metrics aggregation and display explained - https://learn.microsoft.com/en-us/azure/azure-monitor/metrics/metrics-aggregation-explained
- Microsoft Learn: Queries for the Perf table - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/perf
- Microsoft Learn: Queries for the Event table - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/event
- Microsoft Learn: AzureActivity table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azureactivity
- Microsoft Learn: Azure Monitor activity log - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/activity-log
- Microsoft Learn: KQL fullouter join - https://learn.microsoft.com/en-us/kusto/query/join-fullouter
- Microsoft Learn: Application Insights metrics and telemetry dimensions - https://learn.microsoft.com/en-us/azure/azure-monitor/app/metrics-overview

## Issues Found
- The VM parameter query returned only the VM name, but the metrics control needs a resource ID while log queries need the VM name. Changed the VM parameter to a Resource picker backed by Azure Resource Graph and updated log queries to use `{VM:name}`.
- The Azure Resource Graph query used `resources`; changed it to `Resources`, matching the documented Resource Graph table name.
- The metrics retention/granularity wording implied all metrics are collected at 1-minute granularity. Updated the wording to say metrics have a minimum time granularity of 1 minute for many charts and that collection frequency varies by metric.
- Several KQL filters used case-sensitive comparisons for event levels and activity statuses. Updated them to use case-insensitive operators such as `=~` and `in~`.
- The Activity Log query used `ActivityStatusValue == "Success"` and `_ResourceId`; changed it to `ActivityStatusValue =~ "Succeeded"` and `ResourceId =~ "{VM}"`, matching the documented AzureActivity schema and common values.
- The Activity Log section implied AzureActivity is always available. Clarified that the Azure Activity Log must be routed to a Log Analytics workspace before querying the `AzureActivity` table.
- Performance counter object and counter filters were too narrow or used repeated `or` expressions. Updated them to use documented object-name variants and `in (...)` filters.
- The Application Insights exception query compared `client_IP` to a VM name. Replaced that filter with `cloud_RoleInstance` alongside `cloud_RoleName`, which aligns with Application Insights role dimensions.
- The health score query joined tables using `$left.cpuScore == $left.cpuScore`, which compares the left side to itself and is not a valid join condition. Replaced it with a constant `JoinKey` and used `coalesce()` for missing scores.
- A correlation query comment said it combined deployment events while the query actually used error events. Updated the comment to match the query.

## Review Notes
- The examples assume the relevant VM performance counters, Windows events, Heartbeat data, Activity Log export, and Application Insights telemetry are being collected into the queried workspace. Without those data collection rules or diagnostic settings, the KQL is valid but may return no rows.
- The Application Insights example uses the classic `exceptions` table naming. Workspace-based Application Insights resources may expose equivalent data through `AppExceptions`; this could be mentioned in a future broader update.
