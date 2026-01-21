# How to Use LogQL Metric Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, LogQL, Metrics, Aggregations, Rate, Count Over Time, Observability

Description: A comprehensive guide to LogQL metric queries in Grafana Loki, covering rate, count_over_time, sum, avg, quantile, and aggregation functions for log-based metrics.

---

LogQL metric queries transform log data into numeric time series, enabling you to create dashboards, alerts, and visualizations from your logs. This powerful feature bridges the gap between logs and metrics in your observability stack. This guide covers all metric query functions and aggregation patterns.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki instance with indexed logs
- Grafana connected to Loki as a data source
- Understanding of basic LogQL queries
- Familiarity with time series concepts

## Understanding Metric Queries

LogQL metric queries have two types:

1. **Log Range Aggregations**: Aggregate over a range of logs
2. **Unwrapped Range Aggregations**: Aggregate extracted numeric values

## Log Range Aggregations

### count_over_time

Count log entries over a time range:

```logql
# Count all logs in 5-minute windows
count_over_time({namespace="production"}[5m])

# Count errors
count_over_time({namespace="production"} |= "error" [5m])

# Count by parsed field
count_over_time({namespace="production"} | json | level="error" [5m])
```

### rate

Calculate per-second rate of log entries:

```logql
# Logs per second
rate({namespace="production"}[5m])

# Error rate per second
rate({namespace="production"} |= "error" [5m])

# Request rate
rate({namespace="production", app="api"} | json | path="/api/v1/users" [5m])
```

### bytes_over_time

Sum of bytes in log lines:

```logql
# Total bytes in 5 minutes
bytes_over_time({namespace="production"}[5m])

# Bytes for specific app
bytes_over_time({namespace="production", app="api"}[5m])
```

### bytes_rate

Per-second byte rate:

```logql
# Bytes per second
bytes_rate({namespace="production"}[5m])

# App bandwidth
bytes_rate({namespace="production", app="api"}[5m])
```

### absent_over_time

Returns 1 if no logs exist in the range:

```logql
# Alert when no logs from service
absent_over_time({namespace="production", app="heartbeat"}[5m])
```

## Unwrapped Range Aggregations

Extract numeric values from logs and aggregate them.

### unwrap

Extract numeric fields for aggregation:

```logql
# Extract duration field
{namespace="production"} | json | unwrap duration
```

### Aggregation Functions with unwrap

#### sum_over_time

```logql
# Total request bytes
sum_over_time({namespace="production"} | json | unwrap request_bytes [5m])

# Total processing time
sum_over_time({namespace="production"} | json | unwrap duration [5m])
```

#### avg_over_time

```logql
# Average response time
avg_over_time({namespace="production"} | json | unwrap response_time [5m])

# Average request size
avg_over_time({namespace="production"} | json | unwrap size_bytes [5m])
```

#### max_over_time

```logql
# Max response time
max_over_time({namespace="production"} | json | unwrap response_time [5m])

# Peak memory usage
max_over_time({namespace="production"} | json | unwrap memory_mb [5m])
```

#### min_over_time

```logql
# Min response time
min_over_time({namespace="production"} | json | unwrap response_time [5m])
```

#### stddev_over_time

```logql
# Standard deviation of response times
stddev_over_time({namespace="production"} | json | unwrap response_time [5m])
```

#### stdvar_over_time

```logql
# Variance of response times
stdvar_over_time({namespace="production"} | json | unwrap response_time [5m])
```

#### quantile_over_time

Calculate percentiles:

```logql
# P50 (median) response time
quantile_over_time(0.5, {namespace="production"} | json | unwrap response_time [5m])

# P95 response time
quantile_over_time(0.95, {namespace="production"} | json | unwrap response_time [5m])

# P99 response time
quantile_over_time(0.99, {namespace="production"} | json | unwrap response_time [5m])
```

#### first_over_time / last_over_time

