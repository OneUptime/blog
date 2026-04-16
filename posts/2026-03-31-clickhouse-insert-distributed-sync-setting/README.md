# How to Use insert_distributed_sync Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed Table, insert_distributed_sync, Setting, Insert

Description: Understand how the insert_distributed_sync setting changes insert behavior on ClickHouse Distributed tables and when synchronous mode is appropriate.

---

When inserting into a ClickHouse `Distributed` table, data is normally buffered locally on the inserting node and sent to remote shards asynchronously. The `insert_distributed_sync` setting changes this to synchronous mode, where inserts block until all remote shards confirm receipt.

## Default Asynchronous Behavior

By default, a Distributed table insert writes data to a local spool directory and returns immediately. Background threads then send this data to the appropriate shards:

```sql
-- Default async insert - returns quickly
INSERT INTO distributed_events VALUES (now(), 1, 'click');
```

The data lives in `/var/lib/clickhouse/data/default/distributed_events/` temporarily before being forwarded.

## Synchronous Insert Mode

Set `insert_distributed_sync = 1` to block until the data is confirmed on all destination shards:

```sql
SET insert_distributed_sync = 1;

INSERT INTO distributed_events VALUES (now(), 1, 'click');
-- Returns only after all shards confirm receipt
```

## When to Use Synchronous Inserts

Synchronous mode is appropriate when:
- You need confirmation that data reached all shards before proceeding
- You are doing batch migrations and want immediate error feedback
- Your application retries on failure and you want idempotent behavior

```sql
-- Migration script that needs confirmation before deleting source data
SET insert_distributed_sync = 1;

INSERT INTO distributed_events_new
SELECT * FROM events_staging
WHERE event_date = today();

-- Only reaches here if all shards received the data
ALTER TABLE events_staging DROP PARTITION toYYYYMM(today());
```

## Monitoring the Distributed Send Queue

For async inserts, monitor the queue to ensure data is flowing:

```sql
SELECT
    database,
    table,
    data_path,
    data_files,
    error_count,
    last_exception
FROM system.distribution_queue
ORDER BY error_count DESC;
```

A growing `data_files` with increasing `error_count` means shards are unreachable and data is accumulating in the spool.

## Controlling the Spool Size

When using async mode, prevent the spool from growing unbounded:

```xml
<distributed_directory_monitor_max_sleep_time_ms>30000</distributed_directory_monitor_max_sleep_time_ms>
<distributed_directory_monitor_batch_inserts>1</distributed_directory_monitor_batch_inserts>
```

The batch inserts setting groups multiple spool files into a single send operation for better throughput.

## Performance Comparison

Synchronous inserts have higher latency because they wait for network round trips to all shards. Measure the difference:

```sql
SELECT
    query,
    query_duration_ms,
    written_rows,
    written_bytes
FROM system.query_log
WHERE query LIKE 'INSERT INTO distributed_events%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;
```

For high-throughput workloads, async inserts with batch monitoring provide better performance, while sync mode provides stronger delivery guarantees at the cost of higher per-insert latency.

## Setting in Configuration

Apply synchronous inserts globally for specific users:

```xml
<profiles>
    <migration_user>
        <insert_distributed_sync>1</insert_distributed_sync>
    </migration_user>
</profiles>
```

## Summary

The `insert_distributed_sync` setting switches Distributed table inserts from asynchronous (default) to synchronous mode. Use synchronous mode when you need immediate confirmation that data reached all shards, such as in migration scripts. For production workloads, async mode with spool monitoring is usually preferred for better insert throughput.
