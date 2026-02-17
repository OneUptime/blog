# How to Combine Metrics and Logs in a Single Azure Workbook for Unified Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Workbooks, Metrics, Logs, Unified Dashboards, Azure Monitor, KQL

Description: Learn how to combine Azure Monitor metrics and Log Analytics logs in a single Azure Workbook for unified dashboards that correlate different data types.

---

One of the biggest challenges in monitoring is correlating information from different data sources. Your metrics tell you that CPU spiked at 2:15 PM. Your logs tell you that a memory exception occurred. Your activity log tells you that someone deployed a new version. Individually, each piece of information is useful. Together, they tell the full story. Azure Workbooks let you combine metrics, logs, and other data sources in a single view so you can see these correlations without switching between tools.

In this post, I will show you how to build unified dashboards in Azure Workbooks that bring together metrics and logs side by side.

## Understanding the Data Sources

Before building the dashboard, let me clarify the difference between the data sources we will be combining.

**Azure Monitor Metrics** - Numeric time-series data collected at regular intervals. Think CPU percentage, memory usage, disk IOPS, network bytes. Metrics are lightweight, near real-time (1-minute granularity), and stored for 93 days. They are queried through the Metrics API.

**Log Analytics Logs** - Structured and semi-structured data stored in Log Analytics workspaces. This includes Windows/Linux events, syslog, performance counters, custom logs, and Azure diagnostic logs. Logs are queried using KQL.

**Activity Logs** - Administrative operations performed on Azure resources. Who created, modified, or deleted what.

**Azure Resource Graph** - Resource inventory and configuration data.

Workbooks can query all of these in a single page.

## Setting Up the Workbook Structure

A good unified dashboard follows this structure:

```
[Time Range Parameter] [Subscription Parameter] [Resource Parameter]

Row 1: Health Summary (Metrics-based stat panels)
Row 2: Metrics Time Charts (CPU, Memory, Disk, Network)
Row 3: Log-Based Analysis (Error counts, event summaries)
Row 4: Activity Log Timeline (Deployments, changes)
Row 5: Correlation View (Metrics + Log annotations)
```

Let me build this out step by step.

## Step 1: Create Parameters

Start with the essential parameters:

**TimeRange** - Time range picker, default to "Last 24 hours"
**Subscription** - Subscription picker
**ResourceGroup** - Resource group picker, filtered by Subscription
**VM** - Query-based dropdown:

```kusto
resources
| where type == "microsoft.compute/virtualmachines"
| where subscriptionId == "{Subscription}"
| where resourceGroup == "{ResourceGroup}"
| project name
| sort by name asc
```

## Step 2: Add Metrics Panels

Workbooks have native support for Azure Monitor Metrics queries. When adding a query, select "Metrics" as the data source type.

### CPU and Memory Metrics Row

Add a metrics query with these settings:

- **Data source:** Azure Monitor
- **Resource type:** Virtual Machines
- **Resource:** `{VM}`
- **Time range:** `{TimeRange}`
- **Metric:** Percentage CPU
- **Aggregation:** Average, Maximum
- **Visualization:** Time chart

Add a second panel for memory. If you are using the Azure Monitor agent with performance counters:

- **Data source:** Logs
- **Workspace:** Your Log Analytics workspace

```kusto
// Memory usage from performance counters
Perf
| where TimeGenerated {TimeRange}
| where Computer contains "{VM}"
| where ObjectName == "Memory"
| where CounterName == "% Used Memory" or CounterName == "Available MBytes"
| summarize Value = avg(CounterValue) by CounterName, bin(TimeGenerated, 5m)
| render timechart
```

### Disk and Network Metrics

Add another row with disk and network metrics:

```kusto
// Disk latency from metrics
Perf
| where TimeGenerated {TimeRange}
| where Computer contains "{VM}"
| where ObjectName == "LogicalDisk"
| where CounterName == "Avg. Disk sec/Read" or CounterName == "Avg. Disk sec/Write"
| where InstanceName == "_Total"
| summarize AvgLatencyMs = avg(CounterValue) * 1000 by CounterName, bin(TimeGenerated, 5m)
| render timechart
```

For network:

```kusto
// Network throughput
Perf
| where TimeGenerated {TimeRange}
| where Computer contains "{VM}"
| where ObjectName == "Network Adapter"
| where CounterName == "Bytes Received/sec" or CounterName == "Bytes Sent/sec"
| summarize BytesPerSec = sum(CounterValue) by CounterName, bin(TimeGenerated, 5m)
| render timechart
```

## Step 3: Add Log-Based Analysis

Below the metrics, add panels that query Log Analytics for event data.

### Error Summary

```kusto
// Error events summary for the selected VM
Event
| where TimeGenerated {TimeRange}
| where Computer contains "{VM}"
| where EventLevelName == "Error"
| summarize ErrorCount = count() by Source, EventID
| sort by ErrorCount desc
| take 15
```

Set visualization to "Grid" with conditional formatting on ErrorCount (red background for high values).

### Recent Critical Events

```kusto
// Most recent critical and error events
Event
| where TimeGenerated {TimeRange}
| where Computer contains "{VM}"
| where EventLevelName in ("Error", "Critical")
| project TimeGenerated, EventLevelName, Source, EventID, RenderedDescription
| sort by TimeGenerated desc
| take 25
```

Set visualization to "Grid" with the TimeGenerated column formatted as a relative time (e.g., "3 hours ago").

### Application Errors (If App Insights Connected)

```kusto
// Application exceptions if available
exceptions
| where timestamp {TimeRange}
| where cloud_RoleName contains "{VM}" or client_IP contains "{VM}"
| summarize Count = count() by type, method, outerMessage
| sort by Count desc
| take 10
```

