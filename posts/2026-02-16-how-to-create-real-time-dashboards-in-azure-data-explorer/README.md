# How to Create Real-Time Dashboards in Azure Data Explorer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Data Explorer, Dashboards, Real-Time Analytics, KQL, Data Visualization, Monitoring, Azure Cloud

Description: Learn how to build real-time operational dashboards in Azure Data Explorer using KQL queries with auto-refresh and interactive filtering.

---

Azure Data Explorer is not just a query engine - it includes a built-in dashboard feature that lets you create interactive, auto-refreshing dashboards directly from your KQL queries. Unlike external BI tools that require connectors and data import, ADX dashboards query your data in place, giving you real-time visibility into your operational data without any data movement or duplication.

In this post, we will build a practical operational dashboard for monitoring application health, covering dashboard creation, tile configuration, parameters for interactive filtering, and auto-refresh for live monitoring.

## Why ADX Dashboards?

You might wonder why you would use ADX dashboards instead of Power BI or Grafana. The answer comes down to the use case:

- **ADX Dashboards**: Best for operational dashboards where data freshness matters, queries need to run against live data, and the audience is technical. Zero additional infrastructure.
- **Power BI**: Best for business reporting with polished visuals, scheduled data refresh, and distribution to a broad audience.
- **Grafana**: Best when you need a unified monitoring view across multiple data sources (ADX, Prometheus, Elasticsearch, etc.).

ADX dashboards are particularly good for on-call engineers who need to investigate issues by drilling down from a high-level view to detailed logs.

## Creating Your First Dashboard

### Step 1: Access the Dashboard Feature

1. Open the Azure Data Explorer web UI at `https://dataexplorer.azure.com`
2. Click "Dashboards" in the left navigation
3. Click "New dashboard"
4. Give it a name: "Application Health Dashboard"

### Step 2: Add Your First Tile

Click "Add tile" and you will see a query editor. Enter a KQL query for your first visualization:

```kql
// Error rate over time - a fundamental health metric
AppLogs
| where Timestamp > ago(6h)
| summarize
    TotalRequests = count(),
    Errors = countif(Level == "ERROR")
    by bin(Timestamp, 5m)
| extend ErrorRate = round(100.0 * Errors / TotalRequests, 2)
| project Timestamp, ErrorRate
```

After running the query, configure the tile:

1. Click "Add visual"
2. Choose "Line chart" as the visualization type
3. Set the X axis to `Timestamp`
4. Set the Y axis to `ErrorRate`
5. Give the tile a title: "Error Rate (%)"
6. Click "Apply changes"

### Step 3: Add More Tiles

Build out the dashboard with multiple tiles that give a complete picture of application health.

#### Service Status Summary

```kql
// Current status of each service based on recent error rate
AppLogs
| where Timestamp > ago(15m)
| summarize
    TotalEvents = count(),
    Errors = countif(Level == "ERROR"),
    Warnings = countif(Level == "WARN")
    by Service
| extend
    ErrorRate = round(100.0 * Errors / TotalEvents, 1),
    Status = case(
        100.0 * Errors / TotalEvents > 5, "Critical",
        100.0 * Errors / TotalEvents > 1, "Warning",
        "Healthy"
    )
| project Service, Status, ErrorRate, TotalEvents, Errors, Warnings
| sort by ErrorRate desc
```

Configure this as a **Table** visualization to show a status overview.

#### Request Volume by Service

```kql
// Request volume trend per service
AppLogs
| where Timestamp > ago(6h)
| summarize RequestCount = count() by bin(Timestamp, 5m), Service
| render timechart
```

Configure as a **Stacked area chart** with the X axis as Timestamp, Y axis as RequestCount, and Series as Service.

#### Top Errors

```kql
// Most frequent error messages in the last hour
AppLogs
| where Timestamp > ago(1h)
| where Level == "ERROR"
| summarize
    OccurrenceCount = count(),
    AffectedUsers = dcount(UserId),
    LastSeen = max(Timestamp)
    by Service, Message
| sort by OccurrenceCount desc
| take 15
```

Configure as a **Table** visualization.

#### Latency Percentiles

```kql
// P50, P90, P99 latency per service
AppLogs
| where Timestamp > ago(6h)
| where DurationMs > 0
| summarize
    P50 = percentile(DurationMs, 50),
    P90 = percentile(DurationMs, 90),
    P99 = percentile(DurationMs, 99)
    by bin(Timestamp, 5m), Service
```

Configure as a **Multi-line chart** with separate lines for each percentile.

## Adding Parameters for Interactive Filtering

Parameters make your dashboard interactive. Users can filter all tiles by selecting values from dropdowns.

### Time Range Parameter

1. Click the "Parameters" icon in the dashboard toolbar
2. Click "Add parameter"
3. Configure:
   - **Name**: TimeRange
   - **Type**: Time range
   - **Default value**: Last 6 hours
   - **Available values**: Last 1 hour, Last 6 hours, Last 24 hours, Last 7 days

Then update your queries to use the parameter:

```kql
// Use the TimeRange parameter in queries
AppLogs
| where Timestamp >= _startTime and Timestamp <= _endTime
| summarize
    TotalRequests = count(),
    Errors = countif(Level == "ERROR")
    by bin(Timestamp, 5m)
| extend ErrorRate = round(100.0 * Errors / TotalRequests, 2)
| project Timestamp, ErrorRate
```

The `_startTime` and `_endTime` variables are automatically populated from the time range parameter.

### Service Filter Parameter

Create a dropdown that lets users filter by service:

