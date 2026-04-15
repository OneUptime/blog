# How to Build Unique Visitor Counting with Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Unique Visitor, AggregatingMergeTree, Approximate Count

Description: Count unique visitors efficiently in ClickHouse using materialized views and aggregate states for approximate distinct counts.

---

## The Unique Counting Problem

Counting distinct users across billions of events is expensive. `uniqExact()` requires storing all unique values in memory. For real-time dashboards showing daily active users (DAU), weekly active users (WAU), and monthly active users (MAU), you need a pre-aggregated approach.

## AggregatingMergeTree for Unique Counts

ClickHouse's `AggregatingMergeTree` engine stores aggregate function states and merges them on query. This enables exact or approximate distinct counts on pre-aggregated data.

```sql
CREATE TABLE page_visits
(
    event_time DateTime,
    user_id UInt64,
    page LowCardinality(String),
    country LowCardinality(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (page, event_time);
```

## Daily Unique Visitor Materialized View

```sql
-- Target: AggregatingMergeTree with an approximate distinct state
CREATE TABLE daily_unique_visitors
(
    visit_date Date,
    page LowCardinality(String),
    country LowCardinality(String),
    users_sketch AggregateFunction(uniq, UInt64)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(visit_date)
ORDER BY (visit_date, page, country);

-- Materialized view populates the sketch
CREATE MATERIALIZED VIEW daily_uv_mv
TO daily_unique_visitors
AS
SELECT
    toDate(event_time) AS visit_date,
    page,
    country,
    uniqState(user_id) AS users_sketch
FROM page_visits
GROUP BY visit_date, page, country;
```

## Query Unique Visitors

```sql
-- DAU for the last 30 days
SELECT
    visit_date,
    uniqMerge(users_sketch) AS daily_active_users
FROM daily_unique_visitors
WHERE visit_date >= today() - 30
GROUP BY visit_date
ORDER BY visit_date;
```

```sql
-- WAU: Merge sketches across 7-day windows
SELECT
    toMonday(visit_date) AS week,
    uniqMerge(users_sketch) AS weekly_active_users
FROM daily_unique_visitors
WHERE visit_date >= today() - 84
GROUP BY week
ORDER BY week;
```

## Cross-Dimension Unique Counts

One benefit of storing sketches: you can merge across any dimension combination:

```sql
-- Unique visitors by country, last 7 days
SELECT
    country,
    uniqMerge(users_sketch) AS unique_visitors
FROM daily_unique_visitors
WHERE visit_date >= today() - 7
GROUP BY country
ORDER BY unique_visitors DESC
LIMIT 20;
```

```sql
-- Unique visitors per page, with exact counts for small pages
SELECT
    page,
    uniqMerge(users_sketch) AS approx_unique_visitors
FROM daily_unique_visitors
WHERE visit_date = today() - 1
GROUP BY page
ORDER BY approx_unique_visitors DESC;
```

## Exact vs Approximate

For use cases requiring exact counts (billing, compliance):

```sql
CREATE TABLE daily_unique_visitors_exact
(
    visit_date Date,
    page LowCardinality(String),
    users_sketch AggregateFunction(uniqExact, UInt64)
)
ENGINE = AggregatingMergeTree
ORDER BY (visit_date, page);
```

Note: `uniqExact` uses significantly more memory than `uniq`. Use `uniq` for dashboards and `uniqExact` only when precision is required.

## Summary

Use AggregatingMergeTree with `uniqState` / `uniqMerge` to maintain unique visitor counts in ClickHouse materialized views. This pattern pre-computes mergeable approximate distinct states at insert time, allowing DAU, WAU, and MAU calculations to return in milliseconds. States are mergeable across dimensions, so one daily materialized view supports country and page breakdowns without additional queries.
