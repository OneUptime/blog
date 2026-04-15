# How to Handle NULLs in Aggregate Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NULL Handling, Aggregate Function, Analytics, Query Pattern

Description: Learn how ClickHouse aggregate functions handle NULL values, which functions skip NULLs by default, and how to use ifNull and countIf to produce correct analytics on sparse data.

---

Most ClickHouse aggregate functions skip NULL values silently. `count(col)` counts non-NULL rows, `sum(col)` sums non-NULL values, `avg(col)` averages non-NULL values, and so on. This behavior matches the SQL standard and means your aggregations are automatically correct as long as you understand that "NULL means unknown, not zero." When you want to treat NULL as a specific sentinel (such as 0 or an empty string), substitute the value before aggregating using `ifNull` or `coalesce`.

## Sample Table with Nullable Columns

```sql
CREATE TABLE sales
(
    sale_id    UInt64,
    rep_id     Nullable(UInt64),
    region     Nullable(String),
    revenue    Nullable(Float64),
    units      Nullable(UInt32),
    sale_date  Date
)
ENGINE = MergeTree()
ORDER BY (sale_date, sale_id);
```

```sql
INSERT INTO sales VALUES
    (1,  10, 'North', 500.0,  5,    '2024-06-01'),
    (2,  10, 'North', 300.0,  3,    '2024-06-01'),
    (3,  11, 'South', NULL,   NULL, '2024-06-01'),  -- revenue unknown
    (4,  11, 'South', 800.0,  8,    '2024-06-02'),
    (5,  NULL,'East', 200.0,  2,    '2024-06-02'), -- rep unknown
    (6,  12, NULL,    150.0,  NULL, '2024-06-03'), -- region unknown
    (7,  12, 'West',  NULL,   6,    '2024-06-03'), -- revenue unknown
    (8,  NULL,NULL,   450.0,  4,    '2024-06-03'); -- rep and region unknown
```

## count() vs count(*) with NULLs

```sql
-- count(*) counts all rows; count(col) counts only non-NULL values
SELECT
    count(*)          AS total_rows,
    count(rep_id)     AS rows_with_rep,
    count(region)     AS rows_with_region,
    count(revenue)    AS rows_with_revenue,
    count(units)      AS rows_with_units
FROM sales;
```

```text
total_rows  rows_with_rep  rows_with_region  rows_with_revenue  rows_with_units
8           6              6                 6                  6
```

## sum() and avg() Skip NULLs

```sql
SELECT
    sum(revenue)          AS sum_known_revenue,   -- NULLs excluded
    avg(revenue)          AS avg_known_revenue,   -- NULLs excluded from denominator
    sum(ifNull(revenue, 0.0)) AS sum_null_as_zero, -- NULLs treated as 0
    avg(ifNull(revenue, 0.0)) AS avg_null_as_zero
FROM sales;
```

```text
sum_known_revenue  avg_known_revenue  sum_null_as_zero  avg_null_as_zero
2400.0             400.0              2400.0            300.0
```

The denominator of `avg(revenue)` is 6 (non-NULL rows), while `avg(ifNull(revenue, 0.0))` uses all 8 rows.

## min() and max() with NULLs

```sql
SELECT
    min(revenue)  AS min_revenue,   -- ignores NULLs
    max(revenue)  AS max_revenue,   -- ignores NULLs
    min(region)   AS min_region,    -- lexicographic min of non-NULL strings
    max(region)   AS max_region
FROM sales;
```

```text
min_revenue  max_revenue  min_region  max_region
150.0        800.0        East        West
```

## countIf for Conditional Counting

```sql
-- Count rows meeting a condition, NULLs handled naturally
SELECT
    countIf(revenue > 300)       AS high_revenue_count,
    countIf(revenue IS NULL)     AS unknown_revenue_count,
    countIf(revenue IS NOT NULL) AS known_revenue_count
FROM sales;
```

```text
high_revenue_count  unknown_revenue_count  known_revenue_count
3                   2                     6
```

## sumIf and avgIf with Nullable Columns