```logql
# First value in range
first_over_time({namespace="production"} | json | unwrap counter [5m])

# Last value in range
last_over_time({namespace="production"} | json | unwrap counter [5m])
```

## Vector Aggregations

Aggregate across multiple time series.

### sum

```logql
# Total error rate across all apps
sum(rate({namespace="production"} |= "error" [5m]))

# Total by namespace
sum by (namespace) (rate({job="kubernetes-pods"} |= "error" [5m]))
```

### avg

```logql
# Average error rate
avg(rate({namespace="production"} |= "error" [5m]))

# Average by app
avg by (app) (rate({namespace="production"} [5m]))
```

### min / max

```logql
# Max error rate among services
max(rate({namespace="production"} |= "error" [5m]))

# Min by app
min by (app) (rate({namespace="production"} [5m]))
```

### count

```logql
# Number of streams with errors
count(rate({namespace="production"} |= "error" [5m]))
```

### topk / bottomk

```logql
# Top 10 apps by log volume
topk(10, sum by (app) (rate({namespace="production"}[5m])))

# Bottom 5 apps by error rate
bottomk(5, sum by (app) (rate({namespace="production"} |= "error" [5m])))
```

### stddev / stdvar

```logql
# Standard deviation across services
stddev(avg_over_time({namespace="production"} | json | unwrap duration [5m]))
```

## Grouping with by and without

### by clause

Group results by specific labels:

```logql
# Error rate by app
sum by (app) (rate({namespace="production"} |= "error" [5m]))

# By multiple labels
sum by (namespace, app, level) (rate({job="kubernetes-pods"} | json [5m]))
```

### without clause

Exclude specific labels from grouping:

```logql
# Sum without pod label (aggregates across pods)
sum without (pod) (rate({namespace="production"} [5m]))

# Without multiple labels
sum without (pod, container, instance) (rate({namespace="production"} [5m]))
```

## Binary Operations

Perform calculations between metrics.

### Arithmetic

```logql
# Error percentage
sum(rate({namespace="production"} |= "error" [5m]))
/
sum(rate({namespace="production"} [5m]))
* 100

# Bytes to megabytes
bytes_rate({namespace="production"}[5m]) / 1024 / 1024
```

### Comparison

```logql
# Filter series where error rate > 10
sum by (app) (rate({namespace="production"} |= "error" [5m])) > 10

# Keep only high-volume apps
sum by (app) (rate({namespace="production"}[5m])) > 100
```

### Vector Matching

```logql
# Match on specific labels
sum by (app) (rate({namespace="production"} |= "error" [5m]))
/
sum by (app) (rate({namespace="production"} [5m]))

# Ignore labels for matching
sum by (app) (rate({namespace="production"} |= "error" [5m]))
/ ignoring(level)
sum by (app) (rate({namespace="production"} [5m]))

# On specific labels only
sum by (app) (rate({namespace="production"} |= "error" [5m]))
/ on(app)
sum by (app) (rate({namespace="production"} [5m]))
```

## Practical Examples

### Error Rate Dashboard

```logql
# Error rate percentage by service
sum by (app) (rate({namespace="production"} | json | level="error" [5m]))
/
sum by (app) (rate({namespace="production"} [5m]))
* 100

# 5xx error rate
sum(rate({namespace="production"} | json | status_code >= 500 [5m]))
/
sum(rate({namespace="production"} | json [5m]))
* 100
```

### Latency Analysis

```logql
# P50, P95, P99 response times
quantile_over_time(0.5, {namespace="production", app="api"} | json | unwrap duration_ms [5m])
quantile_over_time(0.95, {namespace="production", app="api"} | json | unwrap duration_ms [5m])
quantile_over_time(0.99, {namespace="production", app="api"} | json | unwrap duration_ms [5m])

# Average latency by endpoint
avg by (path) (
  avg_over_time({namespace="production", app="api"} | json | unwrap duration_ms [5m])
)
```

