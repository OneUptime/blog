# How to Build Interactive Azure Workbooks to Visualize Log Analytics Query Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Workbooks, Log Analytics, Visualization, KQL, Monitoring, Dashboards

Description: Learn how to build interactive Azure Workbooks that visualize Log Analytics query results with charts, grids, and dynamic parameters for effective monitoring.

---

Azure Workbooks are one of the most underrated tools in the Azure monitoring ecosystem. While most people default to Azure dashboards or Grafana for visualization, Workbooks offer a unique combination of interactive parameters, rich visualizations, and deep integration with Log Analytics that makes them perfect for operational dashboards, investigation tools, and compliance reports.

In this post, I will walk you through building interactive Azure Workbooks from scratch, covering the key visualization types and how to connect them to your Log Analytics data.

## What Makes Workbooks Different

Azure Workbooks differ from regular Azure dashboards in several important ways:

**Interactive parameters.** Workbooks support dropdown filters, time range selectors, and text inputs that dynamically filter the data across all visualizations. Dashboards have limited filtering.

**Rich text and narrative.** You can intersperse markdown text between visualizations to explain what the data shows and what actions to take. This makes Workbooks self-documenting.

**Conditional visibility.** You can show or hide sections based on parameter values or query results. For example, show a detailed error analysis section only when errors are detected.

**Step-based execution.** Queries in a Workbook can reference the results of other queries, enabling drill-down scenarios where clicking on a row in one table populates data in another.

## Creating Your First Workbook

### Step 1: Navigate to Workbooks

In the Azure Portal, go to Azure Monitor and then Workbooks. Click "New" to create a blank Workbook.

You can also create Workbooks from within a Log Analytics workspace, which pre-scopes the data source.

### Step 2: Add a Time Range Parameter

Every good monitoring Workbook starts with a time range parameter. Click "Add parameter" and configure:

- **Parameter name:** TimeRange
- **Parameter type:** Time range picker
- **Required:** Yes
- **Default value:** Last 24 hours

This parameter is automatically available as `{TimeRange}` in your queries.

### Step 3: Add Your First Log Analytics Query

Click "Add query" and enter a KQL query that uses the time range parameter:

```kusto
// Count of events by severity level over time
Event
| where TimeGenerated {TimeRange}
| summarize Count = count() by EventLevelName, bin(TimeGenerated, 1h)
| render timechart
```

Configure the visualization settings:
- **Visualization:** Time chart
- **Size:** Full width
- **Chart title:** Event Volume by Severity

The `{TimeRange}` token is automatically replaced with the time range selected in the parameter dropdown.

### Step 4: Add a Grid Visualization

Add another query block with a table view:

```kusto
// Top error sources in the selected time range
Event
| where TimeGenerated {TimeRange}
| where EventLevelName == "Error"
| summarize ErrorCount = count() by Source, EventID
| sort by ErrorCount desc
| take 20
```

Set the visualization to "Grid" and configure column formatting:
- ErrorCount column: Use bar visualization for visual impact
- Source column: Link to a drill-down query (covered later)

### Step 5: Add a Summary Stat

Add a query that provides a high-level summary:

```kusto
// Quick stats
Event
| where TimeGenerated {TimeRange}
| summarize
    TotalEvents = count(),
    Errors = countif(EventLevelName == "Error"),
    Warnings = countif(EventLevelName == "Warning"),
    UniqueComputers = dcount(Computer)
```

Set the visualization to "Tiles" for a clean stat display.

## Working with Different Visualization Types

Workbooks support many visualization types. Here are the most useful ones for Log Analytics data.

### Time Charts

Best for showing trends over time:

```kusto
// Heartbeat trend showing connected machines over time
Heartbeat
| where TimeGenerated {TimeRange}
| summarize ConnectedMachines = dcount(Computer) by bin(TimeGenerated, 15m)
| render timechart
```

### Pie Charts

Best for showing proportional distributions:

```kusto
// Distribution of events by computer
Event
| where TimeGenerated {TimeRange}
| summarize EventCount = count() by Computer
| top 10 by EventCount desc
```

Set visualization to "Pie chart."

### Map Visualizations

If your data includes location information:

```kusto
// Login locations (if you have sign-in logs)
SigninLogs
| where TimeGenerated {TimeRange}
| extend City = tostring(LocationDetails.city)
| extend Latitude = toreal(LocationDetails.geoCoordinates.latitude)
| extend Longitude = toreal(LocationDetails.geoCoordinates.longitude)
| summarize LoginCount = count() by City, Latitude, Longitude
```

Set visualization to "Map."

### Honey Comb

Great for showing status of many items at once:

```kusto
// Server health status
Heartbeat
| where TimeGenerated > ago(30m)
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| extend Status = iff(LastHeartbeat > ago(5m), "Healthy", "Unhealthy")
| project Computer, Status
```

