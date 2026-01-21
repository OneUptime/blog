# How to Monitor ClickHouse Performance with System Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Monitoring, System Tables, Performance, Database, Observability, query_log, Metrics

Description: A comprehensive guide to monitoring ClickHouse using built-in system tables including query_log, parts, metrics, and processes for performance analysis and troubleshooting.

---

ClickHouse exposes detailed telemetry through system tables. You can monitor query performance, storage health, replication status, and resource usage without any external tools. This guide covers the most important system tables and how to use them effectively.

## Essential System Tables

### system.query_log

The most valuable table for performance analysis. Records every query with detailed metrics.

```sql
-- Recent slow queries
SELECT
    query_start_time,
    query_duration_ms,
    read_rows,
    read_bytes,
    result_rows,
    memory_usage,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_duration_ms > 1000
  AND event_date = today()
ORDER BY query_duration_ms DESC
LIMIT 20;
```

Key columns:
- `query_duration_ms`: Total execution time
- `read_rows` / `read_bytes`: Data scanned
- `result_rows` / `result_bytes`: Data returned
- `memory_usage`: Peak memory used
- `ProfileEvents`: Detailed counters

### Query Performance Analysis

```sql
-- Query patterns by normalized query
SELECT
    normalizeQuery(query) AS query_pattern,
    count() AS executions,
    avg(query_duration_ms) AS avg_duration_ms,
    max(query_duration_ms) AS max_duration_ms,
    sum(read_rows) AS total_rows_read,
    sum(read_bytes) AS total_bytes_read
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date >= today() - 7
GROUP BY query_pattern
ORDER BY executions * avg_duration_ms DESC
LIMIT 20;
```

```sql
-- Failed queries
SELECT
    query_start_time,
    exception_code,
    exception,
    query
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
  AND event_date = today()
ORDER BY query_start_time DESC
LIMIT 20;
```

### system.processes

Currently running queries:

```sql
-- Active queries
SELECT
    query_id,
    user,
    elapsed,
    read_rows,
    memory_usage,
    query
FROM system.processes
ORDER BY elapsed DESC;

-- Kill a query
KILL QUERY WHERE query_id = 'abc-123';
```

### system.parts

Storage and partition information:

```sql
-- Parts per table
SELECT
    database,
    table,
    count() AS parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed_size,
    round(sum(data_uncompressed_bytes) / sum(bytes_on_disk), 2) AS compression_ratio
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 20;
```

```sql
-- Large parts (potential merge targets)
SELECT
    database,
    table,
    name,
    rows,
    formatReadableSize(bytes_on_disk) AS size,
    modification_time
FROM system.parts
WHERE active
ORDER BY bytes_on_disk DESC
LIMIT 20;
```

```sql
-- Parts count trend (too many parts = problem)
SELECT
    table,
    count() AS parts
FROM system.parts
WHERE active
GROUP BY table
HAVING parts > 100
ORDER BY parts DESC;
```

### system.metrics

Real-time server metrics:

```sql
-- Key metrics
SELECT
    metric,
    value,
    description
FROM system.metrics
WHERE metric IN (
    'Query',
    'Merge',
    'MemoryTracking',
    'OpenFileForRead',
    'OpenFileForWrite',
    'ReplicatedFetch',
    'ReplicatedSend'
);
```

### system.asynchronous_metrics

Periodically computed metrics:

```sql
-- Memory usage
SELECT
    metric,
    value,
    description
FROM system.asynchronous_metrics
WHERE metric LIKE '%Memory%'
   OR metric LIKE '%Cache%';
```

```sql
-- Uptime and version
SELECT
    metric,
    value
FROM system.asynchronous_metrics
WHERE metric IN ('Uptime', 'VersionInteger');
```

### system.events

Cumulative counters since server start:

```sql
-- Top events
SELECT
    event,
    value,
    description
FROM system.events
ORDER BY value DESC
LIMIT 20;
```

```sql
-- Query-related events
SELECT
    event,
    value
FROM system.events
WHERE event LIKE '%Query%'
   OR event LIKE '%Insert%'
   OR event LIKE '%Select%';
```

## Monitoring Replication

### system.replicas

Replication health for ReplicatedMergeTree tables:

```sql
-- Replication status
SELECT
    database,
    table,
    replica_name,
    is_leader,
    is_readonly,
    absolute_delay,
    queue_size,
    inserts_in_queue,
    merges_in_queue
FROM system.replicas;
```

```sql
-- Alert on replication lag
SELECT *
FROM system.replicas
WHERE absolute_delay > 60
   OR is_readonly = 1
   OR queue_size > 100;
```

### system.replication_queue

Pending replication operations:

```sql
-- Stuck replication tasks
SELECT
    database,
    table,
    type,
    create_time,
    num_tries,
    last_exception
FROM system.replication_queue
WHERE num_tries > 5
ORDER BY create_time;
```

## Monitoring Merges

### system.merges

Active merge operations:

```sql
-- Running merges
SELECT
    database,
    table,
    elapsed,
    progress,
    num_parts,
    result_part_name,
    formatReadableSize(total_size_bytes_compressed) AS size,
    formatReadableSize(bytes_read_uncompressed) AS read,
    formatReadableSize(bytes_written_uncompressed) AS written
FROM system.merges;
```

