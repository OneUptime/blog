# How to Design a Schema for Multi-Granularity Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Multi-Granularity, Schema Design, ROLLUP, Materialized View, Time Series

Description: Learn how to design ClickHouse schemas that efficiently serve queries at multiple time granularities - seconds, minutes, hours, and days - from a single pipeline.

---

Dashboards typically need to display data at multiple granularities: a 1-hour view shows per-minute data, a 7-day view shows per-hour data, and a 1-year view shows per-day data. Serving all these efficiently from a single ClickHouse schema requires a tiered storage and rollup strategy.

## The Multi-Granularity Problem

```text
- Raw data: billions of rows, seconds resolution
- 1-minute rollup: millions of rows
- 1-hour rollup: hundreds of thousands of rows
- 1-day rollup: tens of thousands of rows

Without rollups: every query scans billions of rows
With rollups: queries scan the smallest appropriate table
```

## Schema Design: Tiered Tables

```sql
-- Tier 1: Raw data (30-day retention)
CREATE TABLE metrics_raw (
    timestamp DateTime64(3),
    service LowCardinality(String),
    metric LowCardinality(String),
    value Float64
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service, metric, timestamp)
TTL toDateTime(timestamp) + INTERVAL 30 DAY;

-- Tier 2: 1-minute rollup (1-year retention)
CREATE TABLE metrics_1m (
    minute DateTime,
    service LowCardinality(String),
    metric LowCardinality(String),
    sum_value SimpleAggregateFunction(sum, Float64),
    min_value SimpleAggregateFunction(min, Float64),
    max_value SimpleAggregateFunction(max, Float64),
    count_value SimpleAggregateFunction(sum, UInt64)
) ENGINE = AggregatingMergeTree()
ORDER BY (service, metric, minute)
TTL minute + INTERVAL 1 YEAR;

-- Tier 3: 1-hour rollup (5-year retention)
CREATE TABLE metrics_1h (
    hour DateTime,
    service LowCardinality(String),
    metric LowCardinality(String),
    sum_value SimpleAggregateFunction(sum, Float64),
    min_value SimpleAggregateFunction(min, Float64),
    max_value SimpleAggregateFunction(max, Float64),
    count_value SimpleAggregateFunction(sum, UInt64)
) ENGINE = AggregatingMergeTree()
ORDER BY (service, metric, hour)
TTL hour + INTERVAL 5 YEAR;
```

## Materialized Views to Fill Each Tier

```sql
-- Raw -> 1-minute
CREATE MATERIALIZED VIEW metrics_1m_mv TO metrics_1m AS
SELECT
    toStartOfMinute(timestamp) AS minute,
    service,
    metric,
    sum(value) AS sum_value,
    min(value) AS min_value,
    max(value) AS max_value,
    count() AS count_value
FROM metrics_raw
GROUP BY minute, service, metric;

-- Raw -> 1-hour (can also be done from metrics_1m)
CREATE MATERIALIZED VIEW metrics_1h_mv TO metrics_1h AS
SELECT
    toStartOfHour(timestamp) AS hour,
    service,
    metric,
    sum(value) AS sum_value,
    min(value) AS min_value,
    max(value) AS max_value,
    count() AS count_value
FROM metrics_raw
GROUP BY hour, service, metric;
```

## Smart Query Routing

Route queries to the appropriate tier based on time range:

```sql
-- Use raw for last hour, 1m rollup for up to 30 days, 1h for older
SELECT
    bucket,
    avg_value
FROM (
    -- Last 1 hour: use raw
    SELECT
        toStartOfMinute(timestamp) AS bucket,
        avg(value) AS avg_value
    FROM metrics_raw
    WHERE timestamp >= now() - INTERVAL 1 HOUR
      AND service = 'api' AND metric = 'latency'
    GROUP BY bucket

    UNION ALL

    -- 1 to 24 hours: use 1m rollup
    SELECT
        minute AS bucket,
        sum(sum_value) / sum(count_value) AS avg_value
    FROM metrics_1m
    WHERE minute >= now() - INTERVAL 24 HOUR
      AND minute < now() - INTERVAL 1 HOUR
      AND service = 'api' AND metric = 'latency'
    GROUP BY bucket
)
ORDER BY bucket;
```

## Using MERGE Engine for Transparent Multi-Tier Queries

```sql
CREATE TABLE metrics_all AS metrics_raw
ENGINE = Merge(currentDatabase(), '^metrics_');
```

## Summary

Multi-granularity schemas in ClickHouse use tiered tables with different retentions, linked by materialized views. Raw data serves recent, high-resolution queries; rolled-up tables serve longer time ranges at reduced resolution. This strategy reduces query cost by orders of magnitude while retaining the ability to drill down into recent raw data.
