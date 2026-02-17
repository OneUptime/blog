# How to Write KQL (Kusto Query Language) Queries for Log Analysis in Azure Data Explorer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: KQL, Kusto Query Language, Azure Data Explorer, Log Analysis, Query Language, Azure Cloud, Data Analytics

Description: A practical guide to writing KQL queries in Azure Data Explorer for log analysis, covering filtering, aggregation, joins, time-series, and visualization.

---

Kusto Query Language (KQL) is the query language for Azure Data Explorer, Azure Monitor, Azure Sentinel, and several other Microsoft services. If you work with logs, metrics, or time-series data on Azure, learning KQL is one of the most valuable skills you can develop. It is designed for exploring large datasets quickly, with a pipe-forward syntax that reads naturally from left to right.

In this post, we will build up KQL skills progressively - starting with basic filtering and moving through aggregations, time-series analysis, joins, and advanced patterns that are particularly useful for log analysis.

## KQL Basics: The Pipe Model

KQL queries follow a pipe model similar to Unix shell commands. You start with a table, and each operator transforms the data as it flows through:

```kql
// Basic query structure:
// TableName | operator1 | operator2 | operator3

// Read from the AppLogs table, filter for errors, show the first 10
AppLogs
| where Level == "ERROR"
| take 10
```

The `|` (pipe) operator passes the output of one step to the next. The query reads naturally: "take AppLogs, filter where Level is ERROR, take 10 rows."

## Filtering with where

The `where` operator is your primary filter. It supports a rich set of comparison operators:

```kql
// Exact match
AppLogs
| where Service == "auth-service"

// Multiple conditions (AND is implicit)
AppLogs
| where Level == "ERROR"
| where Service == "payment-service"
| where Timestamp > ago(1h)

// Or combine with 'and' / 'or' operators
AppLogs
| where Level == "ERROR" and (Service == "payment-service" or Service == "order-service")

// String operations
AppLogs
| where Message contains "timeout"          // Case-insensitive substring
| where Message has "connection refused"     // Word-level match (faster)
| where Message startswith "Failed to"       // Prefix match
| where Message matches regex @"user-\d{3}" // Regular expression match

// Time-based filtering
AppLogs
| where Timestamp between(datetime(2026-02-16 10:00) .. datetime(2026-02-16 11:00))
| where Timestamp > ago(30m)  // Last 30 minutes
```

## Projection with project

Select and rename columns with `project`:

```kql
// Select specific columns
AppLogs
| where Level == "ERROR"
| project Timestamp, Service, Message, DurationMs

// Rename columns in the output
AppLogs
| project EventTime = Timestamp, ErrorMessage = Message, ServiceName = Service

// Add computed columns
AppLogs
| project
    Timestamp,
    Service,
    Message,
    DurationSeconds = DurationMs / 1000.0,
    IsSlowRequest = DurationMs > 1000
```

## Sorting and Limiting

```kql
// Sort by duration descending and show the top 20 slowest requests
AppLogs
| where Timestamp > ago(1h)
| sort by DurationMs desc
| take 20

// top is a shorthand for sort + take
AppLogs
| where Timestamp > ago(1h)
| top 20 by DurationMs desc
```

## Aggregation with summarize

The `summarize` operator is where KQL really shines for log analysis:

```kql
// Count events by level
AppLogs
| where Timestamp > ago(24h)
| summarize EventCount = count() by Level

// Count errors per service in the last hour
AppLogs
| where Timestamp > ago(1h)
| where Level == "ERROR"
| summarize
    ErrorCount = count(),
    DistinctUsers = dcount(UserId),
    AvgDuration = avg(DurationMs),
    P95Duration = percentile(DurationMs, 95)
    by Service
| sort by ErrorCount desc

// Time-based aggregation with bin()
// Count events per 5-minute interval
AppLogs
| where Timestamp > ago(6h)
| summarize EventCount = count() by bin(Timestamp, 5m), Level
| sort by Timestamp asc
```

## Time-Series Analysis

KQL has powerful built-in functions for time-series data:

```kql
// Create a time series of error counts per service
AppLogs
| where Timestamp > ago(24h)
| where Level == "ERROR"
| make-series ErrorCount = count() on Timestamp from ago(24h) to now() step 1h by Service

// Render as a time chart (works in Azure Data Explorer web UI)
AppLogs
| where Timestamp > ago(24h)
| summarize EventCount = count() by bin(Timestamp, 15m), Level
| render timechart

// Detect anomalies in error rate
let error_series = AppLogs
| where Timestamp > ago(7d)
| where Level == "ERROR"
| make-series ErrorCount = count() on Timestamp from ago(7d) to now() step 1h;
error_series
| extend anomalies = series_decompose_anomalies(ErrorCount)
| mv-expand Timestamp to typeof(datetime), ErrorCount to typeof(long), anomalies to typeof(int)
| where anomalies != 0
| project Timestamp, ErrorCount, AnomalyType = iff(anomalies > 0, "Spike", "Drop")
```

## Joining Data

Join logs from different tables for correlated analysis:

