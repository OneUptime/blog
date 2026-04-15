# How to Use system.distribution_queue in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.distribution_queue, Distributed Table, Monitoring, Queue

Description: Learn how to use the system.distribution_queue table in ClickHouse to monitor pending data transfers from Distributed tables to their underlying shards.

---

When you insert data into a Distributed table in ClickHouse, the data is first buffered locally and then asynchronously sent to the appropriate shards. The `system.distribution_queue` table lets you monitor this pending delivery queue, diagnose delays, and detect failed transfers.

## What Is system.distribution_queue?

The `system.distribution_queue` table tracks data files that are waiting to be forwarded from a Distributed table to its underlying shard nodes. Each row represents a batch of data pending delivery to a specific shard.

## Basic Query

```sql
SELECT
    database,
    table,
    data_path,
    is_blocked,
    error_count,
    last_exception,
    last_exception_time
FROM system.distribution_queue
ORDER BY error_count DESC;
```

## Monitor Queue Depth

To check how many files are waiting to be sent to each shard:

```sql
SELECT
    database,
    table,
    sum(data_files) AS pending_files,
    sum(data_compressed_bytes) AS pending_bytes,
    formatReadableSize(sum(data_compressed_bytes)) AS pending_size
FROM system.distribution_queue
GROUP BY database, table
ORDER BY pending_files DESC;
```

## Identify Failed Deliveries

Persistent failures often indicate network issues or shard unavailability:

```sql
SELECT
    database,
    table,
    data_path,
    error_count,
    last_exception,
    last_exception_time
FROM system.distribution_queue
WHERE error_count > 3
  AND last_exception != ''
ORDER BY error_count DESC;
```

## Check Blocked Deliveries

To see which tables have their sending currently blocked:

```sql
SELECT
    database,
    table,
    data_path,
    error_count
FROM system.distribution_queue
WHERE is_blocked = 1;
```

## Monitor Queue Growth Over Time

If the queue is growing, it could indicate that a shard is down or overloaded. Monitor the trend:

```sql
SELECT
    database,
    table,
    count() AS queue_depth
FROM system.distribution_queue
GROUP BY database, table;
```

Run this periodically and alert if `queue_depth` keeps increasing.

## Forcing Queue Flush

To manually trigger sending queued data (useful during maintenance or recovery):

```sql
SYSTEM FLUSH DISTRIBUTED distributed_events;
```

After flushing, verify the queue is clear:

```sql
SELECT count()
FROM system.distribution_queue
WHERE table = 'distributed_events';
```

## Understanding Retry Logic

ClickHouse retries failed shard deliveries automatically. The relevant columns are:

| Column | Description |
|---|---|
| `error_count` | Number of errors that occurred during delivery |
| `last_exception` | Last error message |
| `last_exception_time` | Timestamp of the last error |

To cancel a stuck entry, you may need to manually remove the files from the data path on disk after identifying the shard target.

## Distributed Table Asynchronous Behavior

The `distributed_background_insert_sleep_time_ms` setting controls how often ClickHouse checks the queue. The `distributed_background_insert_batch` setting enables batching multiple files into a single delivery for efficiency.

```sql
SELECT name, value
FROM system.settings
WHERE name IN (
    'distributed_background_insert_sleep_time_ms',
    'distributed_background_insert_batch'
);
```

## Summary

The `system.distribution_queue` table is an essential diagnostic tool for ClickHouse clusters using Distributed tables. Use it to monitor delivery backlogs, identify failing shards, and ensure data reaches its destination reliably. Combine it with `SYSTEM FLUSH DISTRIBUTED` for operational control during incidents or maintenance windows.
