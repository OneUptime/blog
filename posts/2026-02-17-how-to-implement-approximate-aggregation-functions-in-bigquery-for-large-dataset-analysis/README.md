# How to Use Approximate Aggregation Functions in BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, SQL, Approximate Aggregation, Data Analytics

Description: Learn how to use BigQuery approximate aggregation functions like APPROX_COUNT_DISTINCT and APPROX_QUANTILES to analyze large datasets faster and cheaper.

---

When you are working with datasets that have billions of rows, exact aggregations can be expensive and slow. BigQuery offers approximate aggregation functions that trade a small amount of accuracy for significant improvements in speed and slot usage. If you need an exact count of unique users down to the last digit, these are not for you. But if knowing "approximately 14.2 million unique users" is good enough, approximate functions can make large analytical queries much faster.

## Why Approximate Aggregation

Exact COUNT DISTINCT on a billion-row table requires BigQuery to track every unique value. That means shuffling massive amounts of data across slots and holding it all in memory. Approximate functions use probabilistic data structures (like HyperLogLog++) that require far less memory and computation.

The trade-off is straightforward: approximate functions are faster, consume fewer slot-hours, and produce results that have statistical uncertainty instead of exact answers.

## APPROX_COUNT_DISTINCT

This is the most commonly used approximate function. It estimates the number of distinct values in a column without requiring BigQuery to return an exact `COUNT(DISTINCT ...)` result.

```sql
-- Exact count distinct - expensive on large tables
SELECT COUNT(DISTINCT user_id) AS exact_unique_users
FROM `my_project.analytics.events`
WHERE event_date BETWEEN '2025-01-01' AND '2025-12-31';

-- Approximate count distinct - usually faster on huge inputs
SELECT APPROX_COUNT_DISTINCT(user_id) AS approx_unique_users
FROM `my_project.analytics.events`
WHERE event_date BETWEEN '2025-01-01' AND '2025-12-31';
```

On a table with a billion rows, the approximate version can run faster and use less memory than the exact version. The result is a statistical estimate, so measure the error on your own data before using it in production reporting.

Here is a practical comparison to show the accuracy:

```sql
-- Side-by-side comparison of exact vs approximate counts
-- Run this on a sample to build confidence in the accuracy
SELECT
  event_date,
  COUNT(DISTINCT user_id) AS exact_count,
  APPROX_COUNT_DISTINCT(user_id) AS approx_count,
  ROUND(
    ABS(COUNT(DISTINCT user_id) - APPROX_COUNT_DISTINCT(user_id))
    / COUNT(DISTINCT user_id) * 100, 4
  ) AS error_pct
FROM `my_project.analytics.events`
WHERE event_date BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY event_date
ORDER BY event_date;
```

## APPROX_QUANTILES

When you need percentile values (median, p95, p99), exact computation requires sorting the entire dataset. APPROX_QUANTILES provides fast approximate percentiles.

```sql
-- Calculate approximate percentiles for response times
-- The second argument (100) means divide into 100 quantiles (percentiles)
SELECT
  service_name,
  APPROX_QUANTILES(response_time_ms, 100)[OFFSET(50)] AS p50_latency,
  APPROX_QUANTILES(response_time_ms, 100)[OFFSET(90)] AS p90_latency,
  APPROX_QUANTILES(response_time_ms, 100)[OFFSET(95)] AS p95_latency,
  APPROX_QUANTILES(response_time_ms, 100)[OFFSET(99)] AS p99_latency
FROM `my_project.monitoring.requests`
WHERE request_date = CURRENT_DATE()
GROUP BY service_name
ORDER BY p99_latency DESC;
```

The function returns an array of values at each quantile boundary. `OFFSET(50)` gives you the median (p50), `OFFSET(99)` gives you the 99th percentile.

You can also get finer granularity:

```sql
-- 1000 quantiles for more precise percentile values
-- Useful when you need p99.9 or other fine-grained percentiles
SELECT
  APPROX_QUANTILES(response_time_ms, 1000)[OFFSET(999)] AS p999_latency
FROM `my_project.monitoring.requests`
WHERE request_date = CURRENT_DATE();
```

## APPROX_TOP_COUNT

This function finds the most frequent values in a column. Instead of doing a full GROUP BY and ORDER BY, it uses a probabilistic algorithm to find approximate top-N values.

