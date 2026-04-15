# How to Monitor ClickHouse Insert Rates and Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Monitoring, Insert Rate, Throughput, system.query_log, Prometheus

Description: Learn how to monitor ClickHouse insert rates and throughput using system tables and Prometheus metrics to detect ingestion slowdowns early.

---

Monitoring insert rates in ClickHouse helps you detect ingestion bottlenecks, upstream pipeline issues, and approaching throughput limits before they cause data loss or lag.

## Real-Time Insert Rate from system.query_log

```sql
SELECT
    toStartOfMinute(query_start_time) AS minute,
    count() AS insert_count,
    sum(written_rows) AS rows_inserted,
    formatReadableSize(sum(written_bytes)) AS bytes_inserted,
    round(sum(written_rows) / 60, 0) AS rows_per_second
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind = 'Insert'
  AND query_start_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute DESC;
```

## Current Insert Throughput from system.processes

For in-flight inserts right now:

```sql
SELECT
    query_id,
    user,
    elapsed,
    written_rows,
    written_bytes,
    query
FROM system.processes
WHERE query_kind = 'Insert'
ORDER BY written_rows DESC;
```

## Track Inserts Per Table

```sql
SELECT
    tables[1] AS table_name,
    count() AS insert_count,
    sum(written_rows) AS total_rows,
    avg(written_rows) AS avg_rows_per_insert
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind = 'Insert'
  AND query_start_time >= now() - INTERVAL 1 HOUR
GROUP BY table_name
ORDER BY total_rows DESC
LIMIT 20;
```

## Detect Insert Failures

```sql
SELECT
    toStartOfMinute(query_start_time) AS minute,
    count() AS failed_inserts,
    any(exception) AS example_error
FROM system.query_log
WHERE (type = 'ExceptionBeforeStart' OR type = 'ExceptionWhileProcessing')
  AND query_kind = 'Insert'
  AND query_start_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute DESC;
```

## Prometheus Metrics for Insert Monitoring

ClickHouse exposes insert metrics via Prometheus endpoint (`/metrics` on port 9363):

```text
ClickHouseProfileEvents_InsertedRows   -- total rows inserted
ClickHouseProfileEvents_InsertedBytes  -- total bytes inserted
ClickHouseProfileEvents_FailedInsertQueries -- failed inserts
ClickHouseMetrics_BackgroundBufferFlushSchedulePoolTask -- buffer flush queue
```

## Grafana Alert Rules

Set up Prometheus alerts:

```text
# Alert on insert rate drop (>50% below baseline for 5 minutes)
rate(ClickHouseProfileEvents_InsertedRows[5m]) < 0.5 * avg_over_time(rate(ClickHouseProfileEvents_InsertedRows[5m])[1h:5m])

# Alert on insert failures
increase(ClickHouseProfileEvents_FailedInsertQueries[5m]) > 0
```

## Monitoring Distributed Insert Queue

For distributed tables, check the pending async insert queue:

```sql
SELECT
    database,
    table,
    data_files,
    data_compressed_bytes,
    formatReadableSize(data_compressed_bytes) AS queue_size
FROM system.distribution_queue
ORDER BY data_compressed_bytes DESC;
```

A growing queue indicates the shards are not consuming distributed inserts fast enough.

## Track Part Creation Rate (Indicator of Insert Volume)

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS parts_created
FROM system.part_log
WHERE event_type = 'NewPart'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute DESC;
```

Too many parts per minute (> 300/min per table) indicates too many small inserts - consider batching.

## Summary

Monitor ClickHouse insert rates using `system.query_log` for historical analysis, `system.processes` for real-time in-flight inserts, and Prometheus metrics for alerting. Watch for failed inserts, growing distributed queues, and excessive part creation rates as early warning signs of ingestion problems.
