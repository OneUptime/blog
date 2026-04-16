# How to Handle Distributed INSERT Failures in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed Table, Insert, Error Handling, Reliability

Description: Learn how ClickHouse handles failed inserts on Distributed tables, how to monitor the distribution queue, and how to recover from shard unavailability.

---

When inserting into a ClickHouse Distributed table, the data is routed to one or more shards. If a shard is unavailable during an asynchronous insert, ClickHouse spools the data locally and retries. Understanding this failure mode helps you build reliable ingestion pipelines.

## How the Distributed Spool Works

When a shard is unreachable, ClickHouse writes insert data to a local spool directory:

```bash
ls /var/lib/clickhouse/data/default/distributed_events/
# shard1_replica1/  shard2_replica1/  shard3_replica1/
```

Each subdirectory corresponds to a shard/replica target. Failed sends accumulate here until the shard recovers.

## Monitoring the Distribution Queue

Check the current state of pending inserts:

```sql
SELECT
    database,
    table,
    data_path,
    is_blocked,
    error_count,
    data_files,
    data_compressed_bytes,
    broken_data_files,
    last_exception
FROM system.distribution_queue
WHERE error_count > 0
ORDER BY error_count DESC;
```

A rising `error_count` with non-empty `last_exception` means a shard is consistently unreachable.

## Checking Error Logs

View recent distribution errors:

```sql
SELECT
    event_time,
    message
FROM system.text_log
WHERE message LIKE '%distribution%'
  AND level IN ('Error', 'Warning')
ORDER BY event_time DESC
LIMIT 20;
```

## Configuring Retry Behavior

Tune how aggressively ClickHouse retries failed shard sends in `config.xml`:

```xml
<distributed_background_insert_sleep_time_ms>500</distributed_background_insert_sleep_time_ms>
<distributed_background_insert_max_sleep_time_ms>30000</distributed_background_insert_max_sleep_time_ms>
```

The retry interval starts at `sleep_time_ms` and doubles up to `max_sleep_time_ms` with each failure. (The older `distributed_directory_monitor_*` names still work as aliases but have been renamed in recent versions.)

## Setting Insert Error Handling Mode

Control what happens when a shard is unreachable. For synchronous inserts, use `distributed_foreground_insert` (formerly `insert_distributed_sync`) to push data straight to shards and fail fast:

```sql
-- Insert synchronously; fail if any target shard is unreachable
SET distributed_foreground_insert = 1;

-- During distributed SELECTs, silently skip unavailable shards
SET skip_unavailable_shards = 1;
```

For async inserts, enable the `fsync_directories` table engine setting to ensure spool data survives a node restart. This is configured per-table in the Distributed engine's `SETTINGS` clause:

```sql
CREATE TABLE distributed_events AS local_events
ENGINE = Distributed(my_cluster, default, local_events, rand())
SETTINGS fsync_directories = 1, fsync_after_insert = 1;
```

## Manually Flushing the Spool

Once a shard recovers, trigger an immediate flush instead of waiting for the background retry:

```sql
SYSTEM FLUSH DISTRIBUTED distributed_events;
```

This forces ClickHouse to attempt sending all spooled data immediately.

## Dropping Stuck Spool Files

If spool files are corrupted or you decide to discard them:

```bash
# On the inserting node
sudo systemctl stop clickhouse-server
sudo rm /var/lib/clickhouse/data/default/distributed_events/shard1_replica1/*.bin
sudo systemctl start clickhouse-server
```

Only do this if you are certain the data can be re-inserted from a source system.

## Preventing Spool Overflow

Bound the async-insert queue with the Distributed engine's `bytes_to_throw_insert` and `bytes_to_delay_insert` settings so inserts are delayed or rejected before disk fills:

```sql
CREATE TABLE distributed_events AS local_events
ENGINE = Distributed(my_cluster, default, local_events, rand())
SETTINGS
    bytes_to_delay_insert = 1073741824,   -- 1 GiB: start delaying inserts
    bytes_to_throw_insert = 10737418240;  -- 10 GiB: reject inserts
```

Alert when spool files grow too large:

```sql
SELECT
    database,
    table,
    data_files,
    data_compressed_bytes
FROM system.distribution_queue
WHERE data_files > 10000;
```

## Summary

ClickHouse handles Distributed INSERT failures by spooling data locally and retrying asynchronously. Monitor `system.distribution_queue` for failed sends, use `SYSTEM FLUSH DISTRIBUTED` to trigger immediate retries, and configure retry intervals to match your shard recovery SLA. Enable `fsync_directories` to protect spooled data across node restarts.