```sql
-- Find the top 20 most common error messages
-- Much faster than GROUP BY + ORDER BY + LIMIT on large tables
SELECT
  approx.value AS error_message,
  approx.count AS approximate_count
FROM
  UNNEST(
    (SELECT APPROX_TOP_COUNT(error_message, 20)
     FROM `my_project.logs.application_errors`
     WHERE log_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
  ) AS approx
ORDER BY approx.count DESC;
```

This is particularly useful for exploratory analysis. When you have a column with millions of distinct values and want to quickly find the most common ones, APPROX_TOP_COUNT can be much faster than an exact aggregation.

## APPROX_TOP_SUM

Similar to APPROX_TOP_COUNT, but instead of counting occurrences, it sums a weight column:

```sql
-- Find the top 10 products by approximate total revenue
-- Faster than exact GROUP BY for very large tables
SELECT
  approx.value AS product_id,
  approx.sum AS approximate_revenue
FROM
  UNNEST(
    (SELECT APPROX_TOP_SUM(product_id, revenue, 10)
     FROM `my_project.sales.transactions`
     WHERE transaction_date >= '2025-01-01')
  ) AS approx
ORDER BY approx.sum DESC;
```

## Combining Approximate Functions in Dashboards

Approximate functions shine in dashboard queries where you need fast results across large datasets. Here is a dashboard query that combines several:

```sql
-- Dashboard summary query using approximate functions
-- Fast enough for near-real-time dashboards on billion-row tables
SELECT
  DATE_TRUNC(event_timestamp, HOUR) AS hour,
  APPROX_COUNT_DISTINCT(user_id) AS unique_users,
  APPROX_COUNT_DISTINCT(session_id) AS unique_sessions,
  COUNT(*) AS total_events,
  APPROX_QUANTILES(page_load_ms, 100)[OFFSET(50)] AS median_page_load,
  APPROX_QUANTILES(page_load_ms, 100)[OFFSET(95)] AS p95_page_load
FROM `my_project.analytics.page_views`
WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY hour
ORDER BY hour;
```

## Using HLL_COUNT for Mergeable Sketches

For more advanced use cases, BigQuery provides HyperLogLog++ sketch functions that let you pre-aggregate distinct count sketches and merge them later. This is incredibly powerful for building rollup tables.

```sql
-- Step 1: Create daily sketches (pre-aggregate)
-- Store these in a rollup table for fast querying
CREATE OR REPLACE TABLE `my_project.analytics.daily_user_sketches` AS
SELECT
  event_date,
  country,
  HLL_COUNT.INIT(user_id) AS user_sketch
FROM `my_project.analytics.events`
GROUP BY event_date, country;
```

```sql
-- Step 2: Merge sketches to get weekly unique users per country
-- This is extremely fast because it works on pre-aggregated sketches
SELECT
  country,
  HLL_COUNT.MERGE(user_sketch) AS weekly_unique_users
FROM `my_project.analytics.daily_user_sketches`
WHERE event_date BETWEEN '2025-01-01' AND '2025-01-07'
GROUP BY country
ORDER BY weekly_unique_users DESC;
```

The key insight is that HLL sketches are mergeable. You can compute daily sketches, store them, and merge them for any date range. This avoids rescanning the raw data entirely.

```sql
-- Merge sketches to extract the approximate count
SELECT
  country,
  HLL_COUNT.MERGE(user_sketch) AS unique_users
FROM `my_project.analytics.daily_user_sketches`
WHERE event_date BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY country
ORDER BY unique_users DESC;
```

## When to Use Exact vs Approximate

Use exact aggregations when you need precise numbers for financial reporting, billing, or compliance. Exact results are also fine when your dataset is small enough that performance is not an issue.

Use approximate aggregations for exploratory analysis, dashboards, monitoring, and any situation where a small error margin is acceptable. The bigger your dataset, the more beneficial approximate functions become.

A good rule of thumb: if the query processes less than 100 million rows, exact aggregations are usually fast enough. Above that, especially in the billions, approximate functions can provide meaningful latency and slot-usage benefits.

## Cost Impact

On BigQuery's on-demand pricing model, you pay per byte read. Approximate functions often scan the same amount of data but process it faster using less computation, so they do not necessarily lower the billed bytes for a query. Where you see the biggest cost savings is with capacity-based pricing, including BigQuery editions, because approximate functions can consume fewer slot-hours and free up slots for other queries.

For large organizations running thousands of dashboard queries daily on multi-terabyte datasets, switching to approximate aggregations where acceptable can reduce slot consumption and improve dashboard latency. That is real value at scale, and the accuracy trade-off is often worth it for analytical workloads.
