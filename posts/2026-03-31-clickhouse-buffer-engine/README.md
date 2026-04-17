# How to Use Buffer Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Buffer Engine, Storage Engine, Performance, Ingestion

Description: Learn how to use the Buffer table engine in ClickHouse to batch small frequent inserts in memory before flushing them to a destination MergeTree table automatically.

---

The `Buffer` table engine holds inserted rows in RAM and periodically flushes them to a destination table. It solves the "many small inserts" problem: writing one row at a time to a MergeTree table creates many tiny parts and slows down merges. By routing writes through a Buffer table, small inserts are batched transparently and the destination table sees large efficient writes. The flush happens automatically when configurable time or size thresholds are exceeded.

## Buffer Engine Syntax

```sql
CREATE TABLE <buffer_table>
AS <destination_table>
ENGINE = Buffer(
    database,           -- destination database name
    destination_table,  -- destination table name
    num_layers,         -- number of independent buffer layers (parallelism)
    min_time,           -- minimum seconds before flush
    max_time,           -- maximum seconds before flush
    min_rows,           -- minimum rows before flush
    max_rows,           -- maximum rows before flush
    min_bytes,          -- minimum bytes before flush
    max_bytes           -- maximum bytes before flush
);
```

Flush occurs when **any** of the `max_*` thresholds is exceeded, or when **all** of the `min_*` thresholds are simultaneously satisfied.

## Setting Up a Buffer Table

### Destination Table

```sql
CREATE TABLE events
(
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    page        String,
    duration_ms UInt32
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);
```

### Buffer Table Pointed at the Destination

```sql
CREATE TABLE events_buffer
AS events
ENGINE = Buffer(
    currentDatabase(),  -- same database as destination
    'events',           -- destination table
    16,                 -- 16 parallel buffer layers
    10,                 -- min 10 seconds
    100,                -- max 100 seconds before forced flush
    10000,              -- min 10,000 rows
    1000000,            -- max 1,000,000 rows before forced flush
    10000000,           -- min 10 MB
    100000000           -- max 100 MB before forced flush
);
```

## Inserting Via the Buffer

Applications write to `events_buffer`, not directly to `events`.

```sql
INSERT INTO events_buffer VALUES
    (now(), 1001, 'page_view', '/home',    320),
    (now(), 1002, 'click',     '/pricing',   0),
    (now(), 1003, 'page_view', '/docs',    180);
```

The rows are held in buffer memory. They appear in `events` only after a flush.

## Reading From Both Buffer and Destination

While rows are buffered, queries against `events_buffer` return buffered rows plus any flushed rows from `events`.

```sql
-- This reads both the buffer AND the destination table
SELECT count() FROM events_buffer;

-- This reads ONLY the flushed rows in the destination
SELECT count() FROM events;
```

## Manually Flushing the Buffer

Force an immediate flush with `OPTIMIZE`.

```sql
-- Flush all buffered data to the destination table now
OPTIMIZE TABLE events_buffer;
```

After this, `events` will contain all rows that were in `events_buffer`.

## Monitoring Buffer State

```sql
SELECT
    database,
    name,
    engine,
    total_rows,
    total_bytes
FROM system.tables
WHERE engine = 'Buffer'
  AND database = currentDatabase();
```

```text
database  name           engine  total_rows  total_bytes
default   events_buffer  Buffer  3           192
```

## High-Frequency Metric Ingestion Example

```sql
-- Destination for time-series metrics
CREATE TABLE metrics
(
    ts          DateTime,
    host        LowCardinality(String),
    metric_name LowCardinality(String),
    value       Float64,
    tags        String
)
ENGINE = MergeTree
PARTITION BY toDate(ts)
ORDER BY (metric_name, host, ts);

-- Buffer that absorbs bursty per-second writes from hundreds of hosts
CREATE TABLE metrics_buffer
AS metrics
ENGINE = Buffer(
    currentDatabase(),
    'metrics',
    8,           -- 8 layers for parallel write throughput
    5,           -- flush after at least 5 s
    30,          -- force flush after 30 s
    50000,       -- flush after 50k rows
    500000,      -- force flush at 500k rows
    5000000,     -- flush after 5 MB
    50000000     -- force flush at 50 MB
);

-- Each monitoring agent writes every second; the buffer batches them
INSERT INTO metrics_buffer VALUES
    (now(), 'web-01', 'cpu_pct',  42.1, '{"env":"prod"}'),
    (now(), 'web-01', 'mem_gb',    6.8, '{"env":"prod"}'),
    (now(), 'web-02', 'cpu_pct',  38.5, '{"env":"prod"}'),
    (now(), 'web-02', 'mem_gb',    7.2, '{"env":"prod"}');
```

## Querying Recent Metrics Through the Buffer

```sql
-- Always query the buffer table - it unions buffer + destination
SELECT
    toStartOfMinute(ts) AS minute,
    metric_name,
    round(avg(value), 2) AS avg_value,
    round(max(value), 2) AS max_value
FROM metrics_buffer
WHERE ts >= now() - INTERVAL 10 MINUTE
GROUP BY minute, metric_name
ORDER BY minute DESC, metric_name;
```

## Buffer With Multiple Layers

The `num_layers` parameter controls write parallelism. Each layer is an independent buffer with its own thresholds. Rows are inserted into one of the layers at random. Setting `num_layers = 16` means 16 independent RAM buffers - suitable for high-concurrency scenarios.

```sql
-- High-concurrency buffer with 32 layers
CREATE TABLE audit_log_buffer
AS audit_log
ENGINE = Buffer(
    currentDatabase(),
    'audit_log',
    32,        -- 32 layers for very high concurrency
    2,         -- flush after 2 s minimum
    60,        -- max 60 s
    100000,    -- min 100k rows
    2000000,   -- max 2M rows
    20000000,  -- min 20 MB
    200000000  -- max 200 MB
);
```

## Limitations

- Buffer data is lost on server crash or restart before flush.
- `ALTER TABLE` on the destination does not automatically update the buffer schema.
- `DELETE` and mutations do not apply to buffered rows.
- Queries using `FINAL` or mutations should target the destination table directly.

## Summary

The `Buffer` engine solves high-frequency small-insert workloads by accumulating rows in RAM and flushing them in large batches to a destination MergeTree table. It is transparent to reads - querying the buffer table returns both buffered and flushed data. Use it when write throughput is the bottleneck and you cannot batch inserts in the application layer.