### system.mutations

ALTER TABLE mutations:

```sql
-- Pending mutations
SELECT
    database,
    table,
    mutation_id,
    command,
    create_time,
    is_done,
    parts_to_do,
    latest_fail_reason
FROM system.mutations
WHERE NOT is_done;
```

## Storage Monitoring

### system.disks

Disk space:

```sql
-- Disk usage
SELECT
    name,
    path,
    formatReadableSize(free_space) AS free,
    formatReadableSize(total_space) AS total,
    round(free_space / total_space * 100, 2) AS free_percent
FROM system.disks;
```

### system.storage_policies

Storage configuration:

```sql
SELECT
    policy_name,
    volume_name,
    disks
FROM system.storage_policies;
```

## Building a Monitoring Dashboard

### Key Metrics Query

```sql
-- Dashboard summary
SELECT
    (SELECT count() FROM system.processes) AS active_queries,
    (SELECT count() FROM system.merges) AS active_merges,
    (SELECT value FROM system.metrics WHERE metric = 'MemoryTracking') AS memory_usage,
    (SELECT count() FROM system.parts WHERE active) AS total_parts,
    (SELECT count() FROM system.replicas WHERE absolute_delay > 60) AS lagging_replicas,
    (SELECT count() FROM system.mutations WHERE NOT is_done) AS pending_mutations;
```

### Query Rate

```sql
-- Queries per minute
SELECT
    toStartOfMinute(query_start_time) AS minute,
    count() AS queries,
    countIf(exception_code != 0) AS errors,
    round(avg(query_duration_ms)) AS avg_duration_ms
FROM system.query_log
WHERE type IN ('QueryFinish', 'ExceptionWhileProcessing')
  AND event_date = today()
  AND query_start_time > now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

### Insert Rate

```sql
-- Inserts per minute
SELECT
    toStartOfMinute(event_time) AS minute,
    sum(written_rows) AS rows_inserted,
    formatReadableSize(sum(written_bytes)) AS bytes_inserted
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind = 'Insert'
  AND event_date = today()
GROUP BY minute
ORDER BY minute;
```

## Alerting Queries

### Critical Alerts

```sql
-- Disk space low (< 10%)
SELECT
    name,
    round(free_space / total_space * 100, 2) AS free_percent
FROM system.disks
WHERE free_space / total_space < 0.1;

-- Too many parts
SELECT database, table, count() AS parts
FROM system.parts
WHERE active
GROUP BY database, table
HAVING parts > 300;

-- Replication lag
SELECT database, table, absolute_delay
FROM system.replicas
WHERE absolute_delay > 300;

-- Long running queries
SELECT query_id, elapsed, query
FROM system.processes
WHERE elapsed > 300;
```

### Warning Alerts

```sql
-- High error rate
SELECT
    round(countIf(exception_code != 0) / count() * 100, 2) AS error_rate
FROM system.query_log
WHERE type IN ('QueryFinish', 'ExceptionWhileProcessing')
  AND event_date = today()
  AND query_start_time > now() - INTERVAL 5 MINUTE
HAVING error_rate > 5;

-- Memory pressure
SELECT value / 1e9 AS memory_gb
FROM system.metrics
WHERE metric = 'MemoryTracking'
HAVING memory_gb > 50;  -- Adjust threshold

-- Merge backlog
SELECT
    database,
    table,
    count() AS parts
FROM system.parts
WHERE active
GROUP BY database, table
HAVING parts > 100;
```

## Prometheus Export

### Configure Prometheus Endpoint

```xml
<!-- /etc/clickhouse-server/config.d/prometheus.xml -->
<clickhouse>
    <prometheus>
        <endpoint>/metrics</endpoint>
        <port>9363</port>
        <metrics>true</metrics>
        <events>true</events>
        <asynchronous_metrics>true</asynchronous_metrics>
    </prometheus>
</clickhouse>
```

### Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: 'clickhouse'
    static_configs:
      - targets: ['clickhouse:9363']
```

### Key Prometheus Metrics

```
# Query rate
rate(ClickHouseProfileEvents_Query[5m])

# Error rate
rate(ClickHouseProfileEvents_FailedQuery[5m])

# Memory usage
ClickHouseMetrics_MemoryTracking

# Parts count
ClickHouseAsyncMetrics_TotalPartsOfMergeTreeTables

# Replication lag
ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay
```

## Grafana Dashboard Queries

```sql
-- Time series: Query duration
SELECT
    $__timeInterval(query_start_time) AS time,
    avg(query_duration_ms) AS avg_duration,
    quantile(0.99)(query_duration_ms) AS p99_duration
FROM system.query_log
WHERE $__timeFilter(query_start_time)
  AND type = 'QueryFinish'
GROUP BY time
ORDER BY time;

-- Time series: Rows inserted
SELECT
    $__timeInterval(event_time) AS time,
    sum(written_rows) AS rows
FROM system.query_log
WHERE $__timeFilter(event_time)
  AND query_kind = 'Insert'
GROUP BY time
ORDER BY time;
```

---

ClickHouse's system tables provide deep visibility into every aspect of database performance. Monitor query_log for performance issues, parts for storage health, replicas for replication status, and metrics for real-time health. Set up alerts on critical thresholds and you'll catch problems before they impact users.
