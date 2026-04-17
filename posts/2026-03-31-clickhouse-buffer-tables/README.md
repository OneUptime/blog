# How to Use Buffer Tables to Absorb Write Spikes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Database, Infrastructure, SQL

Description: Learn how to use ClickHouse Buffer tables to absorb write spikes, smooth bursty ingestion, and protect MergeTree tables from too-many-parts errors.

## Introduction

Buffer tables are an in-process, in-memory buffer layer built into ClickHouse. They accept inserts at high rates, accumulate data in RAM, and flush to a destination MergeTree table in large batches when configurable thresholds are met. Unlike async inserts (which batch inserts per query shape and settings hash), a Buffer table is a shared server-wide buffer bound to a destination table and available to all connections simultaneously.

Buffer tables are particularly useful when you cannot control the batching behavior of the clients writing to ClickHouse - for example, when data arrives from many independent agents or from a message queue consumer that delivers one record at a time.

## How Buffer Tables Work

A Buffer table wraps a destination MergeTree table. When you INSERT into the Buffer table:

1. ClickHouse places the data in one of N in-memory buffers (sharded across CPU cores).
2. When any of the following thresholds is exceeded, the buffer is flushed to the destination table:
   - `min_time` / `max_time` (seconds since last flush)
   - `min_rows` / `max_rows` (number of rows accumulated)
   - `min_bytes` / `max_bytes` (bytes accumulated)
3. Queries on the Buffer table read from both the in-memory buffer AND the destination table, so data is immediately visible.

## Creating a Buffer Table

```sql
-- First, create the destination MergeTree table
CREATE TABLE events
(
    service    LowCardinality(String),
    event_type LowCardinality(String),
    value      Float64,
    event_time DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, service);

-- Create the Buffer table pointing to the destination
CREATE TABLE events_buffer AS events
ENGINE = Buffer(
    'default',          -- destination database
    'events',           -- destination table
    16,                 -- number of shards (use number of CPU cores)
    10,                 -- min_time: flush if 10 seconds have passed
    100,                -- max_time: always flush after 100 seconds
    10000,              -- min_rows: flush if 10K rows accumulated
    1000000,            -- max_rows: always flush at 1M rows
    10000000,           -- min_bytes: flush at 10 MB
    100000000           -- max_bytes: always flush at 100 MB
);
```

The `AS events` clause copies the column definition. Inserts and queries go through `events_buffer`; the destination `events` table receives flushed batches.

## Inserting Through the Buffer

```sql
-- Insert single rows or small batches freely - the buffer handles accumulation
INSERT INTO events_buffer VALUES ('api', 'request', 42.5, now());
INSERT INTO events_buffer VALUES ('web', 'pageview', 1.0, now());

-- Queries on the buffer table include unflushed data
SELECT count() FROM events_buffer WHERE event_time >= today();
-- Returns: count from buffer (unflushed) + count from events (flushed)
```

## Choosing Buffer Parameters

The threshold parameters have both minimum and maximum variants. A flush occurs when both the "minimum" conditions are met, OR when any "maximum" condition is reached:

- Flush if `time >= min_time AND rows >= min_rows AND bytes >= min_bytes`
- OR flush if `time >= max_time OR rows >= max_rows OR bytes >= max_bytes`

```sql
-- Example 1: Flush every 10 seconds regardless of size (low-latency ingestion)
ENGINE = Buffer('default', 'events', 8,
    10, 10,         -- min_time, max_time: always flush every 10 seconds
    0, 1000000,     -- min_rows, max_rows
    0, 100000000    -- min_bytes, max_bytes
)

-- Example 2: Flush when 500K rows accumulate or after 60 seconds
ENGINE = Buffer('default', 'events', 16,
    60, 300,        -- flush after 60-300 seconds
    500000, 2000000, -- flush after 500K-2M rows
    50000000, 500000000  -- flush after 50MB-500MB
)

-- Example 3: High-frequency agents, flush every 5 seconds or 100K rows
ENGINE = Buffer('default', 'events', 16,
    5, 30,
    100000, 500000,
    10000000, 100000000
)
```

## Number of Shards

The first numeric parameter (after the destination table name) is the number of internal shards. Use a value equal to the number of CPU cores to minimize lock contention on inserts.

```bash
# Check CPU core count
nproc
# Example output: 16
```

```sql
-- 16-core server: use 16 shards
ENGINE = Buffer('default', 'events', 16, ...)
```

## Querying Through the Buffer

You can query a Buffer table directly. ClickHouse merges results from the in-memory buffers and the destination table transparently.

```sql
-- This returns data from both buffer and destination table
SELECT
    toStartOfHour(event_time) AS hour,
    service,
    count()                   AS events
FROM events_buffer
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY hour, service
ORDER BY hour, events DESC;
```

Note: because the buffer stores data in unordered chunks, queries on the Buffer table do not benefit from primary key pruning on the buffered (unflushed) portion. For analytical queries on large time ranges, query the destination table directly.

```sql
-- For large analytical queries, bypass the buffer and query the destination
SELECT count() FROM events WHERE event_time >= today() - 30;
```

## Flushing the Buffer Manually

You can force an immediate flush without waiting for thresholds:

```sql
-- Flush all Buffer tables in the database
OPTIMIZE TABLE events_buffer;

-- Or restart the server (also flushes all buffers gracefully)
-- clickhouse-server gracefully flushes on shutdown
```

## Monitoring Buffer Tables

```sql
-- Check buffer fill levels (rows and bytes currently in buffer)
SELECT
    database,
    name             AS table,
    engine,
    total_rows,
    total_bytes,
    formatReadableSize(total_bytes) AS readable_size
FROM system.tables
WHERE engine = 'Buffer';

-- Count unflushed rows per buffer table
SELECT
    database,
    name,
    total_rows AS buffered_rows
FROM system.tables
WHERE engine = 'Buffer'
ORDER BY total_rows DESC;
```

## Limitations of Buffer Tables

- **No persistence**: buffer contents are lost if ClickHouse crashes before flushing. Use async inserts or Kafka as a durable queue if data loss is not acceptable.
- **No deduplication**: duplicate inserts in the buffer are not detected. Buffer tables also break `ReplicatedMergeTree` insert deduplication on the destination — the flush randomizes block order and sizes, so the dedup hash no longer matches. Do not use Buffer tables where reliable exactly-once writes are required.
- **No filtering**: all data inserted into a Buffer table goes to the same destination table. You cannot route different rows to different destination tables.
- **Memory**: buffers consume server RAM. Size the `max_bytes` threshold relative to available memory: on a server with 64 GB RAM, avoid total buffer size exceeding 8-10 GB.
- **Schema changes**: if you `ALTER TABLE events` to add a column, you must drop and recreate the Buffer table to match the new schema.

## Buffer Table vs Async Inserts

| Feature | Buffer Table | Async Inserts |
|---|---|---|
| Buffer location | Server-side, shared per destination table | Server-side, grouped per query shape + settings |
| Persistence on crash | No | No |
| Client changes required | No (insert to buffer table) | Yes (SET async_insert = 1) |
| Visibility of buffered data | Yes (buffer table query) | Yes |
| Deduplication | No | Optional |
| Best for | Legacy clients, no client control | Modern clients you control |

## Summary

Buffer tables provide a transparent write-acceleration layer for ClickHouse: inserts accumulate in shared in-memory shards and flush to the destination MergeTree table in large batches when time, row count, or byte thresholds are met. Use Buffer tables when you cannot control client batching behavior and need a server-side solution. Set shard count equal to CPU core count, tune thresholds for your latency/throughput trade-off, and query the destination table directly for large analytical queries that need index pruning.
