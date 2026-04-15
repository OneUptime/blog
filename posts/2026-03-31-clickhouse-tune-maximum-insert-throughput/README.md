# How to Tune ClickHouse for Maximum Insert Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Insert, Throughput, Performance, Tuning, MergeTree

Description: Tune ClickHouse server settings, client behavior, and table configuration to maximize insert throughput for high-volume pipelines.

---

Getting maximum insert throughput from ClickHouse requires tuning at multiple layers: the table engine, server configuration, and the insert client. This guide covers the most impactful levers.

## Use Large Batches

ClickHouse is optimized for bulk inserts. Each INSERT creates a new data part on disk. Many small parts trigger excessive background merges. Aim for batches of at least 10,000 rows:

```bash
# Insert a large batch via HTTP
curl -X POST "http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow" \
  --data-binary @events_batch.jsonl
```

## Increase the Number of Insert Threads

By default, ClickHouse uses a limited number of threads for inserts. You can increase parallelism:

```xml
<!-- users.xml -->
<profiles>
    <default>
        <max_insert_threads>8</max_insert_threads>
    </default>
</profiles>
```

Or at query level:

```sql
SET max_insert_threads = 8;
```

## Enable Parallel Inserts via HTTP

Multiple concurrent HTTP connections improve throughput on multi-core machines. Use a connection pool in your ingestion client and send parallel requests.

## Tune `parts_to_delay_insert` and `parts_to_throw_insert`

When too many parts accumulate, ClickHouse throttles inserts. Raise these thresholds carefully:

```sql
ALTER TABLE events MODIFY SETTING
    parts_to_delay_insert = 300,
    parts_to_throw_insert = 600;
```

## Configure Insert Block Size

Control how many rows or bytes are buffered in memory before writing a new data part:

```sql
SET min_insert_block_size_rows = 1048576;
SET min_insert_block_size_bytes = 268435456;
```

## Use Buffer Engine for Spiky Workloads

The `Buffer` engine absorbs write spikes and flushes to the underlying MergeTree table in batches:

```sql
CREATE TABLE events_buffer AS events
ENGINE = Buffer(currentDatabase(), events, 16, 10, 100, 10000, 1000000, 10000000, 1000000000);
```

Parameters: `database, table, num_layers, min_time, max_time, min_rows, max_rows, min_bytes, max_bytes`.

## Enable Async Inserts

Async inserts allow the server to buffer rows from multiple small clients and flush them as one large part:

```sql
SET async_insert = 1;
SET async_insert_busy_timeout_ms = 200;
SET async_insert_max_data_size = 10000000;
```

## Tune Compression

Using LZ4 (the default) provides a good balance of speed and compression. For maximum throughput, disable compression on insert if your network is fast:

```sql
SET network_compression_method = 'none';
```

## Measure and Monitor

Track insert throughput with system tables:

```sql
SELECT
    event_time,
    rows,
    size_in_bytes
FROM system.part_log
WHERE event_type = 'NewPart'
ORDER BY event_time DESC
LIMIT 20;
```

## Summary

Maximum ClickHouse insert throughput comes from batching writes, increasing insert threads, using async inserts for small-client scenarios, and tuning part thresholds to prevent merge throttling. Monitor `system.part_log` to validate that your configuration is working as intended.
