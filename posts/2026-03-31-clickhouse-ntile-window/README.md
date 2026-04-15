# How to Use NTILE() Window Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, SQL, Analytics, Percentile

Description: Learn how NTILE(n) divides rows into equal buckets in ClickHouse, with examples for quartile analysis, percentile bucketing, and distribution reporting.

---

`NTILE(n)` is a window function that divides an ordered set of rows into `n` roughly equal groups (called tiles or buckets) and assigns each row a bucket number from 1 to `n`. It is the simplest way to compute quartiles, quintiles, deciles, or any equal-count bucketing directly in SQL without needing pre-computed percentile thresholds. ClickHouse supports `NTILE()` as part of its window function suite.

## Syntax

```text
NTILE(n) OVER (
    [PARTITION BY partition_expr [, ...]]
    ORDER BY sort_expr [ASC | DESC] [, ...]
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

`n` must be a positive integer literal or expression. The rows within each partition are sorted by `ORDER BY` and then distributed as evenly as possible across `n` buckets. When the number of rows is not evenly divisible by `n`, the first buckets receive one extra row. ClickHouse requires the explicit frame `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` for `NTILE()`.

## How Bucket Assignment Works

Understanding the distribution logic is important for interpreting results. With 10 rows and `NTILE(4)`:

```text
Row order | NTILE(4) bucket
----------|----------------
1         | 1
2         | 1
3         | 1   <- 10 / 4 = 2 remainder 2, so buckets 1 and 2 get 3 rows
4         | 2
5         | 2
6         | 2
7         | 3
8         | 3
9         | 4
10        | 4
```

Buckets 1 and 2 receive 3 rows each; buckets 3 and 4 receive 2 rows each.

## Quartile Analysis

Quartiles divide a dataset into four equal groups. `NTILE(4)` computes them directly. This query assigns each customer to a quartile based on their total purchase amount:

```sql
SELECT
    customer_id,
    total_purchases,
    NTILE(4) OVER (ORDER BY total_purchases ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS quartile
FROM customer_summary
ORDER BY total_purchases;
```

Quartile 1 contains the lowest spenders, quartile 4 the highest. You can then aggregate per quartile to understand spending distribution:

```sql
SELECT
    quartile,
    COUNT()                          AS customer_count,
    MIN(total_purchases)             AS min_spend,
    MAX(total_purchases)             AS max_spend,
    AVG(total_purchases)             AS avg_spend,
    SUM(total_purchases)             AS total_spend
FROM (
    SELECT
        customer_id,
        total_purchases,
        NTILE(4) OVER (ORDER BY total_purchases ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS quartile
    FROM customer_summary
)
GROUP BY quartile
ORDER BY quartile;
```

## Decile Bucketing for Percentile Reporting

Deciles (10 equal groups) are common in risk analysis and performance reporting. This query places products into deciles by their 30-day view count:

```sql
SELECT
    product_id,
    product_name,
    views_30d,
    NTILE(10) OVER (ORDER BY views_30d DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS decile
FROM product_metrics
WHERE date = today()
ORDER BY decile, views_30d DESC;
```

Decile 1 contains the top 10% of products by views, decile 10 the bottom 10%. This is more robust than hardcoded thresholds because the bucket boundaries adapt automatically to the actual data distribution.

## Per-Partition Bucketing

Combine `PARTITION BY` with `NTILE()` to bucket independently within each group. This example divides each department's employees into performance quintiles:

```sql
SELECT
    department,
    employee_id,
    performance_score,
    NTILE(5) OVER (
        PARTITION BY department
        ORDER BY performance_score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS performance_quintile
FROM employee_reviews
WHERE review_year = 2025
ORDER BY department, performance_quintile, performance_score DESC;
```

Each department is bucketed independently - a score that lands in quintile 1 in a high-performing department might be in quintile 2 in a lower-performing one.

## Comparing NTILE() with Explicit Percentile Thresholds

`NTILE()` divides by count, not by value range. To illustrate the difference, here is a comparison between `NTILE(4)` and manually computed quartile thresholds using `quantile()`:

```sql
-- NTILE(4): equal count per bucket
SELECT
    user_id,
    session_duration_seconds,
    NTILE(4) OVER (ORDER BY session_duration_seconds ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS count_quartile
FROM user_sessions
WHERE session_date = today() - 1
ORDER BY session_duration_seconds;
```

```sql
-- Threshold-based: buckets defined by percentile value boundaries
SELECT
    user_id,
    session_duration_seconds,
    CASE
        WHEN session_duration_seconds <= quantileExact(0.25)(session_duration_seconds)
             OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
             THEN 1
        WHEN session_duration_seconds <= quantileExact(0.50)(session_duration_seconds)
             OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
             THEN 2
        WHEN session_duration_seconds <= quantileExact(0.75)(session_duration_seconds)
             OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
             THEN 3
        ELSE 4
    END AS value_quartile
FROM user_sessions
WHERE session_date = today() - 1;
```

Use `NTILE()` when you want equal-count buckets. Use explicit thresholds (or `quantileExact`) when you want buckets defined by value ranges.

## Identifying Top and Bottom Performers

A practical shortcut for flagging the top 20% and bottom 20% of any metric uses `NTILE(5)`:

```sql
SELECT
    store_id,
    region,
    monthly_revenue,
    NTILE(5) OVER (
        PARTITION BY region
        ORDER BY monthly_revenue ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS revenue_quintile,
    CASE
        WHEN NTILE(5) OVER (
            PARTITION BY region
            ORDER BY monthly_revenue ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) = 5 THEN 'Top 20%'
        WHEN NTILE(5) OVER (
            PARTITION BY region
            ORDER BY monthly_revenue ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) = 1 THEN 'Bottom 20%'
        ELSE 'Middle 60%'
    END AS performance_tier
FROM store_monthly_summary
WHERE report_month = '2025-12-01'
ORDER BY region, monthly_revenue DESC;
```

## Using NTILE() for Load Balancing

A non-analytics use case: evenly distributing rows across N worker threads or shards. `NTILE(n)` assigns each row to a worker bucket in a balanced way:

```sql
SELECT
    task_id,
    payload,
    NTILE(8) OVER (ORDER BY task_id ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS worker_bucket
FROM pending_tasks
WHERE status = 'queued'
ORDER BY worker_bucket, task_id;
```

Each of the 8 worker buckets receives approximately the same number of tasks.

## Summary

`NTILE(n)` is the most direct SQL tool for equal-count bucketing in ClickHouse. It requires only a bucket count and an `ORDER BY` expression, automatically handles uneven distributions by adding one extra row to the first buckets, and composes naturally with `PARTITION BY` for per-group bucketing. Common use cases include quartile and decile analysis, performance tiers, and identifying top or bottom percentiles of a metric. For value-range-based bucketing, consider `quantileExact()` or manual `CASE` thresholds instead.
