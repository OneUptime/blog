# How to Debug ClickHouse INSERT Performance Problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Insert, Performance, Debug, Optimization

Description: Debug ClickHouse INSERT performance problems by profiling part creation, identifying small inserts, and tuning async insert and batch settings.

---

Poor INSERT performance in ClickHouse is usually caused by too many small inserts creating an excessive number of parts, insufficient batch sizes, or resource contention with background merges. Each INSERT into a MergeTree table creates at least one part, and too many parts degrade both write and read performance.

## Check Part Count and Creation Rate

```sql
SELECT
    database,
    table,
    count() AS parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY parts DESC
LIMIT 20;
```

More than 300 active parts per table is a warning sign.

## Monitor INSERT Throughput

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    sum(written_rows) AS rows_written,
    sum(written_bytes) AS bytes_written,
    count() AS insert_queries
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind = 'Insert'
  AND event_time > now() - INTERVAL 10 MINUTE
GROUP BY minute
ORDER BY minute;
```

## Identify Small Inserts

```sql
SELECT
    written_rows,
    written_bytes,
    query_duration_ms,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind = 'Insert'
  AND written_rows < 1000
  AND event_time > now() - INTERVAL 1 HOUR
ORDER BY event_time DESC
LIMIT 20;
```

Small inserts (fewer than 1,000 rows) cause part proliferation.

## Enable Async Inserts

Async inserts buffer small writes and flush in batches:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 0;
SET async_insert_max_data_size = 10000000;  -- 10 MB
SET async_insert_busy_timeout_ms = 200;
```

In `users.xml` for persistent settings:

```xml
<profiles>
  <ingestion>
    <async_insert>1</async_insert>
    <async_insert_max_data_size>10000000</async_insert_max_data_size>
    <async_insert_busy_timeout_ms>200</async_insert_busy_timeout_ms>
  </ingestion>
</profiles>
```

## Batch Inserts at the Application Level

Instead of inserting rows one by one, batch at the application:

```python
# Bad: one INSERT per event
for event in events:
    client.execute("INSERT INTO events VALUES", [event])

# Good: batch INSERT
batch = []
for event in events:
    batch.append(event)
    if len(batch) >= 10000:
        client.execute("INSERT INTO events VALUES", batch)
        batch = []
```

## Check Background Merge Performance

If merges fall behind, parts accumulate:

```sql
SELECT
    database,
    table,
    count() AS active_merges,
    sum(elapsed) AS total_elapsed_seconds,
    avg(progress) AS avg_progress
FROM system.merges
GROUP BY database, table
ORDER BY active_merges DESC;
```

Increase merge threads if merges are slow:

```xml
<background_pool_size>16</background_pool_size>
```

## Summary

INSERT performance problems in ClickHouse stem from too many small inserts creating excessive parts. Enable async inserts to buffer small writes, batch at the application layer to send 10,000+ rows per INSERT, and monitor part counts with `system.parts`. Keep active parts under 300 per table and ensure background merge threads can keep up with the ingestion rate.
