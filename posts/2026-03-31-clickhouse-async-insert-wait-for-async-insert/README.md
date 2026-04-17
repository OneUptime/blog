# How to Use async_insert and wait_for_async_insert in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, async_insert, wait_for_async_insert, Data Ingestion, High Throughput, Setting

Description: Use async_insert and wait_for_async_insert to buffer small inserts server-side and control acknowledgment behavior for high-throughput ingestion.

---

When many small INSERT statements hit ClickHouse simultaneously, each creates a separate part on disk - leading to too many parts and merge pressure. The `async_insert` setting buffers these inserts server-side and flushes them as batches, dramatically reducing part creation overhead.

## What is async_insert?

`async_insert` is a boolean setting (default: `0`) that enables server-side insert buffering. When enabled, ClickHouse acknowledges the INSERT immediately (or after a configurable wait) and buffers the data in memory. A background process periodically flushes the buffer as a single batched write.

`wait_for_async_insert` controls whether the client waits for the data to be flushed to disk before receiving the acknowledgment:
- `1` (default) - wait for flush, guarantees durability before ACK
- `0` - acknowledge immediately after buffering (higher throughput, lower durability guarantee)

## Basic Usage

Enable async inserts for a session:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 1;

INSERT INTO events (id, ts, user_id, action)
VALUES (1, now(), 42, 'click');
```

With these settings, the insert is buffered and the client waits until the buffer is flushed before receiving a response.

## Flush Tuning Settings

Control when the buffer flushes:

```sql
SET async_insert_max_data_size  = 10485760;   -- flush at 10 MB
SET async_insert_busy_timeout_ms = 200;        -- flush after 200ms regardless of size
SET async_insert_stale_timeout_ms = 0;         -- disable stale timeout
```

These give you a buffer that flushes when it reaches 10 MB or after 200ms, whichever comes first.

## Fire-and-Forget Mode

For maximum throughput with relaxed durability:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 0;
```

The client gets an immediate acknowledgment after data is placed in the buffer. If the server crashes before flushing, buffered data is lost. Use this only for non-critical metrics or telemetry.

## Checking Buffer State

Monitor the async insert buffer via system tables:

```sql
SELECT
    table,
    database,
    rows,
    bytes,
    status
FROM system.asynchronous_insert_log
ORDER BY event_time DESC
LIMIT 20;
```

Also watch part counts to verify batching is working:

```sql
SELECT
    table,
    count()    AS part_count,
    sum(rows)  AS total_rows
FROM system.parts
WHERE active = 1
  AND database = 'mydb'
GROUP BY table
ORDER BY part_count DESC;
```

## When to Use async_insert

Async inserts are ideal when:

- You have many application instances each sending individual row inserts
- You can't batch inserts client-side (e.g., IoT sensors, edge agents)
- You want to avoid the complexity of a Kafka buffer just for insert batching

For high-throughput pipelines where you already batch at the application level, async inserts add latency without benefit - use synchronous batched inserts instead.

## Trade-offs

| Setting | Throughput | Durability |
|---------|------------|------------|
| Sync INSERT (batched) | High | High |
| async_insert + wait=1 | Medium-High | High |
| async_insert + wait=0 | Very High | Lower |

## Summary

`async_insert` with `wait_for_async_insert` lets ClickHouse buffer many small inserts into efficient batches server-side. Use `wait_for_async_insert=1` for durable acknowledgment, `wait_for_async_insert=0` for maximum throughput. Tune flush thresholds with `async_insert_max_data_size` and `async_insert_busy_timeout_ms` based on your latency and throughput requirements.
