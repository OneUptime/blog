# How to Handle Late-Arriving Data in Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Late Data, Stream Processing, Analytics

Description: Learn strategies for handling late-arriving data in ClickHouse materialized views, including reprocessing, watermarks, and buffer window patterns.

---

## The Late Data Problem

Materialized views in ClickHouse process data at insert time. If an event arrives late - after the time window it belongs to has already been aggregated - the aggregate is no longer accurate. This is a fundamental challenge in stream analytics.

## Strategy 1: Accept the Inaccuracy

For many use cases, small amounts of late data have negligible impact. Simply accept that aggregations may be slightly off:

```sql
CREATE MATERIALIZED VIEW mv_events_hourly
TO events_hourly
AS SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    count() AS cnt
FROM raw_events
GROUP BY hour, event_type;
```

This works fine when late arrivals are rare and precision is not critical.

## Strategy 2: Use a Time Buffer Window

Keep a rolling buffer of the last N hours and rebuild aggregations from raw data:

```sql
-- Raw table with sufficient retention
CREATE TABLE raw_events (
    event_time DateTime,
    event_type LowCardinality(String),
    value Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time)
TTL event_time + INTERVAL 7 DAY;

-- Recompute recent hours from raw
SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    count() AS cnt
FROM raw_events
WHERE event_time >= now() - INTERVAL 6 HOUR
GROUP BY hour, event_type;
```

## Strategy 3: Idempotent Inserts with ReplacingMergeTree

Use a target table that allows replacing rows when late data arrives:

```sql
CREATE TABLE events_hourly_replacing (
    hour DateTime,
    event_type LowCardinality(String),
    cnt UInt64,
    updated_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (hour, event_type);
```

Periodically recompute and re-insert affected hours:

```sql
INSERT INTO events_hourly_replacing
SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    count() AS cnt,
    now() AS updated_at
FROM raw_events
WHERE event_time >= now() - INTERVAL 4 HOUR
GROUP BY hour, event_type;
```

When querying, use `FINAL` to get deduplicated results, since ReplacingMergeTree only removes duplicate rows during background merges:

```sql
SELECT hour, event_type, cnt
FROM events_hourly_replacing FINAL;
```

## Strategy 4: Dual-Write Pattern

Write to both a real-time aggregate and a corrections table, then query a union:

```sql
CREATE VIEW events_hourly_final AS
SELECT hour, event_type, sum(cnt) AS cnt
FROM (
    SELECT hour, event_type, cnt FROM events_hourly_mv
    UNION ALL
    SELECT hour, event_type, cnt_delta AS cnt FROM events_late_corrections
)
GROUP BY hour, event_type;
```

## Monitoring Late Arrival Rate

```sql
SELECT
    countIf(insert_time - event_time > 300) AS late_count,
    count() AS total_count,
    countIf(insert_time - event_time > 300) * 100.0 / count() AS late_pct
FROM raw_events_with_insert_time
WHERE event_time >= now() - INTERVAL 1 HOUR;
```

## Summary

Handling late-arriving data in ClickHouse materialized views requires choosing the right strategy based on your accuracy requirements and data latency. Simple use cases can accept inaccuracy, while high-precision analytics should use ReplacingMergeTree or periodic recomputation from retained raw data.