## Step 4: Add Activity Log Panel

The Activity Log shows what administrative operations happened:

```kusto
// Azure Activity Log for the selected VM
AzureActivity
| where TimeGenerated {TimeRange}
| where _ResourceId contains "{VM}"
| where ActivityStatusValue == "Success"
| project TimeGenerated, OperationNameValue, Caller, CategoryValue
| sort by TimeGenerated desc
| take 20
```

This is crucial for correlation. If CPU spiked and there was a deployment at the same time, the activity log panel makes that connection visible.

## Step 5: Build the Correlation View

The most valuable part of a unified dashboard is the correlation view - where metrics and log events are displayed on the same timeline.

### Overlaying Annotations on Metrics

Workbooks do not natively support annotations like Grafana does, but you can achieve a similar effect using a combined query:

```kusto
// Combine CPU metrics with deployment events on the same timeline
let cpuData = Perf
| where TimeGenerated {TimeRange}
| where Computer contains "{VM}"
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize CPU = avg(CounterValue) by bin(TimeGenerated, 5m)
| extend Series = "CPU %";
let events = Event
| where TimeGenerated {TimeRange}
| where Computer contains "{VM}"
| where EventLevelName == "Error"
| summarize ErrorCount = count() by bin(TimeGenerated, 5m)
| extend CPU = todouble(ErrorCount * 5)
| extend Series = "Errors (scaled)"
| project TimeGenerated, CPU, Series;
union cpuData, events
| render timechart
```

This puts CPU percentage and error count on the same chart with different series. The error count is scaled to be visible alongside CPU values.

### Side-by-Side Panels with Synchronized Time

A more practical approach is to place metrics and log panels side by side with the same time range parameter. When the user adjusts the time range, both panels update simultaneously.

Create a row with two columns:

**Left column (50% width):** Metrics time chart showing CPU, memory, disk
**Right column (50% width):** Log query showing events in the same period

```kusto
// Event timeline aligned with metrics
Event
| where TimeGenerated {TimeRange}
| where Computer contains "{VM}"
| summarize
    Errors = countif(EventLevelName == "Error"),
    Warnings = countif(EventLevelName == "Warning"),
    Info = countif(EventLevelName == "Information")
    by bin(TimeGenerated, 15m)
| render timechart
```

## Step 6: Add a Health Score Panel

Combine metrics and logs into a single health score:

```kusto
// Compute a simple health score
let cpuHealth = Perf
| where TimeGenerated > ago(15m)
| where Computer contains "{VM}"
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize AvgCPU = avg(CounterValue)
| extend cpuScore = case(AvgCPU < 70, 100, AvgCPU < 85, 60, 20);
let errorHealth = Event
| where TimeGenerated > ago(15m)
| where Computer contains "{VM}"
| where EventLevelName == "Error"
| summarize ErrorCount = count()
| extend errorScore = case(ErrorCount == 0, 100, ErrorCount < 5, 70, 30);
let heartbeatHealth = Heartbeat
| where TimeGenerated > ago(15m)
| where Computer contains "{VM}"
| summarize HeartbeatCount = count()
| extend hbScore = case(HeartbeatCount > 2, 100, HeartbeatCount > 0, 50, 0);
cpuHealth
| join kind=fullouter errorHealth on $left.cpuScore == $left.cpuScore
| join kind=fullouter heartbeatHealth on $left.cpuScore == $left.cpuScore
| extend OverallScore = (cpuScore + errorScore + hbScore) / 3
| project OverallScore, CPUScore = cpuScore, ErrorScore = errorScore, HeartbeatScore = hbScore
```

Display this as a stat panel with color-coded thresholds:
- Green: 80-100
- Yellow: 50-79
- Red: 0-49

## Adding Cross-Resource Queries

Workbooks can query across multiple Log Analytics workspaces and resources in a single query:

```kusto
// Cross-workspace query for multi-region monitoring
let eastWorkspace = workspace("east-workspace-id").Heartbeat
| where TimeGenerated > ago(5m)
| extend Region = "East US";
let westWorkspace = workspace("west-workspace-id").Heartbeat
| where TimeGenerated > ago(5m)
| extend Region = "West US";
union eastWorkspace, westWorkspace
| summarize ConnectedMachines = dcount(Computer) by Region
```

## Layout Tips

**Use groups for collapsible sections.** Add query blocks inside a group, and users can collapse sections they do not need at the moment.

**Set appropriate column widths.** For side-by-side comparison, use 50/50 splits. For a main panel with a sidebar, use 70/30.

**Use tab parameters for large Workbooks.** If your Workbook has too many sections, create a tab parameter and use conditional visibility to show one section at a time.

**Add markdown dividers between sections.** A simple horizontal rule and section header makes the Workbook much more readable.

## Best Practices

**Keep metrics and logs in visual proximity.** Place related metrics and log panels next to each other so correlations are obvious.

**Use consistent time ranges.** All panels should reference the same TimeRange parameter.

**Add context with markdown.** Explain what normal looks like so users can identify anomalies.

**Optimize query performance.** Metrics queries are fast, but Log Analytics queries against large datasets can be slow. Use time filters and limit result sets.

**Test with real incidents.** Load your Workbook during an actual incident or simulate one. Does it show the information you need? If not, iterate.

## Summary

Combining metrics and logs in Azure Workbooks gives you a unified view that no single data source can provide alone. Metrics show you the quantitative health of your resources, logs provide the qualitative context, and activity logs show the human actions that may have triggered changes. By structuring your Workbook with clear parameters, progressive detail, and side-by-side correlation views, you create a powerful tool for both day-to-day monitoring and incident investigation.
