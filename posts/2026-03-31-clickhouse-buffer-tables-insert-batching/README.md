# How to Use Buffer Tables for Insert Batching in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Buffer Table, Insert, Performance, Batching

Description: Learn how ClickHouse Buffer tables absorb high-frequency inserts in memory and flush them in batches to a destination MergeTree table.

---

The Buffer table engine is a ClickHouse-native way to absorb high-frequency inserts without overwhelming the underlying MergeTree table with too many small parts. Data written to a Buffer table is held in RAM and flushed to the destination table when configurable thresholds are met - by time, row count, or data volume. This post explains the Buffer engine, its configuration parameters, and how it compares to async inserts.

## How Buffer Tables Work

A Buffer table sits in front of a target table. Writes go to the Buffer table, which accumulates data in one or more in-memory blocks. When any flush threshold is exceeded, the buffer is written to the destination table as a single, larger insert.

Reads from the Buffer table return the union of data still in the buffer and data already in the destination table, so the Buffer table is transparent to queries.

## Creating a Buffer Table

```sql
CREATE TABLE events_buffer AS events
ENGINE = Buffer(
    currentDatabase(), -- destination database
    'events',          -- destination table
    16,                -- number of buffer blocks (shards)
    10,                -- min_time (seconds) before flush
    100,               -- max_time (seconds) before flush
    10000,             -- min_rows before flush
    1000000,           -- max_rows before flush
    10485760,          -- min_bytes (10 MB) before flush
    104857600          -- max_bytes (100 MB) before flush
);
```

The `AS events` clause copies the schema from the destination table. You can also define columns explicitly.

## Flush Conditions Explained

ClickHouse flushes each buffer block when **all** of the `min_*` conditions are met, OR when **at least one** of the `max_*` conditions is exceeded:

| Parameter | Role |
|---|---|
| `min_time` / `max_time` | `min_time` is the minimum seconds since last flush that must elapse before a min-based flush; `max_time` is the hard deadline that forces a flush |
| `min_rows` / `max_rows` | `min_rows` is the minimum row count that must be buffered before a min-based flush; `max_rows` forces a flush once reached |
| `min_bytes` / `max_bytes` | `min_bytes` is the minimum buffered byte size before a min-based flush; `max_bytes` forces a flush once reached |

The flush happens when all three min thresholds are simultaneously met, or any one of the max thresholds is exceeded, or the server shuts down (or the Buffer table is dropped or detached).

Put another way: the buffer flushes eagerly once the min thresholds line up, and forcibly once any max threshold is hit.

## Inserting into a Buffer Table

Insert into the Buffer table exactly as you would the destination:

```sql
INSERT INTO events_buffer (event_id, event_name, created_at)
VALUES
    (1, 'page_view', '2026-03-31 10:00:00'),
    (2, 'click',     '2026-03-31 10:01:00'),
    (3, 'purchase',  '2026-03-31 10:02:00');
```

The insert returns immediately once the data is written to the in-memory buffer. No disk I/O occurs until a flush threshold is triggered.

## Querying Through the Buffer

Queries on the Buffer table automatically include buffered (not-yet-flushed) data:

```sql
-- This returns data from both the buffer and the destination table
SELECT count() FROM events_buffer;

-- Compare with querying the destination directly
SELECT count() FROM events;
```

## Manually Flushing the Buffer

There is no direct `FLUSH BUFFER` command for a specific Buffer table. To force a flush:

```sql
-- Optimize triggers a flush of pending buffer data
OPTIMIZE TABLE events_buffer;
```

Alternatively, `DROP TABLE` (or `DETACH TABLE`) on the Buffer table also flushes any pending rows to the destination before the table is removed, so dropping and recreating the Buffer table is another way to force a flush.

## Multiple Buffer Shards

The third parameter (`num_layers`) controls how many independent buffer blocks are created. More shards reduce lock contention when many threads write concurrently:

```sql
CREATE TABLE events_buffer AS events
ENGINE = Buffer(
    currentDatabase(),
    'events',
    32,        -- 32 shards for high-concurrency workloads
    10, 100,
    10000, 1000000,
    10485760, 104857600
);
```

Each shard holds and flushes data independently, so the effective max before any flush is `max_rows * num_layers` in the worst case.

## Buffer Tables vs Async Inserts

| Feature | Buffer Table | Async Insert |
|---|---|---|
| Configuration | DDL (CREATE TABLE) | Session/user settings |
| Buffering location | Server RAM | Server RAM |
| Client visibility | Transparent (reads merge) | Transparent |
| Deduplication support | No | Yes (with setting) |
| Per-table control | Yes | Yes (per user/query) |
| Overhead | Extra table object | None |

Buffer tables are a good fit when you want a persistent, explicit buffering layer with no client-side changes. Async inserts are simpler to enable globally and have been available since ClickHouse 21.11.

## Monitoring Buffer State

```sql
-- Check Buffer table metadata
SELECT
    name,
    engine,
    engine_full
FROM system.tables
WHERE engine = 'Buffer'
  AND database = currentDatabase();
```

```sql
-- Monitor destination table part count
SELECT
    table,
    count()   AS active_parts,
    sum(rows) AS total_rows
FROM system.parts
WHERE active
  AND table = 'events'
  AND database = currentDatabase()
GROUP BY table;
```

## Summary

Buffer tables provide a simple, server-side insert batching layer for ClickHouse. By absorbing many small writes into memory and flushing them when time, row, or byte thresholds are met, they keep part counts low and merge pressure manageable. Tune `max_time`, `max_rows`, and `max_bytes` to match your workload's latency and throughput requirements, and increase `num_layers` for high-concurrency write scenarios.