### Request Analysis

```logql
# Requests per second by method
sum by (method) (rate({namespace="production", app="api"} | json [5m]))

# Request volume by endpoint
topk(10, sum by (path) (rate({namespace="production", app="api"} | json [5m])))

# POST vs GET ratio
sum(rate({namespace="production"} | json | method="POST" [5m]))
/
sum(rate({namespace="production"} | json | method="GET" [5m]))
```

### Log Volume Analysis

```logql
# Total log volume by namespace
sum by (namespace) (bytes_rate({job="kubernetes-pods"}[5m]))

# Log volume growth
rate(bytes_over_time({namespace="production"}[1h])[5m:1m])

# Top talkers
topk(10, sum by (app) (bytes_rate({namespace="production"}[5m])))
```

### Alerting Queries

```logql
# High error rate alert
sum(rate({namespace="production"} |= "error" [5m])) > 10

# No logs from critical service
absent_over_time({namespace="production", app="payment-service"}[5m])

# Latency spike
quantile_over_time(0.99, {namespace="production", app="api"} | json | unwrap duration [5m]) > 5

# Error rate exceeds threshold
(
  sum(rate({namespace="production"} |= "error" [5m]))
  /
  sum(rate({namespace="production"} [5m]))
) > 0.05
```

### Service Level Indicators

```logql
# Availability (successful requests / total requests)
1 - (
  sum(rate({namespace="production"} | json | status_code >= 500 [5m]))
  /
  sum(rate({namespace="production"} | json [5m]))
)

# Error budget consumption
sum(rate({namespace="production"} | json | status_code >= 500 [30d]))
/
(sum(rate({namespace="production"} | json [30d])) * 0.001)  # 99.9% SLO
```

### Trend Analysis

```logql
# Compare current vs previous period
sum(rate({namespace="production"} |= "error" [1h]))
/
sum(rate({namespace="production"} |= "error" [1h] offset 1d))

# Week over week comparison
sum(rate({namespace="production"} [1d]))
/
sum(rate({namespace="production"} [1d] offset 7d))
```

## Time Functions

### offset

Query historical data:

```logql
# Error rate 1 hour ago
sum(rate({namespace="production"} |= "error" [5m] offset 1h))

# Compare to yesterday
sum(rate({namespace="production"} [5m]))
-
sum(rate({namespace="production"} [5m] offset 24h))
```

## Handling Missing Data

### or operator

```logql
# Use 0 for missing series
sum by (app) (rate({namespace="production"} |= "error" [5m])) or vector(0)
```

### bool modifier

```logql
# Return 1/0 instead of filtering
sum(rate({namespace="production"} |= "error" [5m])) > bool 10
```

## Grafana Dashboard Panel Queries

### Single Stat

```logql
# Current error rate
sum(rate({namespace="production"} |= "error" [$__rate_interval]))
```

### Time Series Graph

```logql
# Error rate over time by service
sum by (app) (rate({namespace="production"} |= "error" [$__rate_interval]))
```

### Table

```logql
# Top errors by service
topk(10, sum by (app) (count_over_time({namespace="production"} |= "error" [$__range])))
```

### Stat with Percentage

```logql
# Error percentage
sum(rate({namespace="production"} |= "error" [$__rate_interval]))
/
sum(rate({namespace="production"} [$__rate_interval]))
* 100
```

## Conclusion

LogQL metric queries enable powerful analytics on log data. Key takeaways:

- Use `rate()` for per-second calculations
- Use `count_over_time()` for raw counts
- Use `unwrap` to extract numeric fields for aggregation
- Apply percentile analysis with `quantile_over_time()`
- Group results with `sum by ()` and `avg by ()`
- Compare time periods with `offset`
- Build SLIs from log-based metrics

LogQL metric queries transform your logs into actionable insights for monitoring, alerting, and capacity planning.
