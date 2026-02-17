# How to Write KQL Queries to Analyze Performance Metrics in Azure Log Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: KQL, Azure Log Analytics, Performance Metrics, Azure Monitor, Kusto Query Language, Cloud Monitoring

Description: A practical guide to writing KQL queries that help you analyze performance metrics stored in Azure Log Analytics workspaces.

---

Kusto Query Language, or KQL, is the query language you use to pull data out of Azure Log Analytics. If you have been working with Azure Monitor and have performance metrics flowing into a workspace, KQL is how you make sense of it all. It is not SQL, though it borrows some ideas from it. The syntax reads left to right, top to bottom, like a pipeline - and once you get the hang of it, it becomes surprisingly powerful for ad-hoc analysis.

This post walks through practical KQL queries that target performance metrics. We will start with the basics and build up to more advanced patterns like time-series analysis and anomaly detection.

## Where Performance Data Lives

Performance metrics in Log Analytics typically land in a few tables depending on the source:

- **Perf** - Contains performance counters from Windows and Linux agents (CPU, memory, disk, network).
- **InsightsMetrics** - Used by Azure Monitor Agent and VM Insights. This is the newer, preferred table.
- **AzureMetrics** - Contains platform metrics streamed via diagnostic settings.
- **AppPerformanceCounters** - Application-level performance counters from Application Insights.

The table you query depends on how the data was collected. For this guide, we will primarily use `Perf` and `InsightsMetrics` since those are the most common for infrastructure performance analysis.

## Basic Query Structure

Every KQL query starts with a table name, followed by a series of operators separated by pipes. Here is a basic query that pulls CPU metrics from the last hour.

```
// Get average CPU usage per computer over the last hour
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize AvgCPU = avg(CounterValue) by Computer
| order by AvgCPU desc
```

The flow is: start with the `Perf` table, filter by time, filter by the specific counter, aggregate by computer, and sort. Each pipe hands the result set to the next operator.

## Analyzing CPU Performance Over Time

To see how CPU usage trends over time, use the `bin()` function to bucket timestamps into intervals.

```
// CPU usage trend in 5-minute intervals for the past 6 hours
Perf
| where TimeGenerated > ago(6h)
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize AvgCPU = avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| render timechart
```

The `render timechart` at the end tells Log Analytics to display the results as a line chart. This is incredibly useful for spotting patterns like periodic spikes or gradual increases that hint at resource exhaustion.

## Memory Analysis

Memory metrics have different counter names depending on the operating system. On Windows, you look at `Memory` with `% Committed Bytes In Use`. On Linux, it is `Memory` with `% Used Memory`.

```
// Memory usage across all Linux VMs in the past 24 hours
Perf
| where TimeGenerated > ago(24h)
| where ObjectName == "Memory" and CounterName == "% Used Memory"
| summarize AvgMemory = avg(CounterValue), MaxMemory = max(CounterValue) by Computer
| order by MaxMemory desc
```

If you are using the newer `InsightsMetrics` table (from VM Insights), the query looks different because the schema is flattened.

```
// Memory usage from InsightsMetrics for the past 24 hours
InsightsMetrics
| where TimeGenerated > ago(24h)
| where Namespace == "Memory" and Name == "AvailableMB"
| extend TotalMB = toint(parse_json(Tags)["vm.azm.ms/totalMemoryMB"])
| extend UsedPercent = 100.0 - (Val / TotalMB * 100.0)
| summarize AvgUsed = avg(UsedPercent) by bin(TimeGenerated, 15m), Computer
| render timechart
```

## Disk Performance Queries

Disk I/O and free space are critical metrics, especially for database servers. Here is how to check disk latency.

```
// Average disk read and write latency per computer
Perf
| where TimeGenerated > ago(4h)
| where ObjectName == "LogicalDisk" and CounterName in ("Avg. Disk sec/Read", "Avg. Disk sec/Write")
| summarize AvgLatency = avg(CounterValue * 1000) by Computer, CounterName
| order by AvgLatency desc
```

We multiply by 1000 to convert from seconds to milliseconds, which is a more intuitive unit for disk latency. Anything over 20ms consistently is worth investigating.

For free disk space monitoring, use this query.

```
// Current free disk space percentage per drive
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "LogicalDisk" and CounterName == "% Free Space"
| where InstanceName !in ("_Total", "HarddiskVolume1")
| summarize LatestFreeSpace = arg_max(TimeGenerated, CounterValue) by Computer, InstanceName
| project Computer, Drive = InstanceName, FreeSpacePercent = round(CounterValue, 1)
| order by FreeSpacePercent asc
```

The `arg_max` function grabs the most recent value for each combination of computer and drive.

## Network Throughput

Network metrics help you identify bandwidth bottlenecks or unusual traffic patterns.

