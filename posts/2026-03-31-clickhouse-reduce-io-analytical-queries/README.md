# How to Reduce IO in ClickHouse Analytical Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, IO Optimization, Column Store, Query Optimization, Performance

Description: Learn techniques to minimize IO in ClickHouse analytical queries through column selection, codec tuning, projections, and query design best practices.

---

ClickHouse is a columnar database - IO is measured in columns read, not rows. Reducing the number of columns, the granules scanned, and the bytes decoded per query is the foundation of performance optimization.

## Only Select Columns You Need

```sql
-- Reads ALL columns - high IO
SELECT * FROM events WHERE project_id = 42;

-- Reads only 3 columns - minimal IO
SELECT user_id, event_type, ts FROM events WHERE project_id = 42;
```

Each column in ClickHouse is stored separately. Selecting `*` reads every column's data from disk.

## Use Projections for Common Aggregations

Pre-aggregate to reduce IO at query time:

```sql
ALTER TABLE events ADD PROJECTION proj_hourly_counts (
    SELECT project_id, toStartOfHour(ts) AS hour, count()
    GROUP BY project_id, toStartOfHour(ts)
);
```

The aggregation projection stores far less data than the raw table.

## Use PREWHERE for Selective Filters

Read the filter column first to skip unnecessary column reads:

```sql
SELECT user_id, event_type
FROM events
PREWHERE status = 'error'
WHERE ts >= today();
```

Only rows passing `status = 'error'` trigger reads of `user_id` and `event_type`.

## Choose Efficient Codecs

Codec selection affects how much data is read from disk:

```sql
CREATE TABLE metrics (
    ts     DateTime CODEC(Delta, ZSTD(3)),
    value  Float64 CODEC(Gorilla, ZSTD(3)),
    host   LowCardinality(String) CODEC(ZSTD(3))
)
ENGINE = MergeTree()
ORDER BY (host, ts);
```

`Delta` + `ZSTD` compresses monotonically increasing values (timestamps, counters) very effectively.

## Filter on Partition Key

Partition pruning eliminates entire partitions from IO:

```sql
-- Reads only 2026-01 and 2026-02 partitions
SELECT count() FROM events
WHERE ts >= '2026-01-01' AND ts < '2026-03-01';
```

## Use Sampling for Approximate Results

```sql
SELECT
    user_id,
    count() * 10 AS approx_count
FROM events SAMPLE 0.1
WHERE project_id = 42
GROUP BY user_id;
```

Reads only 10% of data - for dashboards with approximate requirements.

## Avoid ORDER BY Without LIMIT

```sql
-- Reads everything, sorts everything
SELECT * FROM events ORDER BY ts DESC;

-- Efficient: reads and sorts only top 100
SELECT * FROM events ORDER BY ts DESC LIMIT 100;
```

## Check IO in system.query_log

```sql
SELECT
    query,
    read_bytes,
    result_rows,
    query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY read_bytes DESC
LIMIT 10;
```

## Summary

Reducing IO in ClickHouse is achieved through narrow column selection, partition pruning, PREWHERE, efficient codecs, projections, and query sampling. Every byte not read from disk directly improves query latency and throughput.