Set visualization to "Graph" with the honey comb layout.

## Building a Drill-Down Experience

One of the most powerful features of Workbooks is the ability to create drill-down interactions where selecting a row in one visualization filters the data in another.

### Step 1: Make a Grid Exportable

In your top-level grid (say, a list of computers), enable "Export selected items as parameters" in the advanced settings:

```kusto
// List of computers with their health status
Heartbeat
| where TimeGenerated {TimeRange}
| summarize
    LastHeartbeat = max(TimeGenerated),
    OSType = any(OSType),
    Version = any(Version)
    by Computer
| extend Status = iff(LastHeartbeat > ago(5m), "Healthy", "Unhealthy")
| project Computer, Status, OSType, Version, LastHeartbeat
| sort by Status asc, Computer asc
```

Configure the grid to export the "Computer" column as a parameter when a row is clicked. Name the exported parameter `SelectedComputer`.

### Step 2: Create a Detail View

Add a new query block that uses the exported parameter:

```kusto
// Detailed events for the selected computer
Event
| where TimeGenerated {TimeRange}
| where Computer == "{SelectedComputer}"
| project TimeGenerated, EventLevelName, Source, EventID, RenderedDescription
| sort by TimeGenerated desc
| take 50
```

This query only shows results after the user clicks a computer in the grid above. You can add conditional visibility so this section is hidden until a computer is selected.

### Step 3: Add Conditional Visibility

In the query block settings, set the "Make this item conditionally visible" option:
- Condition: `SelectedComputer` is not empty

Now the detail section only appears after the user clicks a computer.

## Performance Query Examples

Here are some practical Log Analytics queries designed for Workbook visualizations.

### CPU Usage Heatmap

```kusto
// CPU usage heatmap across servers
Perf
| where TimeGenerated {TimeRange}
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize AvgCPU = avg(CounterValue) by Computer, bin(TimeGenerated, 1h)
| render timechart
```

### Memory Pressure Detection

```kusto
// Servers with low available memory
Perf
| where TimeGenerated {TimeRange}
| where ObjectName == "Memory" and CounterName == "Available MBytes"
| summarize AvgAvailableMB = avg(CounterValue), MinAvailableMB = min(CounterValue) by Computer
| where AvgAvailableMB < 1024
| sort by AvgAvailableMB asc
```

### Disk Space Analysis

```kusto
// Disk space usage by server and drive
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "LogicalDisk" and CounterName == "% Free Space"
| where InstanceName != "_Total" and InstanceName != "HarddiskVolume1"
| summarize FreeSpacePct = avg(CounterValue) by Computer, InstanceName
| where FreeSpacePct < 20
| sort by FreeSpacePct asc
```

## Adding Markdown Content

Between query blocks, add text blocks to provide context:

```markdown
## Server Health Overview

This section shows the health status of all monitored servers. A server is
marked as **Unhealthy** if it has not sent a heartbeat in the last 5 minutes.

Click on a server row to see detailed event information below.

### What to do if a server is unhealthy:
1. Check if the server is powered on and connected to the network
2. Verify the Log Analytics agent is running
3. Check the server's system event log for errors
```

This text renders as formatted markdown in the Workbook, making it a self-contained runbook.

## Saving and Sharing

Once your Workbook is complete:

1. Click "Save" in the toolbar
2. Choose a name and location (resource group)
3. Select "Shared Reports" to make it available to your team

Workbooks saved as shared reports are Azure resources with their own RBAC. You can control who can view and edit them using standard Azure role assignments.

## Using Templates

Azure provides many built-in Workbook templates for common scenarios:

- VM performance
- Network monitoring
- Storage account analytics
- Key Vault operations
- Application Insights analytics

Browse templates in the Workbooks gallery. You can start from a template and customize it for your needs, which is often faster than building from scratch.

## Best Practices

**Start with parameters.** Always add time range and scope parameters at the top so users can filter the data.

**Use consistent time ranges.** Reference the same time range parameter across all queries for consistency.

**Add explanatory text.** Do not assume the reader knows what each chart means. Add brief explanations.

**Test with different time ranges.** Make sure your queries perform well with both short (1 hour) and long (30 day) time ranges.

**Keep query complexity reasonable.** Complex KQL queries can time out in Workbooks. Pre-aggregate data where possible.

**Export as ARM templates for version control.** Workbooks can be exported as JSON and stored in Git.

## Summary

Azure Workbooks provide a powerful way to visualize Log Analytics data with interactive parameters, multiple visualization types, and drill-down capabilities. By combining queries with markdown text and conditional visibility, you can create self-documenting operational dashboards and investigation tools. Start with a time range parameter, add your key queries with appropriate visualizations, build drill-down interactions, and share with your team.
