# How to Create Custom Grafana Dashboards in Azure Managed Grafana for Infrastructure Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Managed Grafana, Dashboards, Infrastructure Monitoring, Azure Monitor, Visualization, Observability

Description: Learn how to design and build custom Grafana dashboards in Azure Managed Grafana for monitoring your infrastructure across VMs, storage, networking, and more.

---

Having Azure Managed Grafana set up with data sources connected is just the starting point. The real value comes from building dashboards that give your team actionable visibility into your infrastructure. A good dashboard answers questions before they are asked - is anything degraded, are we approaching capacity limits, and where should we focus our attention?

In this post, I will walk through designing and building custom Grafana dashboards specifically for Azure infrastructure monitoring. I will cover dashboard design principles, practical panel examples, and advanced techniques like template variables and annotations.

## Dashboard Design Principles

Before diving into building panels, let me share some design principles that separate good dashboards from noisy ones.

**Top-level summary first.** The top row of your dashboard should show the overall health at a glance. Use stat panels with thresholds (green, yellow, red) so someone can look at the dashboard for two seconds and know whether things are okay.

**Drill down progressively.** Below the summary, add more detailed panels. The reader should be able to scan from top to bottom, getting progressively more detail.

**One dashboard per audience.** Do not try to build a single dashboard that serves everyone. Create separate dashboards for executives (high-level health), operations (detailed metrics), and developers (application-specific data).

**Keep it under 15 panels per dashboard.** More than that and the page becomes slow to load and hard to read. If you need more panels, split into multiple dashboards.

## Setting Up Template Variables

Template variables make your dashboards interactive. Instead of hard-coding subscription IDs and resource names, you create dropdown variables that let users select what they want to see.

### Subscription Variable

In your dashboard settings, go to Variables and add a new variable:

- **Name:** subscription
- **Type:** Query
- **Data source:** Azure Monitor
- **Query type:** Subscriptions
- **Multi-value:** Yes

This creates a dropdown at the top of the dashboard that lists all subscriptions. You reference it in queries as `$subscription`.

### Resource Group Variable

Add another variable:

- **Name:** resourceGroup
- **Type:** Query
- **Data source:** Azure Monitor
- **Query type:** Resource Groups
- **Subscription:** $subscription

### Resource Name Variable

- **Name:** vmName
- **Type:** Query
- **Data source:** Azure Monitor
- **Query type:** Resource Names
- **Subscription:** $subscription
- **Resource Group:** $resourceGroup
- **Namespace:** Microsoft.Compute/virtualMachines

Now your dashboard users can filter by subscription, resource group, and specific VM without you hard-coding anything.

## Building the VM Monitoring Dashboard

Let me walk through building a comprehensive VM monitoring dashboard panel by panel.

### Row 1: Health Summary

**Panel 1: VM Count (Stat Panel)**

Use Azure Resource Graph to show the total number of VMs:

```kusto
resources
| where type == "microsoft.compute/virtualmachines"
| where subscriptionId == "$subscription"
| summarize count()
```

Set the stat panel threshold to show green for any value.

**Panel 2: Average CPU Across All VMs (Gauge Panel)**

- Data source: Azure Monitor
- Service: Metrics
- Resource type: Virtual Machines
- Metric: Percentage CPU
- Aggregation: Average

Configure the gauge thresholds:
- Green: 0-70%
- Yellow: 70-85%
- Red: 85-100%

**Panel 3: Total Network Traffic (Stat Panel)**

- Metric: Network In Total + Network Out Total
- Aggregation: Sum
- Unit: bytes/sec

### Row 2: CPU and Memory Time Series

**Panel 4: CPU Usage Over Time (Time Series)**

```
Data source: Azure Monitor
Service: Metrics
Subscription: $subscription
Resource Group: $resourceGroup
Resource: $vmName
Metric: Percentage CPU
Aggregation: Average, Max
```

Configure the time series panel to show both average and max as separate lines. This helps you distinguish between sustained load and spikes.

**Panel 5: Available Memory (Time Series)**

```
Metric: Available Memory Bytes
Aggregation: Average
```

If your VMs have the Azure Monitor agent installed, you can also query from Log Analytics:

```kusto
// Memory utilization from Log Analytics
InsightsMetrics
| where Namespace == "Memory"
| where Name == "AvailableMB"
| where Computer == "$vmName"
| summarize AvailableMB = avg(Val) by bin(TimeGenerated, 5m), Computer
| render timechart
```

### Row 3: Disk Performance

**Panel 6: Disk Read/Write IOPS (Time Series)**

```
Metric: OS Disk Read Operations/Sec, OS Disk Write Operations/Sec
Aggregation: Average
```

Display both metrics on the same time series chart using different colors.

