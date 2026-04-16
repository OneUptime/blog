# How to Build a ClickHouse Insert Performance Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Insert, Dashboard, Performance, Monitoring

Description: Build a ClickHouse insert performance dashboard that tracks insert throughput, part creation rate, merge activity, and buffer behavior to optimize write pipelines.

---

Write performance is just as important as read performance in ClickHouse. An insert performance dashboard helps you identify bottlenecks in your ingestion pipeline - from client-side batching issues to merge backpressure - before they cause insert delays or "Too many parts" errors.

## Insert Throughput Panel

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS insert_queries,
    sum(written_rows) AS rows_inserted,
    formatReadableSize(sum(written_bytes)) AS bytes_inserted
FROM system.query_log
WHERE type = 'QueryFinish'
    AND query_kind = 'Insert'
    AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## Parts Created Per Minute

Each INSERT creates one or more parts. High part creation rates lead to merge pressure:

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS parts_created,
    formatReadableSize(sum(size_in_bytes)) AS bytes_written
FROM system.part_log
WHERE event_type = 'NewPart'
    AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

Aim for fewer than 1 part per second per table for sustainable write performance.

## Active Parts per Table

```sql
SELECT
    database,
    table,
    count() AS active_parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size
FROM system.parts
WHERE active = 1
GROUP BY database, table
HAVING active_parts > 100
ORDER BY active_parts DESC;
```

Tables approaching the `parts_to_delay_insert` threshold (default 1000 active parts per partition) will experience insert throttling as ClickHouse slows writes to allow merges to catch up. Hitting `parts_to_throw_insert` (default 3000) causes inserts to be rejected with "Too many parts".

## Merge Throughput vs Insert Rate

Balance check between merges and inserts:

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    countIf(event_type = 'NewPart') AS inserts,
    countIf(event_type = 'MergeParts') AS merges,
    formatReadableSize(sumIf(size_in_bytes, event_type = 'MergeParts')) AS merged_bytes
FROM system.part_log
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

If inserts consistently outpace merges, part count will grow until inserts are throttled.

## Insert Latency Distribution

```sql
SELECT
    quantile(0.50)(query_duration_ms) AS p50_ms,
    quantile(0.95)(query_duration_ms) AS p95_ms,
    quantile(0.99)(query_duration_ms) AS p99_ms,
    max(query_duration_ms) AS max_ms,
    count() AS total_inserts
FROM system.query_log
WHERE type = 'QueryFinish'
    AND query_kind = 'Insert'
    AND event_date = today();
```

## Buffer Table Fill Rate

If using Buffer tables as an insert buffer, list them and inspect their in-memory rows and bytes via `system.tables`:

```sql
SELECT
    database,
    name AS buffer_table,
    total_bytes,
    total_rows
FROM system.tables
WHERE engine = 'Buffer'
ORDER BY total_bytes DESC;
```

Combine with Buffer-engine flush counters to track throughput and errors:

```sql
SELECT event, value
FROM system.events
WHERE event IN (
    'StorageBufferFlush',
    'StorageBufferErrorOnFlush',
    'StorageBufferPassedAllMinThresholds',
    'StorageBufferPassedTimeMaxThreshold',
    'StorageBufferPassedRowsMaxThreshold',
    'StorageBufferPassedBytesMaxThreshold'
);
```

## Async Insert Queue

For async inserts, monitor queue depth and wait times:

```sql
SELECT metric, value
FROM system.metrics
WHERE metric IN (
    'AsyncInsertCacheSize',
    'PendingAsyncInsert'
);
```

Combined with:

```sql
SELECT event, value
FROM system.events
WHERE event IN (
    'AsyncInsertQuery',
    'AsyncInsertBytes',
    'FailedAsyncInsertQuery'
);
```

## Summary

An insert performance dashboard surfaces write pipeline health through insert throughput, part creation rate, merge balance, and latency percentiles. Use it to detect "too many parts" conditions early, tune insert batch sizes for optimal part creation rates, and balance merge settings against your write volume to maintain sustainable long-term insert performance.
