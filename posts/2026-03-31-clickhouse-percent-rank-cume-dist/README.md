# How to Use PERCENT_RANK() and CUME_DIST() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, SQL, Analytics, Distribution

Description: Learn how PERCENT_RANK() and CUME_DIST() compute relative rank fractions in ClickHouse, with examples for percentile analysis and cumulative distribution reporting.

---

`PERCENT_RANK()` and `CUME_DIST()` are window functions that express a row's position within its partition as a fraction between 0 and 1. They differ from `RANK()` and `DENSE_RANK()` (which return integers) and from `NTILE()` (which assigns bucket numbers). These functions are particularly useful for percentile analysis, understanding the distribution of a metric, and building cumulative distribution function (CDF) charts. ClickHouse supports both natively.

## Syntax

```text
PERCENT_RANK() OVER ([PARTITION BY ...] ORDER BY ...)
CUME_DIST()    OVER ([PARTITION BY ...] ORDER BY ...)
```

Neither function takes arguments. The fractions are derived entirely from the `ORDER BY` expression within the window.

## The Formulas

Understanding the mathematical definition helps interpret results:

```text
PERCENT_RANK() = (rank - 1) / (total_rows_in_partition - 1)

CUME_DIST()    = number_of_rows_with_value <= current_value
                 / total_rows_in_partition
```

Key differences:
- `PERCENT_RANK()` ranges from 0.0 to 1.0. The first row always has value 0.0; the last always has value 1.0.
- `CUME_DIST()` ranges from just above 0 to 1.0. The last row always has value 1.0. Tied rows get the same value.
- `CUME_DIST()` counts peers (tied rows) as "at or below" the current row; `PERCENT_RANK()` gives tied rows the same fractional rank but does not count the full group.

## Side-by-Side Comparison

The best way to understand both functions is to compare their outputs on the same data:

```sql
SELECT
    player_name,
    score,
    RANK()         OVER (ORDER BY score ASC) AS rank,
    PERCENT_RANK() OVER (ORDER BY score ASC) AS percent_rank,
    CUME_DIST()    OVER (ORDER BY score ASC) AS cume_dist
FROM player_scores
ORDER BY score ASC;
```

Given scores 60, 70, 70, 80, 100 (5 rows):

```text
player_name | score | rank | percent_rank | cume_dist
------------|-------|------|--------------|----------
Eve         |    60 |    1 |         0.00 |      0.20
Carol       |    70 |    2 |         0.25 |      0.60
Dave        |    70 |    2 |         0.25 |      0.60
Bob         |    80 |    4 |         0.75 |      0.80
Alice       |   100 |    5 |         1.00 |      1.00
```

Carol and Dave both have `percent_rank = 0.25` and `cume_dist = 0.60`. `CUME_DIST()` counts both tied rows in the numerator; `PERCENT_RANK()` uses the rank minus 1.

## Finding Which Percentile a Row Falls Into

Multiply `PERCENT_RANK()` by 100 to get the percentile position:

```sql
SELECT
    user_id,
    response_time_ms,
    ROUND(PERCENT_RANK() OVER (ORDER BY response_time_ms ASC) * 100, 1)
        AS percentile_position
FROM api_response_times
WHERE request_date = today() - 1
ORDER BY response_time_ms;
```

A row with `percentile_position = 95.0` is at the 95th percentile - 95% of requests were faster or equal.

## Identifying Users Above a Percentile Threshold

Filter using `PERCENT_RANK()` to find the users in the top 10% by spend:

```sql
SELECT
    customer_id,
    customer_name,
    total_spend,
    ROUND(PERCENT_RANK() OVER (ORDER BY total_spend ASC) * 100, 1) AS spend_percentile
FROM customer_summary
WHERE spend_percentile >= 90
ORDER BY total_spend DESC;
```

Note: you must use a subquery to filter on the window function result, because window functions cannot appear in `WHERE` clauses directly:

```sql
SELECT
    customer_id,
    customer_name,
    total_spend,
    spend_percentile
FROM (
    SELECT
        customer_id,
        customer_name,
        total_spend,
        ROUND(PERCENT_RANK() OVER (ORDER BY total_spend ASC) * 100, 1) AS spend_percentile
    FROM customer_summary
)
WHERE spend_percentile >= 90
ORDER BY total_spend DESC;
```

