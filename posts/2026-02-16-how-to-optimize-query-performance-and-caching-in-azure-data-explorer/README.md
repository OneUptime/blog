# How to Optimize Query Performance and Caching in Azure Data Explorer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Data Explorer, Query Optimization, Caching, KQL, Performance Tuning, Kusto, Data Analytics

Description: Learn practical techniques to optimize KQL query performance and configure caching policies in Azure Data Explorer for faster analytical queries.

---

Azure Data Explorer can scan billions of rows in seconds, but that does not mean every query will be fast by default. Poorly written queries, missing indexes, suboptimal table designs, and incorrect caching policies can turn a sub-second query into one that takes minutes. The good news is that ADX provides excellent diagnostics and a set of straightforward optimization techniques that can dramatically improve performance.

In this post, we will cover the most impactful query optimization techniques, caching and retention configuration, table partitioning, materialized views, and diagnostic tools for identifying slow queries.

## Understanding ADX Storage Architecture

To optimize queries, it helps to understand how ADX stores data:

- Data is stored in **extents** (also called data shards), which are columnar storage units
- Each extent contains data for all columns, compressed and indexed
- Extents have **metadata** including min/max values for each column, which enables extent pruning
- **Hot cache** keeps data on local SSD for fast access
- **Cold storage** keeps data in Azure Blob Storage (slower to query)

Query performance depends on two main factors: how much data the query needs to scan and how quickly it can read that data.

## Caching Policy Configuration

The caching policy determines how much data is kept in hot cache (SSD). Data in hot cache is orders of magnitude faster to query than cold data.

```kql
// Check current caching policy
.show table AppLogs policy caching

// Set hot cache to 14 days
// Data from the last 14 days stays on local SSD
.alter table AppLogs policy caching hot = 14d

// Set different cache durations for different tables
// Frequently queried real-time tables get more cache
.alter table LiveTelemetry policy caching hot = 30d
.alter table HistoricalReports policy caching hot = 7d
.alter table AuditLogs policy caching hot = 3d

// Set cache at the database level (applies to all tables without explicit overrides)
.alter database mydb policy caching hot = 14d
```

### How to Size Your Cache

The right cache size depends on your query patterns:

```kql
// Check the size of data by age to determine cache needs
AppLogs
| summarize
    EventCount = count(),
    DataSizeBytes = sum(estimate_data_size(*))
    by bin(Timestamp, 1d)
| sort by Timestamp desc
| extend CumulativeSize = row_cumsum(DataSizeBytes)
| extend CumulativeSizeGB = round(CumulativeSize / 1073741824.0, 2)
```

If 95% of your queries look at the last 7 days and that data is 500GB, make sure your cluster has at least 500GB of SSD cache across all nodes and set the hot cache to 7 days.

## Query Optimization Techniques

### 1. Filter Early, Filter Aggressively

The single most impactful optimization is reducing the amount of data scanned. Always put `where` clauses as early as possible:

```kql
// Bad: scan all data, then filter
AppLogs
| extend Hour = hourofday(Timestamp)
| where Hour between(9 .. 17)
| where Service == "api-gateway"
| where Timestamp > ago(24h)

// Good: time filter first, then other filters
// The time filter enables extent pruning (skipping entire extents)
AppLogs
| where Timestamp > ago(24h)
| where Service == "api-gateway"
| extend Hour = hourofday(Timestamp)
| where Hour between(9 .. 17)
```

Time-based filters are especially important because ADX orders extents by ingestion time, so a time filter can skip entire extents without reading them.

### 2. Use has Instead of contains for String Matching

```kql
// Slow: contains scans every character in the string
AppLogs
| where Message contains "connection timeout"

// Faster: has uses the term index for word-level matching
AppLogs
| where Message has "connection" and Message has "timeout"

// Even faster if you know the exact term
AppLogs
| where Message has_cs "ConnectionTimeout"  // Case-sensitive term match
```

The `has` operator leverages ADX's term index, which is built automatically for string columns. The `contains` operator requires a full substring scan.

### 3. Avoid Unnecessary Columns

Only reference the columns you need. ADX uses columnar storage, so reading fewer columns means less I/O:

```kql
// Bad: selecting all columns when you only need a few
AppLogs
| where Timestamp > ago(1h)
| where Level == "ERROR"
| take 100

// Good: project only what you need
AppLogs
| where Timestamp > ago(1h)
| where Level == "ERROR"
| project Timestamp, Service, Message
| take 100
```

### 4. Use summarize Efficiently

```kql
// Bad: dcount is expensive - avoid it on high-cardinality columns unnecessarily
AppLogs
| where Timestamp > ago(24h)
| summarize
    Count = count(),
    UniqueTraces = dcount(TraceId),     // Expensive
    UniqueMessages = dcount(Message)     // Very expensive on large strings
    by Service

// Better: only compute expensive aggregations when needed
// Use hll for approximate distinct counts if exact is not required
AppLogs
| where Timestamp > ago(24h)
| summarize
    Count = count(),
    UniqueTraces = dcount(TraceId)
    by Service
```

### 5. Limit join Sizes

Joins are the most expensive operation. Keep both sides as small as possible:

```kql
// Bad: joining two large datasets
AppLogs
| join RequestLogs on TraceId

// Good: filter both sides before joining
AppLogs
| where Timestamp > ago(1h)
| where Level == "ERROR"
| project TraceId, Service, Message
| join kind=inner (
    RequestLogs
    | where Timestamp > ago(1h)
    | project TraceId, Endpoint, StatusCode
) on TraceId
```

