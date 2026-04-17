# How to Use arrayReduce() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayReduce, Aggregate Function

Description: Learn how arrayReduce() applies any ClickHouse aggregate function to array elements, returning a scalar result for summing, averaging, and finding extremes in array columns.

---

ClickHouse's aggregate functions like `sum`, `avg`, `max`, and `min` are designed to work across rows. But what if you need to aggregate values within a single array column? `arrayReduce` bridges this gap by applying any named aggregate function to the elements of an array and returning a single scalar result. This avoids the overhead of unnesting with `arrayJoin` when all you need is a summary statistic.

## Function Signature

```text
arrayReduce('aggFunc', arr1 [, arr2, ...]) -> Scalar
```

- `'aggFunc'` - the name of any ClickHouse aggregate function, as a string literal
- `arr1, arr2, ...` - one or more arrays (multi-array forms for combinatorial aggregate functions)

The aggregate function is applied as if each element of the array were a separate row.

## Basic Aggregations

```sql
-- Sum all elements in an array
SELECT arrayReduce('sum', [10, 20, 30, 40]) AS total;
-- Result: 100

-- Average of array elements
SELECT arrayReduce('avg', [10, 20, 30, 40]) AS average;
-- Result: 25

-- Maximum element
SELECT arrayReduce('max', [3, 1, 4, 1, 5, 9, 2, 6]) AS maximum;
-- Result: 9

-- Minimum element
SELECT arrayReduce('min', [3, 1, 4, 1, 5, 9, 2, 6]) AS minimum;
-- Result: 1

-- Count of elements (useful for non-null counting)
SELECT arrayReduce('count', [1, 2, 3, NULL, 5]) AS cnt;
-- Result: 4 (count(x) skips NULL values)
```

## Using Statistical Aggregate Functions

`arrayReduce` works with any aggregate function registered in ClickHouse, including statistical ones:

```sql
-- Standard deviation of array values
SELECT arrayReduce('stddevPop', [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]) AS stddev;
-- Result: 2.0

-- Variance
SELECT arrayReduce('varPop', [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]) AS variance;
-- Result: 4.0

-- Quantile (median)
SELECT arrayReduce('median', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) AS median;
-- Result: 5.5
```

## Summing Feature Vectors in a Table

A common use case is computing summary statistics over array-typed metric columns without unnesting:

```sql
CREATE TABLE sensor_readings
(
    sensor_id UInt32,
    hourly_values Array(Float64)
) ENGINE = Memory;

INSERT INTO sensor_readings VALUES
    (1, [12.1, 14.3, 11.9, 13.5, 15.2, 14.8, 16.1, 13.7]),
    (2, [5.0, 5.5, 4.8, 6.2, 5.9, 5.1, 4.7, 5.3]),
    (3, [100.0, 98.5, 99.0, 101.2]);

SELECT
    sensor_id,
    arrayReduce('sum', hourly_values) AS daily_total,
    arrayReduce('avg', hourly_values) AS hourly_avg,
    arrayReduce('max', hourly_values) AS peak_reading,
    arrayReduce('min', hourly_values) AS lowest_reading
FROM sensor_readings;
```

## Scoring with Weighted Sums

For ML scoring or recommendation systems where weights are stored as parallel arrays, combining `arrayMap` for element-wise multiplication with `arrayReduce('sum', ...)` computes a dot product:

```sql
-- Compute dot product (weighted score)
-- Multiply feature_values * weights element-wise, then sum
SELECT arrayReduce(
    'sum',
    arrayMap((f, w) -> f * w,
        [0.8, 0.6, 0.9, 0.7],   -- feature values
        [1.5, 2.0, 1.0, 0.5]    -- weights
    )
) AS weighted_score;
-- Result: 0.8*1.5 + 0.6*2.0 + 0.9*1.0 + 0.7*0.5 = 1.2 + 1.2 + 0.9 + 0.35 = 3.65
```

## Using with groupUniqArray and Other Complex Aggregates

`arrayReduce` works with aggregation functions that return non-scalar types too:

```sql
-- Collect unique values from an array (deduplication via groupUniqArray)
SELECT arrayReduce('groupUniqArray', ['a', 'b', 'a', 'c', 'b', 'd']) AS unique_vals;
-- Result: ['a', 'b', 'c', 'd'] (order may vary)

-- argMax with parallel arrays: returns the value from the first array
-- corresponding to the maximum in the second array
SELECT arrayReduce('argMax',
    ['a', 'b', 'a', 'c', 'a'],
    [1, 2, 1, 3, 1]
) AS arg_max_element;
-- Result: 'c' (value at the position of the max weight 3)
```

## Applying quantile Aggregates to Arrays

Quantile functions are particularly useful for summarizing distributions stored in arrays:

```sql
CREATE TABLE response_times
(
    endpoint String,
    latencies_ms Array(Float32)
) ENGINE = Memory;

INSERT INTO response_times VALUES
    ('/api/users',   [45.2, 51.3, 49.8, 200.1, 47.5, 52.0, 1200.3, 48.9, 50.1, 46.7]),
    ('/api/orders',  [120.5, 115.3, 118.9, 122.1, 119.7]);

SELECT
    endpoint,
    arrayReduce('quantile(0.5)',  latencies_ms) AS p50,
    arrayReduce('quantile(0.95)', latencies_ms) AS p95,
    arrayReduce('quantile(0.99)', latencies_ms) AS p99,
    arrayReduce('max', latencies_ms)            AS max_latency
FROM response_times;
```

## Comparing arrayReduce vs ARRAY JOIN + GROUP BY

For single-array aggregations, `arrayReduce` is more concise than the unnest approach:

```sql
-- Using arrayReduce (compact, no intermediate rows)
SELECT sensor_id, arrayReduce('avg', hourly_values) AS avg_val
FROM sensor_readings;

-- Equivalent using ARRAY JOIN (verbose, creates intermediate rows)
SELECT sensor_id, avg(val) AS avg_val
FROM sensor_readings
ARRAY JOIN hourly_values AS val
GROUP BY sensor_id;
```

Both approaches give the same result, but `arrayReduce` keeps the query concise and avoids materializing all the intermediate rows.

## Summary

`arrayReduce` applies any named ClickHouse aggregate function - sum, avg, min, max, stddevPop, quantile, and more - to the elements of an array, returning a scalar result. It is the most direct way to compute summary statistics on array columns without unnesting. Combined with `arrayMap` for element-wise transformations before reducing, it handles weighted sums, dot products, and complex scoring in a single expression.
