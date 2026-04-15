# How to Use Memory Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory Engine, Storage Engine, Performance, Caching

Description: Learn how to use the Memory table engine in ClickHouse to store data entirely in RAM for ultra-fast queries, temporary datasets, and in-process caching scenarios.

---

The `Memory` table engine stores all data in RAM in an uncompressed, columnar format. Reads and writes happen at memory bandwidth speed with no disk I/O involved. The trade-off is that data does not survive a server restart - the table exists only as long as the ClickHouse process is running. Memory tables are well-suited for small hot datasets, temporary intermediate results, and benchmark fixtures.

## Creating a Memory Table

```sql
CREATE TABLE hot_metrics
(
    metric_name  String,
    host         String,
    recorded_at  DateTime,
    value        Float64
)
ENGINE = Memory;
```

No additional configuration is required. The table starts empty and grows as rows are inserted.

## Inserting Data

```sql
INSERT INTO hot_metrics VALUES
    ('cpu_pct',    'web-01', now(), 42.5),
    ('cpu_pct',    'web-02', now(), 38.1),
    ('mem_used_gb','web-01', now(), 6.2),
    ('mem_used_gb','web-02', now(), 7.8),
    ('req_per_sec','web-01', now(), 1240.0),
    ('req_per_sec','web-02', now(), 980.0);
```

## Querying a Memory Table

Queries run against in-memory data and avoid all disk access.

```sql
SELECT
    metric_name,
    host,
    value
FROM hot_metrics
WHERE recorded_at >= now() - INTERVAL 5 MINUTE
ORDER BY metric_name, host;
```

```text
metric_name   host    value
cpu_pct       web-01  42.5
cpu_pct       web-02  38.1
mem_used_gb   web-01  6.2
mem_used_gb   web-02  7.8
req_per_sec   web-01  1240
req_per_sec   web-02  980
```

## Loading Data from a MergeTree Table

A common pattern is to load a subset of data from a persistent table into a Memory table for repeated fast access.

```sql
-- Create a Memory table with the same schema as the source
CREATE TABLE recent_events_cache
(
    event_id   UInt64,
    event_type String,
    user_id    UInt64,
    event_time DateTime,
    properties String
)
ENGINE = Memory;

-- Populate from the last hour of events
INSERT INTO recent_events_cache
SELECT event_id, event_type, user_id, event_time, properties
FROM events
WHERE event_time >= now() - INTERVAL 1 HOUR;
```

## Aggregation on Memory Tables

Aggregation performance on Memory tables is excellent because all data is already in CPU-cache-friendly columnar format in RAM.

```sql
SELECT
    metric_name,
    round(avg(value), 2) AS avg_value,
    round(min(value), 2) AS min_value,
    round(max(value), 2) AS max_value,
    count()              AS sample_count
FROM hot_metrics
GROUP BY metric_name
ORDER BY metric_name;
```

```text
metric_name   avg_value  min_value  max_value  sample_count
cpu_pct       40.30      38.1       42.5       2
mem_used_gb   7.00       6.2        7.8        2
req_per_sec   1110.00    980.0      1240.0     2
```

## Using Memory Tables in JOIN Operations

Memory tables are effective as the right-hand side of a JOIN because the entire build side fits in RAM.

```sql
-- Dimension table in Memory for fast joins
CREATE TABLE dim_countries
(
    country_code String,
    country_name String,
    region       String
)
ENGINE = Memory;

INSERT INTO dim_countries VALUES
    ('US', 'United States', 'Americas'),
    ('DE', 'Germany',       'Europe'),
    ('JP', 'Japan',         'Asia');

-- Fast lookup join
SELECT
    o.order_id,
    o.country_code,
    c.country_name,
    c.region,
    o.amount
FROM orders AS o
INNER JOIN dim_countries AS c ON o.country_code = c.country_code
WHERE o.order_date = today()
ORDER BY o.amount DESC
LIMIT 10;
```

## Temporary Calculation Table

Use a Memory table to hold intermediate results when a CTE or subquery would recompute expensive aggregations.

```sql
-- Store expensive pre-aggregation
CREATE TABLE daily_baseline
(
    metric_name String,
    p50         Float64,
    p95         Float64,
    p99         Float64
)
ENGINE = Memory;

INSERT INTO daily_baseline
SELECT
    metric_name,
    quantile(0.50)(value) AS p50,
    quantile(0.95)(value) AS p95,
    quantile(0.99)(value) AS p99
FROM metrics_archive
WHERE event_date = yesterday()
GROUP BY metric_name;

-- Now join live data against the cached baseline
SELECT
    h.metric_name,
    h.host,
    h.value,
    b.p95,
    h.value > b.p95 AS above_p95
FROM hot_metrics AS h
LEFT JOIN daily_baseline AS b ON h.metric_name = b.metric_name;
```

## Clearing a Memory Table

Because Memory tables hold no disk state, `TRUNCATE` simply frees all in-memory blocks.

```sql
TRUNCATE TABLE hot_metrics;
```

## Checking Memory Table Size

```sql
SELECT
    table,
    formatReadableSize(total_bytes) AS memory_used,
    total_rows
FROM system.tables
WHERE engine = 'Memory'
  AND database = currentDatabase();
```

```text
table                memory_used  total_rows
hot_metrics          1.23 KiB     6
dim_countries        512 B        3
```

## Refreshing Data on a Schedule

You can truncate and reload a Memory table manually from application code or a cron job.

```sql
-- Step 1: clear stale cache
TRUNCATE TABLE recent_events_cache;

-- Step 2: reload fresh data
INSERT INTO recent_events_cache
SELECT event_id, event_type, user_id, event_time, properties
FROM events
WHERE event_time >= now() - INTERVAL 1 HOUR;
```

Alternatively, use a refreshable materialized view to let ClickHouse handle the schedule natively. The view automatically replaces its contents on each refresh cycle.

```sql
CREATE MATERIALIZED VIEW recent_events_cache_mv
REFRESH EVERY 1 HOUR
ENGINE = Memory
AS
SELECT event_id, event_type, user_id, event_time, properties
FROM events
WHERE event_time >= now() - INTERVAL 1 HOUR;
```

## Limitations

- Data is lost on server restart or crash.
- No indexes - full scans are used for all queries.
- Not suitable for large datasets because RAM is finite and expensive.
- No replication or distribution.

## Summary

The `Memory` engine is the fastest ClickHouse table engine because all I/O happens in RAM. Use it for small hot reference tables, temporary intermediate results, and join build-sides where data loss on restart is acceptable. For persistence across restarts, store the authoritative data in a MergeTree table and reload the Memory cache on startup.