```
// Network bytes sent and received per computer in 10-minute buckets
Perf
| where TimeGenerated > ago(6h)
| where ObjectName == "Network Adapter" and CounterName in ("Bytes Received/sec", "Bytes Sent/sec")
| summarize AvgBytesPerSec = avg(CounterValue) by bin(TimeGenerated, 10m), Computer, CounterName
| extend MBPerSec = round(AvgBytesPerSec / 1048576, 2)
| project TimeGenerated, Computer, CounterName, MBPerSec
| render timechart
```

## Percentile Analysis

Averages can be misleading. A server might average 40% CPU but spike to 95% every 5 minutes. Percentiles give you a better picture of the distribution.

```
// CPU usage percentiles per computer over the past 24 hours
Perf
| where TimeGenerated > ago(24h)
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize
    P50 = percentile(CounterValue, 50),
    P90 = percentile(CounterValue, 90),
    P95 = percentile(CounterValue, 95),
    P99 = percentile(CounterValue, 99)
    by Computer
| order by P95 desc
```

If P50 is 30% but P99 is 98%, you have a machine that is mostly idle but experiences severe spikes. That is a very different story than a machine with a flat 70% average.

## Detecting Anomalies with series_decompose_anomalies

KQL has built-in time-series functions that can detect anomalies without any external tooling. The `make-series` operator creates a regular time series, and `series_decompose_anomalies` flags data points that deviate from the expected pattern.

```
// Detect CPU anomalies over the past 7 days using 1-hour buckets
let targetComputer = "web-server-01";
Perf
| where TimeGenerated > ago(7d)
| where Computer == targetComputer
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| make-series AvgCPU = avg(CounterValue) on TimeGenerated from ago(7d) to now() step 1h
| extend (anomalies, score, baseline) = series_decompose_anomalies(AvgCPU, 1.5)
| render anomalychart with (anomalycolumns=anomalies)
```

The second parameter to `series_decompose_anomalies` is the sensitivity threshold. Lower values (like 1.0) flag more anomalies; higher values (like 3.0) only flag extreme outliers.

## Joining Performance Data with Other Tables

One of the strengths of Log Analytics is that you can correlate performance data with other signals. For example, you might want to see if high CPU correlates with application errors.

```
// Correlate high CPU events with application errors
let HighCPU = Perf
| where TimeGenerated > ago(24h)
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| where CounterValue > 90
| summarize HighCPUCount = count() by bin(TimeGenerated, 15m), Computer;
let AppErrors = AppExceptions
| where TimeGenerated > ago(24h)
| summarize ErrorCount = count() by bin(TimeGenerated, 15m), Computer = tostring(split(AppRoleName, "/")[0]);
HighCPU
| join kind=inner AppErrors on TimeGenerated, Computer
| project TimeGenerated, Computer, HighCPUCount, ErrorCount
| order by TimeGenerated desc
```

## Creating Alert-Ready Queries

If you plan to turn a query into an alert rule, keep a few things in mind. Alert queries should return a numeric value and ideally run against a short time window to keep evaluation costs low.

```
// Alert-ready query: find any computer where CPU exceeded 90% for at least 80% of the last 30 minutes
Perf
| where TimeGenerated > ago(30m)
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize SamplesAbove90 = countif(CounterValue > 90), TotalSamples = count() by Computer
| extend PercentAbove = (SamplesAbove90 * 100.0) / TotalSamples
| where PercentAbove > 80
```

This is a more robust alert than simply checking if a single data point exceeds a threshold, because it accounts for sustained high usage rather than momentary blips.

## Useful KQL Functions for Performance Analysis

Here are some functions you will use frequently:

- `avg()`, `min()`, `max()`, `sum()` - Standard aggregations.
- `percentile()` - Get specific percentile values.
- `bin()` - Bucket timestamps into regular intervals.
- `ago()` - Relative time offset from now.
- `arg_max()` / `arg_min()` - Get the row with the max or min value of a column.
- `make-series` - Create regular time-series arrays for analysis.
- `series_fit_line` - Fit a linear trend to a time series (useful for capacity planning).
- `round()` - Round numeric values for cleaner output.

## Tips for Writing Efficient Queries

1. **Always filter by time first.** The `where TimeGenerated > ago(...)` clause should appear early in the query to limit the data scanned.
2. **Filter before aggregating.** Narrow down rows with `where` clauses before calling `summarize`.
3. **Avoid `search *`** in production queries. It scans every table and is slow on large workspaces.
4. **Use `project` to select only the columns you need.** This reduces the amount of data the query engine moves around.
5. **Test with short time ranges first**, then expand once you know the query is correct.

## Wrapping Up

KQL is your primary tool for extracting value from performance metrics in Azure Log Analytics. Start with simple aggregations to get a baseline understanding of your environment, then layer in percentile analysis, time-series decomposition, and cross-table joins to build a deeper picture. The queries in this post should give you a solid foundation - customize them for your specific counter names, computer names, and time ranges, and you will be well on your way to proactive performance management.
