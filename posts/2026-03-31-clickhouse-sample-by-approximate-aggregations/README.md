# How to Use SAMPLE BY for Approximate Aggregations in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SAMPLE BY, Approximate Aggregation, Analytics, Performance

Description: Learn how to use ClickHouse's SAMPLE clause for approximate aggregations, scaling results to full-dataset estimates with the _sample_factor virtual column.

---

Once your MergeTree table has a `SAMPLE BY` key, you can write approximate aggregation queries using the `SAMPLE` clause. This post covers practical patterns for scaling sampled aggregates to full-dataset estimates.

## Basic Approximate Aggregation

```sql
SELECT
    event_name,
    count()     AS sampled_count,
    count() * 10 AS approx_total  -- 10% sample -> multiply by 10
FROM events
SAMPLE 0.1
WHERE event_date = today()
GROUP BY event_name
ORDER BY approx_total DESC
LIMIT 20;
```

## Using _sample_factor for Automatic Scaling

`_sample_factor` is a virtual column available in sampled queries. It equals the inverse of the actual sampling rate:

```sql
SELECT
    event_name,
    count() * _sample_factor AS approx_count,
    sum(revenue) * _sample_factor AS approx_revenue
FROM events
SAMPLE 0.05
WHERE event_date = today()
GROUP BY event_name
ORDER BY approx_revenue DESC;
```

This avoids hardcoding the scaling factor.

## Approximate COUNT DISTINCT

This pattern works well when the `SAMPLE BY` key is based on the same column being counted (e.g., `SAMPLE BY intHash32(user_id)`), because each unique value is deterministically either fully included or excluded from the sample:

```sql
SELECT
    toDate(event_time) AS day,
    uniq(user_id) * _sample_factor AS approx_dau
FROM events
SAMPLE 0.1
WHERE event_time >= today() - 30
GROUP BY day
ORDER BY day;
```

If the `SAMPLE BY` key is not based on `user_id`, consider using `uniq(user_id)` on the full dataset instead - it is already an approximation and is fast without sampling.

## Approximate Average - No Scaling Needed

Averages do not require scaling since the ratio is preserved:

```sql
SELECT
    endpoint,
    avg(response_ms) AS avg_latency  -- same for 100% or 10% sample
FROM api_requests
SAMPLE 0.1
WHERE event_date = today()
GROUP BY endpoint
ORDER BY avg_latency DESC;
```

## Approximate Revenue by Country

```sql
SELECT
    country_code,
    sum(order_amount) * _sample_factor AS approx_revenue,
    count() * _sample_factor AS approx_orders
FROM orders
SAMPLE 0.1
WHERE event_date >= today() - 7
GROUP BY country_code
ORDER BY approx_revenue DESC
LIMIT 20;
```

## Choosing Sample Rate

| Dataset Size | Recommended Sample Rate | Typical Query Speedup |
|-------------|------------------------|-----------------------|
| 10M rows | 0.1 (10%) | 8-10x |
| 100M rows | 0.01 (1%) | 80-100x |
| 1B rows | 0.001 (0.1%) | 800-1000x |

Error decreases as sample size grows - keep sampled count above 10,000 rows for reliable estimates.

## Aggregates That Scale Linearly

These scale by `_sample_factor`:

```sql
count()         -- multiply by _sample_factor
sum()           -- multiply by _sample_factor
countIf()       -- multiply by _sample_factor
sumIf()         -- multiply by _sample_factor
```

## Aggregates That Do Not Need Scaling

```sql
avg()           -- no scaling
min()           -- no scaling
max()           -- no scaling
quantile()      -- no scaling (distribution-based)
```

## Combining Sampling with Materialized Views

The `SAMPLE` clause is a query-time feature and cannot be used in a materialized view's inner SELECT, since materialized views process INSERT blocks rather than querying the full table. To pre-aggregate a subset of incoming data, use a hash-based filter in the `WHERE` clause:

```sql
CREATE MATERIALIZED VIEW approx_daily_stats
ENGINE = SummingMergeTree
ORDER BY (event_date, event_name)
AS
SELECT
    event_date,
    event_name,
    count() AS sampled_count
FROM events
WHERE cityHash64(event_id) % 10 = 0  -- deterministic ~10% of rows
GROUP BY event_date, event_name;
```

When querying, multiply `sampled_count` by 10 to estimate totals.

## Summary

Approximate aggregations with `SAMPLE` and `_sample_factor` provide query speedups of 10x to 1000x with error rates under 1% when the sampled row count exceeds 10,000. Scale additive aggregates (`count`, `sum`) by `_sample_factor` and leave ratio-based aggregates (`avg`, `quantile`) unscaled. This pattern is the foundation of cost-effective large-scale analytics in ClickHouse.
