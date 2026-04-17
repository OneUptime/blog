# How to Use Data Sampling to Reduce ClickHouse Query Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Sampling, Query Optimization, Cost Optimization, Analytics

Description: Use ClickHouse SAMPLE clause to run approximate analytics queries on a fraction of data, cutting query costs and latency for dashboards and explorations.

---

## Why Sampling Makes Sense

For analytical queries where exact precision is not required - like dashboards, trend analysis, or exploratory data work - scanning 1% of rows instead of 100% reduces costs by 100x with results that are statistically accurate. ClickHouse has built-in sampling support that makes this easy.

## Design Tables for Sampling

To use the SAMPLE clause, your table must define a sample key:

```sql
CREATE TABLE page_views
(
    event_time DateTime,
    user_id UInt64,
    page_path String,
    session_id UInt64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time, intHash64(user_id))
SAMPLE BY intHash64(user_id);
```

The SAMPLE BY key determines which rows belong to each sample. Using a user-based hash ensures consistent sampling across queries (the same users appear in repeated samples).

## Run Sampled Queries

```sql
-- Sample 1% of data for fast approximations
SELECT
    toDate(event_time) AS date,
    count() * 100 AS estimated_pageviews,
    uniqExact(user_id) * 100 AS estimated_unique_users
FROM page_views SAMPLE 0.01
WHERE event_time >= today() - 30
GROUP BY date
ORDER BY date;
```

```sql
-- Sample a fixed row count (useful for consistent cost)
SELECT avg(session_duration_sec)
FROM sessions SAMPLE 1000000;
```

## Sampling with Joins

Sampling is maintained across distributed joins when both tables use the same sample key:

```sql
SELECT
    p.page_path,
    count() * 100 AS est_views,
    avg(u.age) AS avg_user_age
FROM page_views AS p SAMPLE 0.01
JOIN users AS u ON p.user_id = u.user_id
GROUP BY p.page_path
ORDER BY est_views DESC
LIMIT 20;
```

## Measure Accuracy vs Speed Trade-off

```sql
-- Compare sampled vs exact results
SELECT
    'exact' AS mode,
    count() AS pageviews,
    uniqExact(user_id) AS unique_users
FROM page_views
WHERE toDate(event_time) = today() - 1

UNION ALL

SELECT
    '1% sample' AS mode,
    count() * 100 AS pageviews,
    uniqExact(user_id) * 100 AS unique_users
FROM page_views SAMPLE 0.01
WHERE toDate(event_time) = today() - 1;
```

Typical error rates: 1% sample gives ~1% statistical error for large datasets, which is acceptable for most dashboard use cases.

## Adaptive Sampling for Cost-Based Queries

For ClickHouse Cloud where you pay per byte scanned, implement adaptive sampling in your application layer:

```python
def query_with_sampling(table, where_clause, estimated_rows):
    if estimated_rows > 100_000_000:
        sample_rate = 0.01   # 1% for huge tables
    elif estimated_rows > 10_000_000:
        sample_rate = 0.1    # 10% for medium tables
    else:
        sample_rate = 1.0    # no sampling for small tables

    query = f"""
        SELECT count() * {1/sample_rate:.0f} AS estimated_count
        FROM {table} SAMPLE {sample_rate}
        WHERE {where_clause}
    """
    return query
```

## Summary

ClickHouse's built-in SAMPLE clause enables approximate analytics at a fraction of the cost and latency of full scans. Define your table with a consistent sample key, apply SAMPLE 0.01 or SAMPLE 0.1 for dashboard queries, and scale results by the inverse of the sample rate. For most analytical use cases, 1% sampling delivers results within 1-2% of exact values.
