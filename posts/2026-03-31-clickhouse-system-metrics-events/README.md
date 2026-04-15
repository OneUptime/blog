# How to Use system.metrics and system.events in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Metric, Monitoring, Observability, System Table

Description: Learn how to use system.metrics for live gauge values and system.events for cumulative counters to monitor ClickHouse server health and workload in real time.

---

ClickHouse exposes two complementary metric tables. `system.metrics` contains instantaneous gauge values - things that have a current level like the number of active connections or the memory currently in use. `system.events` contains monotonically increasing counters that accumulate since the last server start, such as total queries executed or total bytes written to disk. Together they give you a complete picture of server health without any external agent.

## system.metrics - Live Gauges

```sql
SELECT metric, value, description
FROM system.metrics
ORDER BY metric
LIMIT 20;
```

Each row has three columns:

| Column | Type | Meaning |
|---|---|---|
| `metric` | String | Metric name |
| `value` | Int64 | Current value |
| `description` | String | Human-readable explanation |

### Most Useful Metrics

```sql
SELECT metric, value, description
FROM system.metrics
WHERE metric IN (
    'Query',
    'Merge',
    'MemoryTracking',
    'MemoryTrackingInBackgroundProcessingPool',
    'BackgroundPoolTask',
    'BackgroundMovePoolTask',
    'DelayedInserts',
    'RWLockWaitingReaders',
    'RWLockWaitingWriters',
    'OpenFileForRead',
    'OpenFileForWrite',
    'TCPConnection',
    'HTTPConnection',
    'InterserverConnection',
    'ReplicatedChecks',
    'ReplicatedFetch',
    'ReplicatedSend'
)
ORDER BY metric;
```

### Active Query and Merge Count

```sql
SELECT
    (SELECT value FROM system.metrics WHERE metric = 'Query')  AS active_queries,
    (SELECT value FROM system.metrics WHERE metric = 'Merge')  AS active_merges;
```

### Memory Usage

```sql
SELECT
    metric,
    formatReadableSize(value) AS current_usage
FROM system.metrics
WHERE metric LIKE '%Memory%'
ORDER BY value DESC;
```

### Delayed Inserts Warning

```sql
SELECT value AS delayed_inserts
FROM system.metrics
WHERE metric = 'DelayedInserts';
```

A `DelayedInserts` value above zero means ClickHouse is throttling write threads because parts are accumulating faster than they can be merged. This is an early warning for merge backlog.

## system.events - Cumulative Counters

```sql
SELECT event, value, description
FROM system.events
ORDER BY event
LIMIT 20;
```

Each row:

| Column | Type | Meaning |
|---|---|---|
| `event` | String | Counter name |
| `value` | UInt64 | Total count since server start |
| `description` | String | Human-readable explanation |

### Most Useful Events

```sql
SELECT event, value
FROM system.events
WHERE event IN (
    'Query',
    'SelectQuery',
    'InsertQuery',
    'FailedQuery',
    'FailedSelectQuery',
    'FailedInsertQuery',
    'QueryTimeMicroseconds',
    'SelectQueryTimeMicroseconds',
    'InsertQueryTimeMicroseconds',
    'MergedRows',
    'MergedUncompressedBytes',
    'ReadCompressedBytes',
    'WriteBufferFromFileDescriptorWriteBytes',
    'NetworkReceiveBytes',
    'NetworkSendBytes',
    'DiskReadElapsedMicroseconds',
    'DiskWriteElapsedMicroseconds',
    'ZooKeeperTransactions',
    'ReplicatedPartFetches',
    'ReplicatedPartMerges'
)
ORDER BY event;
```

### Compute Query Rates (Two Snapshots)

Because `system.events` values are cumulative, rates require two readings:

```bash
#!/usr/bin/env bash
# Measure queries per second over a 10-second window

snap1=$(clickhouse-client --query "
    SELECT value FROM system.events WHERE event = 'Query'
")

sleep 10

snap2=$(clickhouse-client --query "
    SELECT value FROM system.events WHERE event = 'Query'
")

qps=$(( (snap2 - snap1) / 10 ))
echo "Queries per second: ${qps}"
```