1. Add a new parameter
2. Configure:
   - **Name**: ServiceFilter
   - **Type**: Single selection / Multi selection
   - **Source**: Query
   - **Query**: `AppLogs | distinct Service | sort by Service asc`

Update queries to use the service filter:

```kql
// Filter by selected service(s)
AppLogs
| where Timestamp >= _startTime and Timestamp <= _endTime
| where Service in (_ServiceFilter) or isempty(_ServiceFilter)
| summarize
    TotalRequests = count(),
    Errors = countif(Level == "ERROR")
    by bin(Timestamp, 5m)
| extend ErrorRate = round(100.0 * Errors / TotalRequests, 2)
```

### Log Level Parameter

```kql
// Parameter source query for log levels
AppLogs
| distinct Level
| sort by Level asc
```

## Auto-Refresh Configuration

For real-time monitoring, enable auto-refresh:

1. Click the refresh icon in the dashboard toolbar
2. Select an auto-refresh interval:
   - **30 seconds**: For active incident investigation
   - **1 minute**: For operational monitoring
   - **5 minutes**: For general oversight

The auto-refresh re-executes all tile queries at the specified interval, keeping the dashboard current.

## Dashboard Layout and Organization

### Tile Sizing

ADX dashboards use a grid layout. Each tile can be resized and positioned:

- **Full-width tiles**: Use for time-series charts that benefit from horizontal space
- **Half-width tiles**: Use for summary tables and KPI cards
- **Quarter-width tiles**: Use for single-value metrics (counts, rates)

### Organizing with Pages

For complex dashboards, use multiple pages:

- **Page 1: Overview** - High-level health metrics, error rates, service status
- **Page 2: Latency** - Detailed latency analysis by service and endpoint
- **Page 3: Errors** - Error drill-down, top errors, error trends
- **Page 4: Users** - User-level impact analysis

Create pages by clicking the "+" icon next to page tabs in the dashboard editor.

## KPI Cards

Create single-value tiles for key metrics that stand out visually:

```kql
// Current error rate (single value for KPI card)
AppLogs
| where Timestamp > ago(15m)
| summarize
    Total = count(),
    Errors = countif(Level == "ERROR")
| extend ErrorRate = round(100.0 * Errors / Total, 2)
| project ErrorRate
```

Configure as a **Stat** visualization to display a large, prominent number.

```kql
// Active users in the last 15 minutes
AppLogs
| where Timestamp > ago(15m)
| summarize ActiveUsers = dcount(UserId)
| project ActiveUsers
```

```kql
// Average response time in the last 15 minutes
AppLogs
| where Timestamp > ago(15m)
| where DurationMs > 0
| summarize AvgLatency = round(avg(DurationMs), 1)
| project AvgLatency
```

## Conditional Formatting

Use KQL to add color-coding to your table tiles:

```kql
// Service health table with status indicators
AppLogs
| where Timestamp > ago(15m)
| summarize
    Total = count(),
    Errors = countif(Level == "ERROR")
    by Service
| extend
    ErrorRate = round(100.0 * Errors / Total, 1),
    // Color indicator based on error rate thresholds
    StatusIcon = case(
        100.0 * Errors / Total > 5, "CRITICAL",
        100.0 * Errors / Total > 1, "WARNING",
        "OK"
    )
| project Service, StatusIcon, ErrorRate, Total, Errors
| sort by ErrorRate desc
```

## Sharing and Permissions

ADX dashboards support sharing with team members:

1. Click "Share" in the dashboard toolbar
2. Choose sharing options:
   - **View**: Users can view the dashboard but not edit
   - **Edit**: Users can modify tiles and parameters
3. Enter email addresses or Azure AD groups

For organization-wide access, publish the dashboard and share the URL.

## Programmatic Dashboard Management

You can export and import dashboard definitions as JSON for version control:

```bash
# Export a dashboard definition
# Use the ADX API to retrieve the dashboard JSON
curl -H "Authorization: Bearer $TOKEN" \
  "https://dataexplorer.azure.com/api/dashboards/{dashboard-id}" \
  -o dashboard-definition.json

# Import a dashboard definition
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @dashboard-definition.json \
  "https://dataexplorer.azure.com/api/dashboards"
```

Store dashboard definitions in Git for version control and reproducible deployments.

## Performance Tips

**Use appropriate time bins**: For dashboards showing 24 hours, use 5-minute bins. For 7 days, use 1-hour bins. Over-granular binning slows queries without adding visual value.

**Limit result sets**: Use `take` or `top` to limit table tiles to a reasonable number of rows. Rendering thousands of rows in a table is slow and not useful.

**Use materialized views**: For dashboards that query the same aggregations repeatedly, create materialized views to pre-compute results:

```kql
// Create a materialized view for hourly error summaries
.create materialized-view HourlyErrorSummary on table AppLogs {
    AppLogs
    | summarize
        TotalEvents = count(),
        ErrorCount = countif(Level == "ERROR"),
        UniqueUsers = dcount(UserId)
        by bin(Timestamp, 1h), Service
}
```

**Cache results**: ADX automatically caches recent query results. Dashboards with short auto-refresh intervals benefit from this caching.

## Summary

Azure Data Explorer dashboards provide a fast, integrated way to build real-time operational dashboards on top of your ADX data. The combination of KQL queries, interactive parameters, auto-refresh, and built-in visualizations means you can go from raw data to a live monitoring dashboard without leaving the ADX ecosystem. Use parameters for interactive filtering, organize complex dashboards into pages, and leverage materialized views for frequently queried aggregations. For on-call engineers and operations teams, ADX dashboards are one of the quickest paths to real-time visibility into application health.
