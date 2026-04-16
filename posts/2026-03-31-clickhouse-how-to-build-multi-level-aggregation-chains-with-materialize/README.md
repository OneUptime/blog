# How to Build Multi-Level Aggregation Chains with Materialized Views

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Aggregation, Performance

Description: Build multi-level aggregation chains in ClickHouse using chained Materialized Views to pre-aggregate data from raw events to hourly, daily, and monthly rollups.

---

## Overview

A multi-level aggregation chain is a series of Materialized Views where each level reads from the previous level's output. This creates a pipeline:

```text
raw_events -> mv_hourly (hourly rollup) -> mv_daily (daily rollup) -> mv_monthly (monthly rollup)
```

Each level dramatically reduces data volume, making higher-level queries extremely fast.

## Step 1 - Create the Raw Events Table

```sql
CREATE TABLE raw_events (
    event_time DateTime,
    user_id UInt64,
    event_type LowCardinality(String),
    country LowCardinality(String),
    revenue Decimal64(2)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, user_id, event_time);
```

## Step 2 - Create the Hourly Aggregation Table

Use `AggregatingMergeTree` for intermediate aggregation tables:

```sql
CREATE TABLE hourly_stats (
    hour DateTime,
    event_type LowCardinality(String),
    country LowCardinality(String),
    event_count AggregateFunction(count),
    unique_users AggregateFunction(uniq, UInt64),
    total_revenue AggregateFunction(sum, Decimal64(2))
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, event_type, country);
```

## Step 3 - Create the Hourly Materialized View

```sql
CREATE MATERIALIZED VIEW mv_hourly_stats TO hourly_stats AS
SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    country,
    countState() AS event_count,
    uniqState(user_id) AS unique_users,
    sumState(revenue) AS total_revenue
FROM raw_events
GROUP BY hour, event_type, country;
```

## Step 4 - Create the Daily Aggregation Table

```sql
CREATE TABLE daily_stats (
    day Date,
    event_type LowCardinality(String),
    country LowCardinality(String),
    event_count AggregateFunction(count),
    unique_users AggregateFunction(uniq, UInt64),
    total_revenue AggregateFunction(sum, Decimal64(2))
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (day, event_type, country);
```

## Step 5 - Create the Daily Materialized View (Chained from Hourly)

The daily MV reads from the hourly table - not from raw_events:

```sql
CREATE MATERIALIZED VIEW mv_daily_stats TO daily_stats AS
SELECT
    toDate(hour) AS day,
    event_type,
    country,
    countMergeState(event_count) AS event_count,
    uniqMergeState(unique_users) AS unique_users,
    sumMergeState(total_revenue) AS total_revenue
FROM hourly_stats
GROUP BY day, event_type, country;
```

Note the use of `countMergeState`, `uniqMergeState`, `sumMergeState` - these merge existing aggregate states from the hourly level.

## Step 6 - Create the Monthly Aggregation Table and View

```sql
CREATE TABLE monthly_stats (
    month Date,
    event_type LowCardinality(String),
    country LowCardinality(String),
    event_count AggregateFunction(count),
    unique_users AggregateFunction(uniq, UInt64),
    total_revenue AggregateFunction(sum, Decimal64(2))
) ENGINE = AggregatingMergeTree()
PARTITION BY toYear(month)
ORDER BY (month, event_type, country);

CREATE MATERIALIZED VIEW mv_monthly_stats TO monthly_stats AS
SELECT
    toStartOfMonth(day) AS month,
    event_type,
    country,
    countMergeState(event_count) AS event_count,
    uniqMergeState(unique_users) AS unique_users,
    sumMergeState(total_revenue) AS total_revenue
FROM daily_stats
GROUP BY month, event_type, country;
```

## Step 7 - Querying Each Level

```sql
-- Query hourly data (fast - uses hourly_stats)
SELECT
    hour,
    event_type,
    countMerge(event_count) AS total_events,
    uniqMerge(unique_users) AS users,
    sumMerge(total_revenue) AS revenue
FROM hourly_stats
WHERE hour >= now() - INTERVAL 24 HOUR
GROUP BY hour, event_type
ORDER BY hour;

-- Query daily data (very fast)
SELECT
    day,
    country,
    countMerge(event_count) AS total_events,
    uniqMerge(unique_users) AS users,
    sumMerge(total_revenue) AS revenue
FROM daily_stats
WHERE day >= today() - 30
GROUP BY day, country
ORDER BY day;

-- Query monthly data (extremely fast)
SELECT
    month,
    sumMerge(total_revenue) AS revenue,
    uniqMerge(unique_users) AS users
FROM monthly_stats
WHERE month >= toStartOfMonth(today() - INTERVAL 12 MONTH)
GROUP BY month
ORDER BY month;
```

## Step 8 - Backfilling Historical Data

When you create the chain, populate historical data:

```sql
-- Backfill hourly from raw
INSERT INTO hourly_stats
SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    country,
    countState() AS event_count,
    uniqState(user_id) AS unique_users,
    sumState(revenue) AS total_revenue
FROM raw_events
GROUP BY hour, event_type, country;

-- Backfill daily from hourly
INSERT INTO daily_stats
SELECT
    toDate(hour) AS day,
    event_type,
    country,
    countMergeState(event_count) AS event_count,
    uniqMergeState(unique_users) AS unique_users,
    sumMergeState(total_revenue) AS total_revenue
FROM hourly_stats
GROUP BY day, event_type, country;
```

## Performance Comparison

```sql
-- Raw table query: reads millions of rows
SELECT toDate(event_time) AS date, count() FROM raw_events
WHERE toYYYYMM(event_time) = 202401
GROUP BY date;

-- Monthly stats query: reads a handful of rows
SELECT month, countMerge(event_count) FROM monthly_stats
WHERE toYear(month) = 2024
GROUP BY month;
```

## Summary

Multi-level aggregation chains in ClickHouse use `AggregatingMergeTree` tables at each level with chained Materialized Views that use `*MergeState` and `*Merge` functions to compose aggregate states. This reduces query times from seconds to milliseconds for high-level rollups. Always backfill historical data after creating the chain, and use `countMerge`/`uniqMerge`/`sumMerge` at query time to finalize the aggregate states.
