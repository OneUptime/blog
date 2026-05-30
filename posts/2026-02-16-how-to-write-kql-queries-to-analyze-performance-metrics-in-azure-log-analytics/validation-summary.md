# Validation Summary: How to Write KQL Queries to Analyze Performance Metrics in Azure Log Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kusto Query Language (KQL)
- Azure Log Analytics
- Azure Monitor Logs
- Azure Monitor Agent and VM Insights
- Application Insights log tables
- Azure Monitor log search alerts

## Sources Consulted
- Microsoft Learn: Azure Monitor Logs reference - Perf: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/perf
- Microsoft Learn: Example log table queries for Perf: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/perf
- Microsoft Learn: Azure Monitor Logs reference - InsightsMetrics: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/insightsmetrics
- Microsoft Learn: Example log table queries for InsightsMetrics: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/insightsmetrics
- Microsoft Learn: Monitor virtual machines with Azure Monitor - Alerts: https://learn.microsoft.com/en-us/azure/azure-monitor/vm/monitor-virtual-machine-alerts
- Microsoft Learn: Azure Monitor Logs reference - AzureMetrics: https://learn.microsoft.com/en-au/azure/azure-monitor/reference/tables/azuremetrics
- Microsoft Learn: Azure Monitor Logs reference - AppPerformanceCounters: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/appperformancecounters
- Microsoft Learn: Example log table queries for AppExceptions: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/appexceptions
- Microsoft Learn: Kusto arg_max() aggregation function: https://learn.microsoft.com/en-us/kusto/query/arg-max-aggregation-function
- Microsoft Learn: Kusto make-series operator: https://learn.microsoft.com/en-us/kusto/query/make-series-operator
- Microsoft Learn: Kusto series_decompose_anomalies() function: https://learn.microsoft.com/en-us/kusto/query/series-decompose-anomalies-function
- Microsoft Learn: Kusto render operator and anomalychart properties: https://learn.microsoft.com/en-us/kusto/query/render-operator
- Microsoft Learn: Create Azure Monitor log search alert rules: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-create-log-alert-rule

## Issues Found
- The `InsightsMetrics` memory percentage query used `parse_json(Tags)["vm.azm.ms/totalMemoryMB"]`. Microsoft VM alert examples use the `vm.azm.ms/memorySizeMB` tag for total memory. I changed the query to `todynamic(Tags)["vm.azm.ms/memorySizeMB"]` and cast it with `toreal()` so the percentage calculation works against the current VM Insights schema.
- The same `InsightsMetrics` query did not restrict rows to VM Insights. I added `where Origin == "vm.azm.ms"` to match Microsoft examples and avoid mixing similarly named metrics from other origins.

## Review Notes
The remaining examples are syntactically valid KQL patterns for Azure Monitor Logs. Some `Perf` counter names are OS- or collection-rule-dependent, so readers may still need to adjust object and counter names for their own Windows, Linux, Azure Monitor Agent, or legacy agent configuration.
