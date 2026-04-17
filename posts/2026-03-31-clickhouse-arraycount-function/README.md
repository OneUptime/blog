# How to Use arrayCount() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayCount, Lambda, Higher-Order Function, SQL

Description: Learn how arrayCount() counts elements satisfying a lambda predicate or non-zero elements when no lambda is given, with practical SQL examples.

---

`arrayCount()` answers the question "how many elements in this array satisfy a condition?" without requiring you to unnest the array into rows and aggregate. With a lambda argument, it counts all elements for which the lambda returns a non-zero value. Without a lambda, it counts all non-zero elements directly. The result is a scalar `UInt32`, which can be used in expressions, comparisons, and aggregations just like any other number.

## Basic Usage Without a Lambda

When called without a lambda, `arrayCount(arr)` counts the number of non-zero elements in a numeric array. For non-numeric arrays (such as `String`), you must supply a lambda that returns a numeric value.

```sql
-- Count non-zero elements
SELECT arrayCount([0, 1, 2, 0, 3, 0]) AS non_zero_count;
-- Result: 3

-- Count non-empty strings (a lambda is required for string arrays)
SELECT arrayCount(s -> s != '', ['hello', '', 'world', '']) AS non_empty_count;
-- Result: 2
```

## Counting Elements That Match a Predicate

With a lambda, `arrayCount(func, arr)` counts elements for which the lambda returns `1`.

```sql
-- Count how many numbers in the array are greater than 5
SELECT arrayCount(x -> x > 5, [3, 7, 1, 9, 4, 6]) AS above_five;
-- Result: 3

-- Count error-level status codes in a response array
SELECT arrayCount(s -> s >= 500, [200, 200, 503, 404, 500]) AS server_errors;
-- Result: 2
```

## Applying arrayCount() to a Table Column

The function operates on per-row array values, making it a compact alternative to `length(arrayFilter(...))`.

```sql
-- Count how many events per session had a duration above 1 second
SELECT
    session_id,
    arrayCount(d -> d > 1000, event_durations_ms) AS slow_event_count
FROM sessions;

-- Flag sessions with more than 2 slow events
SELECT session_id
FROM sessions
WHERE arrayCount(d -> d > 1000, event_durations_ms) > 2;
```

## Counting Truthy Values in Boolean-Encoded Arrays

When an array column stores `0`/`1` flags (e.g., whether each request succeeded), `arrayCount()` without a lambda gives the number of successes directly.

```sql
-- Count successful requests per batch (1 = success, 0 = failure)
SELECT
    batch_id,
    arrayCount(success_flags) AS successful_requests,
    length(success_flags) AS total_requests,
    arrayCount(success_flags) / length(success_flags) AS success_rate
FROM request_batches;
```

## Comparing arrayCount() with length(arrayFilter())

`arrayCount(func, arr)` and `length(arrayFilter(func, arr))` produce the same result, but `arrayCount()` avoids constructing an intermediate array, which is more memory-efficient.

```sql
-- These two queries are equivalent; arrayCount is preferred for performance
SELECT
    session_id,
    arrayCount(d -> d > 500, event_durations_ms) AS method_1,
    length(arrayFilter(d -> d > 500, event_durations_ms)) AS method_2
FROM sessions;
```

## Multi-Array Lambda

`arrayCount()` supports the multi-array lambda form, where the lambda receives one element from each parallel array simultaneously.

```sql
-- Count span/budget pairs where the span exceeded its budget
SELECT
    trace_id,
    arrayCount(
        (duration, budget) -> duration > budget,
        span_durations_ms,
        span_budgets_ms
    ) AS over_budget_spans
FROM distributed_traces;
```

## Using arrayCount() for Data Quality Scoring

Dividing `arrayCount()` by `length()` gives a fraction, which is useful for quality scoring.

```sql
-- Compute what fraction of readings fall within the valid range
SELECT
    sensor_id,
    arrayCount(r -> r >= 0 AND r <= 100, readings) AS valid_count,
    length(readings) AS total_count,
    arrayCount(r -> r >= 0 AND r <= 100, readings) / length(readings) AS validity_fraction
FROM sensor_data;
```

## Aggregating arrayCount() Results Across Rows

Because `arrayCount()` returns a scalar, you can use it inside aggregate functions to compute cross-row statistics.

```sql
-- Average number of slow events per session
SELECT avg(arrayCount(d -> d > 1000, event_durations_ms)) AS avg_slow_events_per_session
FROM sessions;

-- Total number of errors across all sessions
SELECT sum(arrayCount(s -> s >= 500, status_codes)) AS total_server_errors
FROM session_log;
```

## Filtering Groups by Array Condition Count

Use `arrayCount()` in a `HAVING` clause to filter aggregated results based on how many elements in an accumulated array meet a condition.

```sql
-- Users who had more than 5 slow requests in total across all their sessions
SELECT
    user_id,
    sum(arrayCount(d -> d > 1000, event_durations_ms)) AS total_slow_events
FROM sessions
GROUP BY user_id
HAVING total_slow_events > 5;
```

## Summary

`arrayCount()` is the efficient, idiomatic way to count how many elements of an array satisfy a condition in ClickHouse. Without a lambda it counts non-zero elements; with a lambda it counts elements for which the predicate is true. It is more memory-efficient than the `length(arrayFilter(...))` equivalent because it does not materialize an intermediate array. Use it in `SELECT`, `WHERE`, `HAVING`, and aggregate contexts wherever you need a count derived from array contents.
