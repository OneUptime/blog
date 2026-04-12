# How to Calculate Cumulative Distribution in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, CUME_DIST, Analytics, Distribution

Description: Learn how to calculate cumulative distribution in MySQL using CUME_DIST() and PERCENT_RANK() window functions for statistical analysis and reporting.

---

## What Is Cumulative Distribution?

The cumulative distribution function (CDF) tells you the fraction of values in a dataset that are less than or equal to a given value. In MySQL, `CUME_DIST()` computes this directly as a window function.

## CUME_DIST() Basics

`CUME_DIST()` returns a value in the range (0, 1] representing the proportion of rows with a value less than or equal to the current row. It is never 0 because the current row is always counted:

```sql
SELECT
  customer_id,
  total_spent,
  ROUND(CUME_DIST() OVER (ORDER BY total_spent), 4) AS cume_dist,
  ROUND(CUME_DIST() OVER (ORDER BY total_spent) * 100, 1) AS cume_dist_pct
FROM customer_totals
ORDER BY total_spent;
```

A `cume_dist` of 0.80 means 80% of customers spent less than or equal to this amount.

## Difference Between CUME_DIST and PERCENT_RANK

```sql
SELECT
  total_spent,
  ROUND(CUME_DIST()     OVER (ORDER BY total_spent), 4) AS cume_dist,
  ROUND(PERCENT_RANK()  OVER (ORDER BY total_spent), 4) AS pct_rank
FROM customer_totals
ORDER BY total_spent;
```

Key difference: `CUME_DIST` includes the current row in the numerator, so the maximum value is always 1.0. `PERCENT_RANK` uses `(rank - 1) / (n - 1)`, so the minimum is 0 and the maximum is 1.

## Cumulative Distribution Within Groups

Calculate CDF within each product category:

```sql
SELECT
  category,
  product_id,
  price,
  ROUND(CUME_DIST() OVER (
    PARTITION BY category
    ORDER BY price
  ), 4) AS price_cdf
FROM products
ORDER BY category, price;
```

## Finding Values at Specific Percentiles

Use `CUME_DIST` to find the value at or below the 75th percentile:

```sql
WITH cdf AS (
  SELECT
    total_spent,
    CUME_DIST() OVER (ORDER BY total_spent) AS cdf_val
  FROM customer_totals
)
SELECT MAX(total_spent) AS p75_value
FROM cdf
WHERE cdf_val <= 0.75;
```

## Cumulative Distribution Histogram

Build a frequency histogram by binning values:

```sql
WITH binned AS (
  SELECT
    FLOOR(total_spent / 100) * 100 AS bucket,
    COUNT(*) AS cnt
  FROM customer_totals
  GROUP BY bucket
),
with_cdf AS (
  SELECT
    bucket,
    cnt,
    SUM(cnt) OVER (ORDER BY bucket) AS cumulative_count,
    SUM(cnt) OVER () AS total_count
  FROM binned
)
SELECT
  bucket,
  cnt AS frequency,
  cumulative_count,
  ROUND(100.0 * cumulative_count / total_count, 1) AS cumulative_pct
FROM with_cdf
ORDER BY bucket;
```

## Response Time CDF for SLA Analysis

Apply CDF to service latency to determine what percentage of requests are under an SLA threshold:

```sql
SELECT
  response_time_ms,
  ROUND(CUME_DIST() OVER (ORDER BY response_time_ms) * 100, 2) AS pct_of_requests
FROM api_request_log
ORDER BY response_time_ms;

-- Find the 99th percentile latency
SELECT MAX(response_time_ms) AS p99_latency
FROM (
  SELECT response_time_ms,
         CUME_DIST() OVER (ORDER BY response_time_ms) AS cdf
  FROM api_request_log
) t
WHERE cdf <= 0.99;
```

## Summary

Calculate cumulative distribution in MySQL using `CUME_DIST() OVER (ORDER BY ...)`. It returns the fraction of rows at or below each value, always ending at 1.0. Use `PARTITION BY` for per-group CDFs. Combine with `FLOOR` binning to build histograms. Apply to latency data to identify SLA compliance and performance outliers.
