# How to Debug Slow Inserts in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Insert, Performance, Debugging, Troubleshooting

Description: Learn how to debug slow INSERT performance in ClickHouse by identifying bottlenecks in batching, merge pressure, and write-ahead log settings.

---

## Why Are Inserts Slow?

ClickHouse is optimized for large batch inserts. Common reasons for slow inserts include:

- Too many small batches causing excessive part creation
- Too many background merges competing for I/O
- Incorrect table settings for the write workload
- Replication lag delaying quorum acknowledgments
- Network or disk I/O bottlenecks

## Step 1: Check Current Insert Rate

```sql
SELECT
    event_time,
    written_rows,
    written_bytes,
    query_duration_ms,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE 'INSERT%'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 20;
```

## Step 2: Check Part Count (Too Many Small Parts)

```sql
SELECT
    database,
    table,
    count() AS part_count,
    sum(rows) AS total_rows,
    sum(bytes_on_disk) AS total_bytes
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY part_count DESC
LIMIT 10;
```

A healthy MergeTree table has a few hundred parts. Thousands of parts indicate too-small batches.

## Step 3: Monitor Merge Queue

```sql
SELECT
    database,
    table,
    count() AS merges_in_queue,
    sum(rows_written) AS rows_being_merged
FROM system.merges
GROUP BY database, table;
```

If the merge queue is large, background merges are falling behind inserts.

## Step 4: Check Too Many Parts Error

```sql
SELECT
    exception,
    count() AS occurrences
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
  AND exception LIKE '%too many parts%'
  AND event_date = today()
GROUP BY exception;
```

The "too many parts" error is throttled by ClickHouse - inserts will be delayed until merges catch up.

## Step 5: Increase Batch Size

The most impactful fix for slow inserts is larger batches:

```text
Bad:  1,000 rows per INSERT, 1,000 inserts/second
Good: 100,000 rows per INSERT, 10 inserts/second
```

Aim for at least 100,000 rows or 100 MB per INSERT batch.

## Step 6: Use Async Insert Mode

For clients that cannot batch, enable async inserts:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 0;
SET async_insert_max_data_size = 10485760;     -- 10 MB buffer
SET async_insert_busy_timeout_ms = 200;         -- flush every 200ms
```

ClickHouse buffers small inserts and writes them as larger batches internally.

## Step 7: Check Disk I/O During Inserts

```bash
iostat -x 2 5
```

High `%util` or high `await` on the ClickHouse data directory disk points to I/O bottleneck.

## Step 8: Adjust max_insert_threads

```sql
SET max_insert_threads = 4;  -- Use multiple threads to write parts
```

## Tuning Storage Settings

Session-level block size settings (applied per query or via a user profile):

```sql
SET min_insert_block_size_rows = 1048576;
SET min_insert_block_size_bytes = 268435456;
```

MergeTree table-level thresholds that control when inserts are delayed or rejected:

```sql
ALTER TABLE events MODIFY SETTING
    parts_to_delay_insert = 300,
    parts_to_throw_insert = 600;
```

## Summary

Debug slow ClickHouse inserts by checking part counts, merge queue depth, and I/O utilization. The primary fix is increasing INSERT batch size. For high-frequency small inserts, enable async insert mode. Tune `parts_to_delay_insert` and `parts_to_throw_insert` thresholds based on your hardware's ability to keep up with background merges.
