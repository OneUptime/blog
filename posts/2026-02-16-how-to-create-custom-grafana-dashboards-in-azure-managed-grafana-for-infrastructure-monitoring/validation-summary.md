# Validation Summary: How to Create Custom Grafana Dashboards in Azure Managed Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Grafana
- Grafana dashboards, panels, variables, annotations, and dashboard JSON
- Azure Monitor Metrics
- Azure Monitor Logs and KQL
- Azure Resource Graph
- Azure Monitor VM Insights / InsightsMetrics
- Azure Network Watcher flow logs and Traffic Analytics
- Azure CLI `az grafana dashboard`

## Sources Consulted
- Microsoft Learn: Azure CLI `az grafana dashboard` reference, https://learn.microsoft.com/en-us/cli/azure/grafana/dashboard
- Microsoft Learn: Create a Grafana dashboard with Azure Managed Grafana, https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-create-dashboard
- Microsoft Learn: Supported metrics for `Microsoft.Compute/virtualMachines`, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachines-metrics
- Microsoft Learn: Supported metrics for `Microsoft.Storage/storageAccounts`, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-metrics
- Microsoft Learn: Supported metrics for `microsoft.network/virtualnetworkgateways`, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-virtualnetworkgateways-metrics
- Microsoft Learn: InsightsMetrics table reference and sample queries, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/insightsmetrics and https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/insightsmetrics
- Microsoft Learn: NSG flow logs overview and Traffic Analytics schema, https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-nsg-flow-logging-overview and https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics-schema
- Grafana documentation: Azure Monitor template variables, https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/azure-monitor/template-variables/
- Grafana documentation: Azure Monitor annotations, https://grafana.com/docs/grafana/latest/datasources/azure-monitor/annotations/
- Grafana documentation: Variable syntax and shared query results, https://grafana.com/docs/grafana/latest/variables/syntax/ and https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/share-query/

## Issues Found
- The Azure Resource Graph VM count query used `subscriptionId == "$subscription"` while the variable was configured as multi-value. Changed it to `subscriptionId in (${subscription:singlequote})` so multiple selected subscription IDs are interpolated as a KQL string list.
- The VM network panels described `Network In Total` and `Network Out Total` as `bytes/sec` with average aggregation. Azure Monitor documents these metrics as byte counters with Total aggregation, so the panel guidance now uses Total aggregation and byte units.
- The Log Analytics panel titled "Network Errors" queried `ReadBytesPerSecond` and `WriteBytesPerSecond`, which are throughput metrics, not error counters. Renamed the panel and query comment to network adapter throughput.
- The VM Insights KQL examples did not scope to Grafana's dashboard time range or VM Insights origin. Added `$__timeFilter(TimeGenerated)` and `Origin == "vm.azm.ms"` filters to align with Grafana and Azure Monitor examples.
- The NSG flow-log section did not mention the current retirement path for NSG flow logs. Clarified that the example applies to existing NSG flow logs and added guidance to use virtual network flow logs for new deployments.
- The Traffic Analytics query did not filter `AzureNetworkAnalytics_CL` to flow-log records. Added `SubType_s == "FlowLog"`.
- The Azure deployment annotation query did not include Grafana's time-range macro. Added `$__timeFilter(TimeGenerated)` as recommended by Grafana's Azure Monitor annotation documentation.
- The dashboard export example used a dashboard-looking name where the CLI requires the dashboard UID. Updated the placeholder to make the UID requirement clear.
- The dashboard restore guidance omitted the Grafana instance-specific `id` / `uid` caveat. Added a short note to remove those fields when importing as a new dashboard copy.
- The performance tip said to use a "Mixed" data source panel to share query results. Grafana documents "Mixed" as a way to query multiple data sources in one panel; shared query results use the "Dashboard" data source. Corrected the tip.

## Review Notes
The remaining dashboard design guidance is broadly accurate but intentionally heuristic. Thresholds such as disk queue depth above 2 are workload-dependent and should be tuned for the VM size, disk type, and application behavior.