**Panel 7: Disk Queue Length (Time Series)**

```
Metric: OS Disk Queue Depth
Aggregation: Average
```

Set a threshold on the Y-axis - anything consistently above 2 usually indicates disk contention.

### Row 4: Network Performance

**Panel 8: Network In/Out (Time Series)**

```
Metric: Network In Total, Network Out Total
Aggregation: Average
Unit: bytes/sec
```

**Panel 9: Network Errors (Time Series)**

If you are collecting network data through the Azure Monitor agent:

```kusto
// Network errors from Log Analytics
InsightsMetrics
| where Namespace == "Network"
| where Name == "WriteBytesPerSecond" or Name == "ReadBytesPerSecond"
| where Computer == "$vmName"
| summarize Value = avg(Val) by bin(TimeGenerated, 5m), Name
| render timechart
```

## Building the Storage Account Dashboard

Storage accounts have different monitoring needs. Here are key panels.

### Storage Capacity Trend

```kusto
// Storage account capacity over time from Metrics
// Use Azure Monitor Metrics query
// Resource type: Storage Accounts
// Metric: Used capacity
// Aggregation: Average
```

### Transaction Rate

```
Metric: Transactions
Aggregation: Total
Split by: API name
```

This shows you which storage operations are most frequent and helps identify unexpected patterns.

### Latency Percentiles

```
Metric: Success E2E Latency
Aggregation: Average
```

```
Metric: Success Server Latency
Aggregation: Average
```

Showing both end-to-end and server latency on the same chart helps you distinguish between server-side slowness and network latency.

## Building the Network Dashboard

### NSG Flow Log Analysis

If you are sending NSG flow logs to Log Analytics:

```kusto
// Top talkers by bytes transferred
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(1h)
| where FlowStatus_s == "A"
| summarize TotalBytes = sum(InboundBytes_d + OutboundBytes_d) by SrcIP_s
| top 10 by TotalBytes desc
```

### Virtual Network Gateway Throughput

```
Resource type: Virtual Network Gateways
Metric: Gateway S2S Bandwidth
Aggregation: Average
```

## Advanced Dashboard Techniques

### Annotations

Annotations mark events on your time series charts. They are useful for correlating metrics with deployments, incidents, or changes.

To add Azure deployment annotations:

1. Go to Dashboard settings > Annotations
2. Add a new annotation source
3. Data source: Azure Monitor (Logs)
4. Query:

```kusto
// Azure deployment events
AzureActivity
| where OperationNameValue contains "deployments/write"
| where ActivityStatusValue == "Success"
| project TimeGenerated, Text = strcat("Deployment: ", OperationName)
```

Now your metric charts will show vertical lines wherever a deployment happened, making it easy to correlate performance changes with deployments.

### Dashboard Links

Add links between dashboards for drill-down navigation. For example, your top-level health dashboard can link to the detailed VM dashboard, passing the VM name as a variable.

In Dashboard settings > Links:
- Type: Dashboard
- Include current template variables: Yes
- Open in new tab: Yes

### Alert Integration

You can embed alert status into your dashboards using the Alert List panel. This shows all firing alerts in a single panel, giving operators a quick view of what needs attention.

## Exporting and Versioning Dashboards

Always export your dashboards to JSON and store them in version control:

```bash
# Export a dashboard to JSON
az grafana dashboard show \
    --name "my-grafana-workspace" \
    --resource-group "grafana-rg" \
    --dashboard "vm-monitoring-dashboard" \
    --output json > dashboards/vm-monitoring.json
```

You can then import dashboards into other Managed Grafana instances or restore them if something goes wrong:

```bash
# Import a dashboard from JSON
az grafana dashboard import \
    --name "my-grafana-workspace" \
    --resource-group "grafana-rg" \
    --definition @dashboards/vm-monitoring.json
```

## Dashboard Performance Tips

**Use time range efficiently.** Do not default to "Last 30 days" for high-resolution metrics. Use "Last 6 hours" or "Last 24 hours" as defaults.

**Reduce query frequency.** Set the dashboard refresh interval to 1-5 minutes, not 5 seconds. Real-time is rarely needed for infrastructure monitoring.

**Use shared queries.** If multiple panels use the same query, create a "Mixed" data source panel and reuse query results.

**Limit the use of mv-expand.** KQL queries with mv-expand against large datasets can be slow. Pre-aggregate where possible.

## Summary

Building custom Grafana dashboards in Azure Managed Grafana is about combining the right data sources, thoughtful design, and interactive elements. Start with a health summary row, add detailed metric panels for each infrastructure layer, use template variables for interactivity, and add annotations for context. Store your dashboards as code, and iterate based on feedback from your team. A well-designed dashboard does not just show data - it tells a story about the health of your infrastructure.
