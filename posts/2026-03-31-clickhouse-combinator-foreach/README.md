# How to Use the -ForEach Aggregate Combinator in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Aggregate Function, Combinator, Array, Performance

Description: Learn how the -ForEach combinator applies an aggregate function element-wise across arrays of equal length, returning an array of per-position results.

---

When you have multiple rows that each contain an array of the same length, you sometimes want to aggregate position by position rather than flattening everything into a single value. For example, given three rows each with a 5-element score array, you might want the sum at position 1, the sum at position 2, and so on. That is exactly what the `-ForEach` combinator does. It wraps any aggregate function so that instead of computing one result for the whole group, it computes one result per array position and returns an array of those results. When the input arrays within a group have different lengths, the output array length equals the longest input and shorter arrays contribute only at the positions they span - but for most use cases where positions carry a semantic meaning, you want the arrays to be the same length.

## Syntax

Append `-ForEach` to any aggregate function name:

```text
aggFuncForEach(array_column)  ->  Array(result_type)
```

Each row contributes the element at position `i` to the aggregate at position `i` in the output array. The output array length equals the longest input array in the group; when all inputs share the same length, the output is that length.

## Basic Example: sumForEach()

The simplest illustration is summing arrays element-wise. Consider daily sales figures stored as arrays where each position represents a product.

```sql
CREATE TABLE daily_sales
(
    store_id  UInt32,
    day       Date,
    sales     Array(UInt32)  -- index 0 = product A, 1 = product B, 2 = product C
)
ENGINE = MergeTree()
ORDER BY (store_id, day);

INSERT INTO daily_sales VALUES
    (1, '2026-03-29', [10, 20, 5]),
    (1, '2026-03-30', [15, 18, 8]),
    (1, '2026-03-31', [12, 22, 6]),
    (2, '2026-03-29', [30, 10, 2]),
    (2, '2026-03-30', [28, 14, 3]),
    (2, '2026-03-31', [35, 11, 4]);
```

Sum sales for each product per store across all three days:

```sql
SELECT
    store_id,
    sumForEach(sales) AS total_per_product
FROM daily_sales
GROUP BY store_id
ORDER BY store_id;
```

```text
store_id  total_per_product
1         [37, 60, 19]
2         [93, 35, 9]
```

Product A (index 0) for store 1: 10 + 15 + 12 = 37. Product B (index 1): 20 + 18 + 22 = 60. This is element-wise summation across all rows in the group.

## avgForEach() for Per-Position Averages

Compute the average value at each position, useful for normalized comparisons or smoothing.

```sql
SELECT
    store_id,
    avgForEach(sales) AS avg_per_product
FROM daily_sales
GROUP BY store_id
ORDER BY store_id;
```

```text
store_id  avg_per_product
1         [12.333, 20, 6.333]
2         [31, 11.666, 3]
```

## minForEach() and maxForEach()

Find the minimum and maximum value seen at each position across all rows:

```sql
SELECT
    store_id,
    minForEach(sales) AS min_per_product,
    maxForEach(sales) AS max_per_product
FROM daily_sales
GROUP BY store_id
ORDER BY store_id;
```

```text
store_id  min_per_product  max_per_product
1         [10, 18, 5]      [15, 22, 8]
2         [28, 10, 2]      [35, 14, 4]
```

## countForEach() for Non-Null Counts

`countForEach()` counts how many non-null values exist at each position. This is useful when arrays may have nullable elements.

```sql
CREATE TABLE experiment_results
(
    experiment_id  UInt32,
    run_id         UInt32,
    scores         Array(Nullable(Float64))
)
ENGINE = MergeTree()
ORDER BY (experiment_id, run_id);

INSERT INTO experiment_results VALUES
    (1, 1, [9.5, NULL, 7.0, 8.0]),
    (1, 2, [8.0, 6.5, NULL, 7.5]),
    (1, 3, [7.5, 8.0, 9.0, NULL]);

SELECT
    experiment_id,
    countForEach(scores)  AS non_null_counts,
    avgForEach(scores)    AS avg_per_position
FROM experiment_results
GROUP BY experiment_id;
```

```text
experiment_id  non_null_counts  avg_per_position
1              [3, 2, 2, 2]     [8.333, 7.25, 8, 7.75]
```

Position 1 (second element) has only 2 non-null values because the first row had NULL there.

## Practical Use Case: Time Series Vector Aggregation

A common pattern in machine learning feature stores and monitoring systems is storing metric vectors (one value per time bucket) as arrays. `-ForEach` lets you aggregate these vectors across multiple entities.

```sql
CREATE TABLE metric_vectors
(
    region     String,
    server_id  UInt32,
    -- 24 hourly buckets for one day
    hourly_rps Array(Float64)
)
ENGINE = MergeTree()
ORDER BY (region, server_id);

INSERT INTO metric_vectors VALUES
    ('us-east', 1, [120.0, 95.0, 80.0, 70.0, 65.0, 110.0,
                    200.0, 350.0, 400.0, 420.0, 410.0, 390.0,
                    380.0, 370.0, 360.0, 340.0, 300.0, 280.0,
                    250.0, 230.0, 210.0, 190.0, 160.0, 130.0]),
    ('us-east', 2, [100.0, 80.0, 75.0, 65.0, 60.0, 95.0,
                    185.0, 320.0, 380.0, 390.0, 385.0, 370.0,
                    360.0, 350.0, 340.0, 320.0, 285.0, 265.0,
                    240.0, 220.0, 200.0, 180.0, 150.0, 120.0]);

-- Compute mean RPS per hour across all servers in a region
SELECT
    region,
    avgForEach(hourly_rps) AS mean_rps_by_hour
FROM metric_vectors
GROUP BY region;
```

The result is a 24-element array where each element is the average RPS for that hour across all servers in the region - a per-hour regional profile.

## Combining -ForEach with arraySum() for Row-Level Post-Processing

After computing per-position aggregates, you can use array functions to summarize the result further.

```sql
SELECT
    store_id,
    sumForEach(sales)               AS totals,
    -- Compute grand total across all products
    arraySum(sumForEach(sales))     AS grand_total
FROM daily_sales
GROUP BY store_id
ORDER BY store_id;
```

```text
store_id  totals       grand_total
1         [37, 60, 19] 116
2         [93, 35, 9]  137
```

## Summary

The `-ForEach` combinator transforms any aggregate function into an element-wise array aggregation. Instead of collapsing all rows into one scalar, it aligns arrays by position and produces a result array of the same length. This is ideal for time series vectors, per-product metrics, position-indexed experiment results, and any scenario where arrays across rows share a common positional meaning. The input arrays within a group must all be the same length for results to be meaningful. Combine `-ForEach` results with ClickHouse array functions like `arraySum()`, `arrayMap()`, or `arrayZip()` for rich post-processing without leaving the query layer.
