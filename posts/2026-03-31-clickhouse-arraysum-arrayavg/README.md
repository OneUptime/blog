# How to Use arraySum() and arrayAvg() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arraySum, arrayAvg, SQL, Aggregation

Description: Learn how arraySum() totals all elements in an array and arrayAvg() computes their average, enabling scalar reduction of stored arrays without unnesting.

---

When numeric values are stored as an array column, you often need to reduce them to a single number - the total, the mean, the minimum, or the maximum. `arraySum()` and `arrayAvg()` are the two most frequently needed reductions. `arraySum(arr)` returns the sum of all elements; `arrayAvg(arr)` returns their arithmetic mean. Both produce a scalar result that can be used in expressions, comparisons, and aggregations directly, without the overhead of unnesting the array into rows.

## arraySum() - Total All Elements

`arraySum(arr)` adds up every element in the array. For integer arrays the return type is widened to `Int64` or `UInt64` to prevent overflow; floating-point arrays return `Float64`, and `Decimal` arrays return a `Decimal` of sufficient precision.

```sql
-- Sum a literal integer array
SELECT arraySum([1, 2, 3, 4, 5]) AS total;
-- Result: 15

-- Sum a float array
SELECT arraySum([1.5, 2.5, 3.0]) AS total;
-- Result: 7.0
```

## arrayAvg() - Average of All Elements

`arrayAvg(arr)` computes the mean of all elements. It always returns a `Float64` regardless of the input type.

```sql
-- Average of an integer array
SELECT arrayAvg([10, 20, 30, 40, 50]) AS mean;
-- Result: 30.0

-- Average of a float array
SELECT arrayAvg([1.2, 3.4, 5.6]) AS mean;
-- Result: 3.4
```

## Operating on Table Columns

Both functions work identically on stored array columns.

```sql
-- Compute total and average latency per request from sampled spans
SELECT
    trace_id,
    arraySum(span_durations_ms) AS total_duration_ms,
    arrayAvg(span_durations_ms) AS avg_span_duration_ms
FROM distributed_traces;
```

## Computing Weighted Scores

`arraySum()` is useful for computing dot products or weighted sums when paired with `arrayMap()`.

```sql
-- Compute a weighted score: sum(weight_i * value_i) for each row
SELECT
    model_id,
    arraySum(arrayMap((w, v) -> w * v, feature_weights, feature_values)) AS weighted_score
FROM model_predictions;
```

## Filtering Rows Based on Array Sum or Average

Because the result is a scalar, you can use it directly in a `WHERE` clause.

```sql
-- Sessions where total event duration exceeded 30 seconds
SELECT session_id
FROM sessions
WHERE arraySum(event_durations_ms) > 30000;

-- Sensors whose average reading is above a threshold
SELECT sensor_id
FROM sensor_data
WHERE arrayAvg(readings) > 75.0;
```

## Combining with arrayFilter() for Conditional Sums

To sum only elements that meet a condition, filter first and then sum.

```sql
-- Sum only the slow spans (> 500ms) per trace
SELECT
    trace_id,
    arraySum(arrayFilter(d -> d > 500, span_durations_ms)) AS slow_span_total_ms
FROM distributed_traces;

-- Average only the valid readings (within sensor range)
SELECT
    sensor_id,
    arrayAvg(arrayFilter(r -> r >= 0 AND r <= 100, readings)) AS clean_avg
FROM sensor_data;
```

## Cross-Row Aggregation Using arraySum()

Because `arraySum()` produces a scalar, you can apply `sum()` or `avg()` across rows for multi-level aggregation.

```sql
-- Total bytes across all arrays for all logs
SELECT sum(arraySum(byte_counts)) AS grand_total_bytes
FROM network_logs;

-- Average of per-session average latencies
SELECT avg(arrayAvg(event_durations_ms)) AS overall_avg_latency
FROM sessions;
```

## Normalizing Arrays Using arrayAvg()

A common preprocessing step is mean-centering an array by subtracting the average from each element.

```sql
-- Mean-center each row's reading array
SELECT
    sensor_id,
    arrayMap(r -> r - arrayAvg(readings), readings) AS centered_readings
FROM sensor_data;
```

## Computing Variance Inline

With `arrayMap()` and `arrayAvg()` you can compute the variance of an array in a single expression.

```sql
-- Compute variance of span durations per trace
SELECT
    trace_id,
    arrayAvg(
        arrayMap(
            d -> pow(d - arrayAvg(span_durations_ms), 2),
            span_durations_ms
        )
    ) AS duration_variance
FROM distributed_traces;
```

## Practical Example: Score Aggregation

In a scoring system where each user accumulates an array of scores over time, `arraySum()` and `arrayAvg()` give the lifetime total and rolling average without re-aggregating historical data.

```sql
SELECT
    user_id,
    arraySum(scores) AS lifetime_score,
    arrayAvg(scores) AS average_score,
    length(scores) AS score_count
FROM user_scores
ORDER BY lifetime_score DESC
LIMIT 20;
```

## Summary

`arraySum()` and `arrayAvg()` reduce an entire numeric array to a single scalar value - the sum and the mean respectively. They are the array-level counterparts to the `sum()` and `avg()` aggregate functions, but operate within a single row rather than across rows. Combine them with `arrayFilter()` for conditional reductions, with `arrayMap()` for weighted aggregations, and with row-level aggregates like `sum()` and `avg()` when you need cross-row statistics on per-row array totals.
