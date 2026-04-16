# How to Use Aggregate Function Combinators (-If, -Array, -Map) in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Combinator, Aggregation, SQL, Analytics

Description: Learn how to use ClickHouse aggregate function combinators -If, -Array, and -Map to extend aggregate functions with conditional, array, and map-based logic.

---

## Overview

ClickHouse aggregate function combinators are suffixes that modify the behavior of existing aggregate functions. The most commonly used are `-If` (conditional aggregation), `-Array` (aggregating array elements), and `-Map` (aggregating map values). They eliminate the need for subqueries or multiple passes over data.

## The -If Combinator

Add a condition as an extra argument to any aggregate function:

```sql
SELECT
    countIf(status_code >= 500)          AS error_count,
    sumIf(bytes, status_code = 200)      AS success_bytes,
    avgIf(latency_ms, endpoint = '/api') AS api_avg_latency
FROM http_access_log
WHERE event_date = today();
```

This is equivalent to using `CASE WHEN` inside the aggregate, but more readable.

## -If with Multiple Conditions

```sql
SELECT
    uniqIf(user_id, country = 'US')     AS us_users,
    uniqIf(user_id, country = 'GB')     AS gb_users,
    uniqIf(user_id, device = 'mobile')  AS mobile_users
FROM sessions;
```

## The -Array Combinator

Aggregates over all elements within array columns across rows:

```sql
-- Sum of all numbers in each row's array, then totalled
SELECT sumArray(tags_weights) AS total_weight
FROM documents;

-- Count total elements across all arrays
SELECT countArray(tags) AS total_tags
FROM articles;
```

## -Array with Grouping

```sql
SELECT
    category,
    sumArray(prices) AS total_revenue
FROM orders
GROUP BY category;
```

Each row may have an array of item prices; `-Array` flattens and aggregates them all.

## The -Map Combinator

Aggregates values of a `Map` column by key:

```sql
-- Sum map values per key across all rows
SELECT sumMap(counters) AS aggregated_counters
FROM metric_samples;
```

When applied to a `Map` column via the `-Map` combinator, this returns a `Map` type with aggregated values per key.

## Combining -Map with Grouping

```sql
SELECT
    service,
    sumMap(request_counts) AS total_by_endpoint
FROM service_metrics
WHERE event_date = today()
GROUP BY service;
```

## -Map for Multi-Dimensional Metrics

```sql
CREATE TABLE service_metrics (
    ts       DateTime,
    service  String,
    metrics  Map(String, Float64)
) ENGINE = MergeTree()
ORDER BY (service, ts);

INSERT INTO service_metrics VALUES
    (now(), 'api', map('requests', 100, 'errors', 5)),
    (now(), 'api', map('requests', 120, 'errors', 3));

SELECT service, sumMap(metrics) FROM service_metrics GROUP BY service;
```

```text
service | sumMap(metrics)
api     | {'requests':220,'errors':8}
```

## Chaining Combinators

Some combinators can be combined. For example, `-ArrayIf` would aggregate array elements conditionally - though not all combinations are supported:

```sql
-- Not all chains are valid; check ClickHouse docs
SELECT groupArrayIf(user_id, active = 1) AS active_users
FROM users;
```

## Practical Pivot Pattern with -If

```sql
SELECT
    toDate(event_time)                    AS date,
    sumIf(revenue, plan = 'basic')        AS basic_rev,
    sumIf(revenue, plan = 'pro')          AS pro_rev,
    sumIf(revenue, plan = 'enterprise')   AS enterprise_rev
FROM subscriptions
GROUP BY date
ORDER BY date DESC
LIMIT 30;
```

## Summary

ClickHouse aggregate combinators extend the power of built-in aggregates without extra subqueries. The `-If` combinator adds conditional filtering, `-Array` flattens and aggregates array elements, and `-Map` aggregates Map column values by key. Together they enable pivot tables, multi-dimensional metrics, and conditional analytics in a single query pass.
