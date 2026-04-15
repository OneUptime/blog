# How to Use uniq() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, uniq, Count Distinct, Approximate Count

Description: Learn how uniq() computes approximate distinct counts in ClickHouse, and when to prefer it over uniqExact() for performance at scale.

---

Counting distinct values is one of the most common operations in analytics. In ClickHouse, `uniq()` provides an approximate count of distinct values using a compact internal algorithm. It is significantly faster and uses far less memory than `uniqExact()`, making it the preferred choice for high-cardinality columns on large datasets where a small margin of error is acceptable.

## Basic Syntax

```sql
-- Approximate count of distinct users
SELECT uniq(user_id) AS approx_distinct_users
FROM page_views;
```

You can pass multiple columns to count distinct combinations:

```sql
-- Count distinct (user_id, session_id) pairs
SELECT uniq(user_id, session_id) AS distinct_sessions
FROM page_views;
```

## How uniq() Works

`uniq()` uses an internal approximation algorithm to estimate distinct counts. The key properties are:

- Memory usage: uses a small, bounded amount of state per aggregation group, regardless of cardinality
- Error rate: typically within a few percent of the true count
- Mergeability: the aggregate state can be merged across shards

```sql
-- Even on a billion-row table, memory is bounded
SELECT uniq(visitor_id) AS approx_visitors
FROM clickstream
WHERE event_date >= today() - 30;
```

## uniq() vs uniqExact()

```sql
-- Approximate: fast, low memory, ~2% error
SELECT uniq(user_id) AS approx_count
FROM events;

-- Exact: slower, higher memory, no error
SELECT uniqExact(user_id) AS exact_count
FROM events;
```

For most analytics use cases - daily active users, funnel analysis, traffic counts - a 2% approximation is entirely acceptable and the performance gain is substantial at scale.

## Grouping with uniq()

```sql
-- Daily distinct active users per product
SELECT
    toDate(event_time)  AS date,
    product,
    uniq(user_id)       AS dau
FROM user_events
WHERE event_date >= today() - 30
GROUP BY date, product
ORDER BY date DESC, dau DESC;
```

```sql
-- Distinct IP addresses per hour for anomaly detection
SELECT
    toStartOfHour(timestamp) AS hour,
    uniq(ip_address)         AS distinct_ips,
    count()                  AS total_requests
FROM access_logs
WHERE event_date = today()
GROUP BY hour
ORDER BY hour DESC;
```

## Combining with Other Aggregates

```sql
-- Session metrics with approximate distinct counts
SELECT
    campaign_id,
    count()           AS total_events,
    uniq(user_id)     AS unique_users,
    uniq(session_id)  AS unique_sessions,
    uniq(session_id) / uniq(user_id) AS avg_sessions_per_user
FROM marketing_events
WHERE event_date >= today() - 7
GROUP BY campaign_id
ORDER BY unique_users DESC;
```

## Using uniq() in Materialized Views

```sql
-- Materialized view accumulating distinct user state
CREATE MATERIALIZED VIEW dau_mv
ENGINE = AggregatingMergeTree()
ORDER BY (date, country)
AS
SELECT
    toDate(event_time) AS date,
    country,
    uniqState(user_id) AS users_state
FROM user_events
GROUP BY date, country;

-- Query the merged approximate count
SELECT
    date,
    country,
    uniqMerge(users_state) AS dau
FROM dau_mv
GROUP BY date, country
ORDER BY date DESC;
```

## Accuracy and When to Use uniqExact()

```sql
-- Check the gap between approximate and exact
SELECT
    uniq(user_id)      AS approx_users,
    uniqExact(user_id) AS exact_users,
    exact_users - approx_users AS difference
FROM user_events
WHERE event_date = today();
```

Prefer `uniqExact()` when:
- You are billing or auditing based on distinct counts
- The dataset is small enough that exact counting is fast
- Regulatory requirements demand precise figures

For everything else - dashboards, exploration, alerting - `uniq()` is the right default.

## Summary

`uniq()` provides fast, memory-efficient approximate distinct counting in ClickHouse, with typical error rates around 2%. It is the standard choice for high-cardinality analytics queries where speed matters more than exact precision. Use `uniqState()` and `uniqMerge()` in materialized views for incremental distinct count tracking, and reserve `uniqExact()` for cases where an exact answer is required.