## Materialized Views

For queries that run frequently with the same aggregation pattern, materialized views pre-compute the results:

```kql
// Create a materialized view that maintains hourly error counts
// ADX automatically keeps this view updated as new data arrives
.create materialized-view HourlyServiceErrors on table AppLogs {
    AppLogs
    | summarize
        ErrorCount = countif(Level == "ERROR"),
        WarnCount = countif(Level == "WARN"),
        TotalCount = count()
        by bin(Timestamp, 1h), Service
}

// Query the materialized view instead of the raw table
// This is much faster because the aggregation is pre-computed
HourlyServiceErrors
| where Timestamp > ago(7d)
| where ErrorCount > 0
| project Timestamp, Service, ErrorCount, ErrorRate = round(100.0 * ErrorCount / TotalCount, 2)
```

Materialized views are especially valuable for dashboard queries that run every few seconds with the same aggregation pattern.

### Checking Materialized View Health

```kql
// Check the lag of materialized views
.show materialized-view HourlyServiceErrors extents
| summarize MaxIngestionTime = max(MaxCreatedOn)
| extend Lag = now() - MaxIngestionTime

// Show materialized view statistics
.show materialized-view HourlyServiceErrors statistics
```

## Table Partitioning

For very large tables, partitioning can improve query performance by enabling data to be physically organized by a query-relevant column:

```kql
// Create a partition policy on the Service column
// This physically groups data by service, making service-filtered queries faster
.alter table AppLogs policy partitioning @'{'
'  "partitionBy": ['
'    {'
'      "column": "Service",'
'      "kind": "Hash",'
'      "properties": {'
'        "function": "XxHash64",'
'        "maxPartitionCount": 64,'
'        "seed": 1'
'      }'
'    }'
'  ],'
'  "effectiveDateTime": "2026-02-16"'
'}'
```

Partitioning is most beneficial when:
- You frequently filter by a specific column (like Service or Region)
- The table is very large (billions of rows)
- The column has moderate cardinality (tens to hundreds of values)

## Query Diagnostics

### Using the Query Diagnostic Log

ADX captures detailed statistics for every query. Use them to identify slow queries:

```kql
// Find the slowest queries in the last 24 hours
.show queries
| where StartedOn > ago(24h)
| where State == "Completed"
| where Duration > 10s
| project StartedOn, Duration, User, Text, TotalCPU, MemoryPeak
| sort by Duration desc
| take 20
```

### Explain and Profile

Use `explain` to see the query plan without executing the query:

```kql
// Show the execution plan
AppLogs
| where Timestamp > ago(1h)
| where Service == "api-gateway"
| summarize count() by Level
| explain
```

### Extent Statistics

Check how many extents a query needs to scan:

```kql
// See extent statistics for a table
.show table AppLogs extents
| summarize
    ExtentCount = count(),
    TotalRows = sum(RowCount),
    TotalSizeGB = round(sum(CompressedSize) / 1073741824.0, 2),
    MinCreated = min(MinCreatedOn),
    MaxCreated = max(MaxCreatedOn)
```

## Retention Policy

Configure data retention to automatically remove old data and free up resources:

```kql
// Set retention to 90 days
.alter table AppLogs policy retention
@'{"SoftDeletePeriod": "90.00:00:00", "Recoverability": "Enabled"}'

// Soft delete period: data is deleted after this period
// Recoverability: if Enabled, deleted data can be recovered for a short period

// For tables with shorter retention needs
.alter table LiveTelemetry policy retention
@'{"SoftDeletePeriod": "30.00:00:00", "Recoverability": "Disabled"}'
```

## Extent Merge Policy

ADX continuously merges small extents into larger ones for better query performance. You can tune the merge behavior:

```kql
// Check current merge policy
.show table AppLogs policy merge

// Configure merge policy for a table with streaming ingestion
// Streaming ingestion creates many small extents that need aggressive merging
.alter table LiveTelemetry policy merge
@'{"MaxExtentsToMerge": 50, "LoopPeriod": "00:05:00"}'
```

## Best Practices Summary

Here is a checklist for optimal ADX query performance:

1. **Time filter first**: Always filter by time before other columns
2. **Use `has` over `contains`**: Leverage the term index for string matching
3. **Project early**: Select only the columns you need
4. **Limit join sizes**: Filter both sides of joins before joining
5. **Size your cache**: Ensure hot cache covers your most-queried time range
6. **Use materialized views**: Pre-compute frequently used aggregations
7. **Monitor slow queries**: Regularly check the query log for performance regressions
8. **Partition large tables**: Use hash partitioning on frequently filtered columns
9. **Tune merge policy**: Especially for tables with streaming ingestion
10. **Set appropriate retention**: Remove old data to keep the dataset manageable

## Summary

Azure Data Explorer performance optimization is about reducing the amount of data scanned and ensuring that data is read from fast storage. The caching policy is your primary lever for read performance - make sure your hot cache covers the time range your queries typically access. Write efficient KQL by filtering early, using indexed operators like `has`, and keeping joins small. For dashboards and recurring queries, materialized views eliminate redundant computation. Use the built-in diagnostic tools to identify slow queries and data skew, and address them before they become production problems.