### Error Rate Calculation

```sql
SELECT
    (SELECT value FROM system.events WHERE event = 'Query')       AS total_queries,
    (SELECT value FROM system.events WHERE event = 'FailedQuery') AS failed_queries,
    round(
        (SELECT value FROM system.events WHERE event = 'FailedQuery') * 100.0
        / nullIf((SELECT value FROM system.events WHERE event = 'Query'), 0),
        4
    ) AS error_pct;
```

### Average Query Duration from Cumulative Counters

```sql
SELECT
    round(
        (SELECT value FROM system.events WHERE event = 'QueryTimeMicroseconds') /
        nullIf((SELECT value FROM system.events WHERE event = 'Query'), 0) / 1000,
        2
    ) AS avg_query_ms;
```

## Combining Both Tables

```sql
SELECT 'active_queries'   AS name,
       toInt64(value)     AS val
FROM system.metrics WHERE metric = 'Query'
UNION ALL
SELECT 'total_queries_since_start',
       toInt64(value)
FROM system.events WHERE event = 'Query'
UNION ALL
SELECT 'failed_queries_since_start',
       toInt64(value)
FROM system.events WHERE event = 'FailedQuery'
UNION ALL
SELECT 'memory_bytes',
       value
FROM system.metrics WHERE metric = 'MemoryTracking';
```

## Scrape Metrics with Prometheus

ClickHouse exposes Prometheus-compatible metrics on the HTTP port. Enable the endpoint in `config.xml`:

```xml
<prometheus>
    <endpoint>/metrics</endpoint>
    <port>9363</port>
    <metrics>true</metrics>
    <events>true</events>
    <asynchronous_metrics>true</asynchronous_metrics>
</prometheus>
```

Then scrape with:

```bash
curl -s http://localhost:9363/metrics | grep -E "^ClickHouse(Metrics|ProfileEvents)_Query"
```

Example output:

```text
ClickHouseMetrics_Query 3
ClickHouseProfileEvents_Query 18245
ClickHouseProfileEvents_FailedQuery 12
ClickHouseProfileEvents_SelectQuery 17890
```

Add a Prometheus scrape config:

```text
scrape_configs:
  - job_name: clickhouse
    static_configs:
      - targets: ['clickhouse-host:9363']
    metrics_path: /metrics
    scrape_interval: 15s
```

## system.asynchronous_metrics for Background Values

There is a third metrics table for values that are expensive to compute synchronously:

```sql
SELECT metric, value, description
FROM system.asynchronous_metrics
WHERE metric IN (
    'UncompressedCacheBytes',
    'UncompressedCacheCells',
    'MarkCacheBytes',
    'MarkCacheFiles',
    'jemalloc.allocated',
    'jemalloc.resident',
    'ReplicasMaxAbsoluteDelay',
    'ReplicasMaxRelativeDelay',
    'NumberOfDatabases',
    'NumberOfTables',
    'TotalBytesOfMergeTreeTables',
    'TotalRowsOfMergeTreeTables'
)
ORDER BY metric;
```

`asynchronous_metrics` is refreshed every minute by default. It contains replication lag, jemalloc allocator stats, and aggregate storage sizes.

## Common Pitfalls

- `system.events` counters reset on server restart. Use `system.query_log` or an external time series database to preserve historical data across restarts.
- `system.metrics` values snapshot an instant in time. High-frequency polling (< 1 second) does not meaningfully improve accuracy and generates query overhead.
- Some metrics appear in all three tables (`metrics`, `events`, `asynchronous_metrics`) with different semantics. Read the `description` column to understand what each one measures.

## Summary

Use `system.metrics` for live health checks (is the server under load right now?) and `system.events` for trend analysis (how many queries have run since startup?). Expose them via the Prometheus endpoint to feed dashboards, or query them directly in shell scripts for lightweight monitoring without external dependencies.