```kql
// Join application logs with request logs to correlate errors with request details
AppLogs
| where Level == "ERROR"
| where Timestamp > ago(1h)
| join kind=inner (
    RequestLogs
    | where Timestamp > ago(1h)
    | project TraceId, Endpoint, StatusCode, ClientIP
) on TraceId
| project Timestamp, Service, Message, Endpoint, StatusCode, ClientIP

// Left outer join to keep all errors even if no matching request
AppLogs
| where Level == "ERROR"
| where Timestamp > ago(1h)
| join kind=leftouter (
    RequestLogs
    | where Timestamp > ago(1h)
) on TraceId
| project Timestamp, Service, Message, Endpoint = coalesce(Endpoint, "Unknown")
```

## Working with Dynamic (JSON) Columns

The `dynamic` column type stores JSON data that you can query directly:

```kql
// Access nested JSON properties
AppLogs
| where Timestamp > ago(1h)
| extend ErrorCode = tostring(Properties.errorCode)
| where isnotempty(ErrorCode)
| summarize Count = count() by ErrorCode
| sort by Count desc

// Extract multiple properties
AppLogs
| extend
    StatusCode = toint(Properties.statusCode),
    RetryCount = toint(Properties.retryCount),
    Region = tostring(Properties.region)
| where StatusCode >= 500
| summarize FailureCount = count() by Region, StatusCode

// Parse JSON strings in the Message column
AppLogs
| where Message startswith "{"
| extend ParsedMessage = parse_json(Message)
| extend ErrorType = tostring(ParsedMessage.error.type)
```

## Common Log Analysis Patterns

### Error Rate Calculation

```kql
// Calculate error rate as a percentage over 5-minute windows
AppLogs
| where Timestamp > ago(6h)
| summarize
    TotalEvents = count(),
    ErrorEvents = countif(Level == "ERROR")
    by bin(Timestamp, 5m)
| extend ErrorRate = round(100.0 * ErrorEvents / TotalEvents, 2)
| project Timestamp, TotalEvents, ErrorEvents, ErrorRate
| render timechart
```

### Slow Request Analysis

```kql
// Find the slowest endpoints with percentile breakdown
AppLogs
| where Timestamp > ago(1h)
| where DurationMs > 0
| summarize
    RequestCount = count(),
    P50 = percentile(DurationMs, 50),
    P90 = percentile(DurationMs, 90),
    P99 = percentile(DurationMs, 99),
    MaxDuration = max(DurationMs)
    by Service
| sort by P99 desc
```

### Session Analysis

```kql
// Find users with the most errors in the last hour
AppLogs
| where Timestamp > ago(1h)
| where Level == "ERROR"
| summarize
    ErrorCount = count(),
    AffectedServices = make_set(Service),
    FirstError = min(Timestamp),
    LastError = max(Timestamp)
    by UserId
| sort by ErrorCount desc
| take 10
```

### Log Pattern Detection

```kql
// Find the most common error message patterns
// Use extract to normalize variable parts of messages
AppLogs
| where Timestamp > ago(24h)
| where Level == "ERROR"
| extend NormalizedMessage = replace_regex(Message, @"\d+", "N")
| extend NormalizedMessage = replace_regex(NormalizedMessage, @"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", "UUID")
| summarize Count = count(), SampleMessage = any(Message) by NormalizedMessage
| sort by Count desc
| take 20
```

## Saved Functions

Save frequently used queries as functions for reuse:

```kql
// Create a reusable function for error analysis
.create-or-alter function ErrorsByService(lookback: timespan) {
    AppLogs
    | where Timestamp > ago(lookback)
    | where Level == "ERROR"
    | summarize
        ErrorCount = count(),
        UniqueErrors = dcount(Message),
        AffectedUsers = dcount(UserId)
        by Service
    | sort by ErrorCount desc
}

// Use the function
ErrorsByService(1h)

// Create a function with multiple parameters
.create-or-alter function ServiceHealth(serviceName: string, lookback: timespan) {
    AppLogs
    | where Timestamp > ago(lookback)
    | where Service == serviceName
    | summarize
        TotalRequests = count(),
        Errors = countif(Level == "ERROR"),
        Warnings = countif(Level == "WARN"),
        AvgDuration = avg(DurationMs),
        P99Duration = percentile(DurationMs, 99)
        by bin(Timestamp, 5m)
    | extend ErrorRate = round(100.0 * Errors / TotalRequests, 2)
}

// Use the parameterized function
ServiceHealth("payment-service", 6h)
| render timechart
```

## Visualization with render

KQL supports built-in visualization in the Data Explorer web UI:

```kql
// Line chart of event volume over time
AppLogs
| where Timestamp > ago(24h)
| summarize Count = count() by bin(Timestamp, 15m), Level
| render timechart

// Bar chart of errors by service
AppLogs
| where Level == "ERROR"
| summarize Count = count() by Service
| render barchart

// Pie chart of traffic distribution
AppLogs
| summarize Count = count() by Service
| render piechart

// Scatter plot of duration vs timestamp (spot outliers)
AppLogs
| where Timestamp > ago(1h)
| where DurationMs > 0
| project Timestamp, DurationMs, Service
| render scatterchart
```

## Summary

KQL is a powerful and readable query language for log analysis. Its pipe-forward syntax makes it easy to build complex queries step by step - start with the table, filter with `where`, shape with `project`, aggregate with `summarize`, and visualize with `render`. For time-series data, the `make-series` and `series_decompose_anomalies` functions provide built-in anomaly detection. Save your frequently used patterns as functions, and use the `dynamic` column type to query semi-structured JSON data without pre-defining rigid schemas. Once you get comfortable with KQL, you will find it is one of the fastest ways to explore and analyze operational data at scale.