## Per-Partition Percentile Analysis

Use `PARTITION BY` to compute percentile ranks independently per group. This shows where each employee's salary falls within their department:

```sql
SELECT
    department,
    employee_name,
    salary,
    ROUND(PERCENT_RANK() OVER (
        PARTITION BY department
        ORDER BY salary ASC
    ) * 100, 1) AS dept_salary_percentile,
    ROUND(CUME_DIST() OVER (
        PARTITION BY department
        ORDER BY salary ASC
    ) * 100, 1) AS dept_salary_cume_dist_pct
FROM employees
ORDER BY department, salary;
```

An employee at the 80th percentile within their department earns more than 80% of their colleagues.

## Building a Cumulative Distribution Function

`CUME_DIST()` directly produces the CDF when each row represents one observation. When you bucket data with `GROUP BY`, each row represents a bucket rather than an individual observation, so `CUME_DIST()` would give the fraction of buckets at or below a value — not the fraction of requests. Instead, use a cumulative sum of counts divided by the total:

```sql
SELECT
    response_time_bucket,
    request_count,
    ROUND(SUM(request_count) OVER (
        ORDER BY response_time_bucket ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) * 100.0 / SUM(request_count) OVER (), 2) AS cdf_pct
FROM (
    SELECT
        intDiv(response_time_ms, 10) * 10 AS response_time_bucket,
        COUNT()                            AS request_count
    FROM api_response_times
    WHERE request_date = today() - 1
    GROUP BY response_time_bucket
)
ORDER BY response_time_bucket;
```

The result shows, for each latency bucket, what percentage of requests were at or below that latency - directly readable as a CDF chart.

## Comparing PERCENT_RANK() with quantile() Functions

`PERCENT_RANK()` tells you where a specific observed value falls in the distribution. ClickHouse's `quantile()` family works the other way: given a fraction, it returns the value at that percentile. Use them together for a complete picture:

```sql
-- PERCENT_RANK approach: for each observed response time, what percentile is it?
SELECT
    user_id,
    response_time_ms,
    ROUND(PERCENT_RANK() OVER (ORDER BY response_time_ms ASC) * 100, 1) AS percentile
FROM api_response_times
WHERE request_date = today() - 1
ORDER BY response_time_ms DESC
LIMIT 20;
```

```sql
-- quantile approach: what response time threshold corresponds to each percentile?
SELECT
    quantile(0.50)(response_time_ms) AS p50,
    quantile(0.90)(response_time_ms) AS p90,
    quantile(0.95)(response_time_ms) AS p95,
    quantile(0.99)(response_time_ms) AS p99
FROM api_response_times
WHERE request_date = today() - 1;
```

## Segmenting by Relative Position

Use `PERCENT_RANK()` to assign descriptive segments based on relative performance, without needing to know absolute thresholds in advance:

```sql
SELECT
    store_id,
    region,
    monthly_revenue,
    ROUND(PERCENT_RANK() OVER (ORDER BY monthly_revenue ASC) * 100, 1) AS revenue_percentile,
    CASE
        WHEN PERCENT_RANK() OVER (ORDER BY monthly_revenue ASC) >= 0.90 THEN 'Top 10%'
        WHEN PERCENT_RANK() OVER (ORDER BY monthly_revenue ASC) >= 0.75 THEN 'Upper Quartile'
        WHEN PERCENT_RANK() OVER (ORDER BY monthly_revenue ASC) >= 0.25 THEN 'Middle 50%'
        ELSE 'Bottom Quartile'
    END AS performance_segment
FROM store_monthly_summary
WHERE report_month = '2025-12-01'
ORDER BY monthly_revenue DESC;
```

## Summary

`PERCENT_RANK()` and `CUME_DIST()` are the fractional-ranking window functions in ClickHouse. `PERCENT_RANK()` gives each row a relative rank from 0 (lowest) to 1 (highest), computed as `(rank - 1) / (n - 1)`. `CUME_DIST()` gives the proportion of rows at or below the current value, ranging from just above 0 to exactly 1. Use `PERCENT_RANK()` to determine what percentile an individual observation falls into. Use `CUME_DIST()` to build cumulative distribution functions or to understand how a value compares to the entire population. Both support `PARTITION BY` for per-group distribution analysis and work alongside ClickHouse's `quantile()` aggregate functions for comprehensive distribution reporting.
