# How to Create Distribution Analysis Reports in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distribution Analysis, Histogram, Percentile, Analytics

Description: Learn how to create distribution analysis reports in ClickHouse using histograms, frequency tables, and percentile breakdowns to understand data spread.

---

## What is Distribution Analysis?

Distribution analysis shows how values are spread across a range - revealing skew, concentration, and outliers. ClickHouse provides `histogram`, `quantiles`, and manual bucket expressions for comprehensive distribution reports.

## Sample Data

```sql
CREATE TABLE order_values
(
    order_id UInt64,
    customer_id UInt64,
    order_date Date,
    amount Float64
)
ENGINE = MergeTree()
ORDER BY (order_date, customer_id);
```

## Automatic Histogram

The `histogram` function automatically chooses optimal bucket boundaries:

```sql
SELECT histogram(20)(amount) AS hist
FROM order_values;
```

The result is an array of `(lower, upper, height)` tuples you can unpack:

```sql
SELECT
    round(bucket.1, 2) AS lower,
    round(bucket.2, 2) AS upper,
    toUInt64(bucket.3) AS approx_count
FROM (
    SELECT arrayJoin(histogram(20)(amount)) AS bucket
    FROM order_values
)
ORDER BY lower;
```

## Manual Frequency Buckets

For business-meaningful buckets:

```sql
SELECT
    multiIf(
        amount < 50, '$0-50',
        amount < 100, '$50-100',
        amount < 250, '$100-250',
        amount < 500, '$250-500',
        amount < 1000, '$500-1000',
        '$1000+'
    ) AS bucket,
    count() AS orders,
    round(sum(amount), 2) AS revenue,
    round(count() * 100.0 / sum(count()) OVER (), 2) AS pct_of_orders
FROM order_values
GROUP BY bucket
ORDER BY min(amount);
```

## Percentile Table

```sql
SELECT
    quantile(0.10)(amount) AS p10,
    quantile(0.25)(amount) AS p25,
    quantile(0.50)(amount) AS p50,
    quantile(0.75)(amount) AS p75,
    quantile(0.90)(amount) AS p90,
    quantile(0.95)(amount) AS p95,
    quantile(0.99)(amount) AS p99,
    quantile(0.999)(amount) AS p999
FROM order_values;
```

## Cumulative Distribution Function (CDF)

```sql
WITH buckets AS (
    SELECT
        multiIf(amount < 50, 50,
                amount < 100, 100,
                amount < 250, 250,
                amount < 500, 500,
                1000) AS bucket,
        count() AS cnt
    FROM order_values
    GROUP BY bucket
)
SELECT
    bucket,
    cnt,
    sum(cnt) OVER (ORDER BY bucket) AS cumulative_count,
    round(sum(cnt) OVER (ORDER BY bucket) * 100.0 / sum(cnt) OVER (), 2) AS cumulative_pct
FROM buckets
ORDER BY bucket;
```

## Distribution by Segment

Compare distributions across customer segments:

```sql
SELECT
    segment,
    quantile(0.25)(amount) AS q1,
    quantile(0.50)(amount) AS median,
    quantile(0.75)(amount) AS q3,
    avg(amount) AS mean,
    stddevPop(amount) AS stddev
FROM order_values
JOIN customers USING customer_id
GROUP BY segment
ORDER BY median DESC;
```

## Summary

ClickHouse distribution analysis uses `histogram` for automatic buckets, `multiIf` for business-defined ranges, and `quantiles` for percentile tables. Window functions with cumulative sums create CDF reports, while segment-level breakdowns compare distributions across groups.