```sql
SELECT
    sumIf(revenue, region = 'North')    AS north_revenue,
    avgIf(revenue, region = 'South')    AS south_avg_revenue,
    countIf(units > 4)                  AS large_unit_orders
FROM sales;
```

```text
north_revenue  south_avg_revenue  large_unit_orders
800.0          800.0              3
```

## groupBy with NULL Keys

By default, NULL is treated as a distinct group key value.

```sql
SELECT
    region,
    count()           AS orders,
    sum(revenue)      AS total_revenue
FROM sales
GROUP BY region
ORDER BY total_revenue DESC NULLS LAST;
```

```text
region  orders  total_revenue
South   2       800.0
North   2       800.0
NULL    2       600.0
East    1       200.0
West    1       NULL
```

The `NULL` region group contains sales 6 and 8. Sale 7 falls in the West group but has NULL revenue.

## Replacing NULL Keys Before GROUP BY

```sql
-- Normalize NULL region to 'Unknown' before grouping
SELECT
    ifNull(region, 'Unknown')  AS region_label,
    count()                    AS orders,
    sum(ifNull(revenue, 0.0))  AS total_revenue
FROM sales
GROUP BY region_label
ORDER BY total_revenue DESC;
```

```text
region_label  orders  total_revenue
North         2       800.0
South         2       800.0
Unknown       2       600.0
East          1       200.0
West          1       0.0
```

## Null-Safe uniq and groupArray

```sql
-- uniq counts non-NULL distinct values by default
SELECT
    uniq(rep_id)      AS distinct_reps,        -- excludes NULL
    uniq(region)      AS distinct_regions,     -- excludes NULL
    groupArray(rep_id) AS rep_ids_array         -- groupArray also skips NULLs
FROM sales;
```

```text
distinct_reps  distinct_regions  rep_ids_array
3              4                 [10,10,11,11,12,12]
```

## Handling NULLs in Percentile Functions

```sql
-- quantile and quantiles skip NULLs
SELECT
    quantile(0.5)(revenue)  AS median_revenue,
    quantiles(0.25, 0.75)(revenue) AS quartiles
FROM sales;
```

## Cumulative Sums with NULL Handling

```sql
-- Running total treating NULL revenue as 0
SELECT
    sale_id,
    sale_date,
    revenue,
    sum(ifNull(revenue, 0.0)) OVER (ORDER BY sale_id) AS running_total
FROM sales
ORDER BY sale_id;
```

```text
sale_id  sale_date   revenue  running_total
1        2024-06-01  500.0    500.0
2        2024-06-01  300.0    800.0
3        2024-06-01  NULL     800.0
4        2024-06-02  800.0    1600.0
5        2024-06-02  200.0    1800.0
6        2024-06-03  150.0    1950.0
7        2024-06-03  NULL     1950.0
8        2024-06-03  450.0    2400.0
```

## NULL-Safe Aggregation Checklist

```sql
-- Summary: correct vs naive aggregation on nullable data
SELECT
    -- WRONG: avg denominator only counts non-null rows
    avg(revenue)                         AS avg_naive,

    -- CORRECT for "average over all sales including unknown":
    sum(ifNull(revenue, 0.0)) / count()  AS avg_over_all,

    -- CORRECT for "average of sales we know about":
    avg(revenue)                         AS avg_known,

    -- CORRECT count of sales with known revenue:
    count(revenue)                       AS count_known,

    -- CORRECT count of all sales:
    count()                              AS count_all
FROM sales;
```

## Summary

ClickHouse aggregate functions (`sum`, `avg`, `min`, `max`, `count(col)`, `uniq`, etc.) skip NULL values by default, consistent with the SQL standard. `count(*)` counts all rows while `count(col)` counts only non-NULL values. Use `ifNull(col, default)` before aggregating when you want NULLs treated as a specific value such as 0. Use `countIf(col IS NULL)` to count missing values explicitly. In `GROUP BY`, NULL forms its own group by default - use `ifNull` in the `GROUP BY` expression to merge it with a named bucket.
