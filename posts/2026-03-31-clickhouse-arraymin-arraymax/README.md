# How to Use arrayMin() and arrayMax() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayMin, arrayMax

Description: Learn how arrayMin() and arrayMax() find the smallest and largest elements of a ClickHouse array for fast extremum extraction, filtering, and array property comparisons.

---

Finding the minimum or maximum value in an array is a fundamental operation. While `arrayReduce('min', arr)` achieves the same result, ClickHouse provides dedicated `arrayMin` and `arrayMax` functions that are more expressive and slightly more concise. These return the smallest or largest element of an array as a scalar value, making them ideal for filtering rows based on array properties or extracting boundary values.

## Function Signatures

```text
arrayMin([func,] arr) -> T
arrayMax([func,] arr) -> T
```

Both functions accept an optional lambda `func` that transforms each element before comparison. Without a lambda, they compare elements directly.

## Basic Usage

```sql
-- Minimum of numeric array
SELECT arrayMin([3, 1, 4, 1, 5, 9, 2, 6]) AS minimum;
-- Result: 1

-- Maximum of numeric array
SELECT arrayMax([3, 1, 4, 1, 5, 9, 2, 6]) AS maximum;
-- Result: 9

-- Float arrays
SELECT arrayMin([1.5, 2.7, 0.3, 4.1]) AS min_float;
-- Result: 0.3

-- String arrays (lexicographic comparison)
SELECT arrayMin(['banana', 'apple', 'cherry']) AS min_str;
-- Result: 'apple'

SELECT arrayMax(['banana', 'apple', 'cherry']) AS max_str;
-- Result: 'cherry'

-- Single element
SELECT arrayMin([42]) AS single_min;
-- Result: 42
```

## Using Lambdas to Transform Before Comparing

The optional lambda transforms each element, and the min/max of those transformed values is returned (the return type matches the lambda's output, not the original array's element type):

```sql
-- Find the smallest absolute value
SELECT arrayMin(x -> abs(x), [-5, 3, -1, 4, -2]) AS min_abs;
-- Result: 1 (the minimum of the abs() results)

-- Find the shortest string length
SELECT arrayMin(x -> length(x), ['banana', 'fig', 'apple', 'kiwi']) AS shortest_len;
-- Result: 3 (length of 'fig')

-- Find the longest string length
SELECT arrayMax(x -> length(x), ['banana', 'fig', 'apple', 'kiwi']) AS longest_len;
-- Result: 6 (length of 'banana')
```

## Filtering Rows Based on Array Extremes

`arrayMin` and `arrayMax` are particularly powerful in `WHERE` clauses for filtering rows based on the range of values their arrays contain:

```sql
CREATE TABLE sensor_readings
(
    sensor_id UInt32,
    hourly_values Array(Float32)
) ENGINE = Memory;

INSERT INTO sensor_readings VALUES
    (1, [12.1, 14.3, 11.9, 13.5, 15.2]),
    (2, [55.0, 60.1, 58.3, 62.7, 100.5]),
    (3, [8.0, 8.1, 7.9, 8.2, 8.0]),
    (4, [20.0, 21.0, 19.5, 100.0, 0.5]);

-- Find sensors where any reading exceeded 50
SELECT sensor_id, hourly_values
FROM sensor_readings
WHERE arrayMax(hourly_values) > 50;
-- sensor 2, sensor 4

-- Find sensors where all readings stayed below 20
SELECT sensor_id, hourly_values
FROM sensor_readings
WHERE arrayMax(hourly_values) < 20;
-- sensor 1, sensor 3

-- Find sensors with a wide range (max - min > 10)
SELECT
    sensor_id,
    arrayMin(hourly_values) AS low,
    arrayMax(hourly_values) AS high,
    arrayMax(hourly_values) - arrayMin(hourly_values) AS range
FROM sensor_readings
WHERE arrayMax(hourly_values) - arrayMin(hourly_values) > 10;
-- sensor 2: range 45.5
-- sensor 4: range 99.5
```

## Comparing Arrays Element-Wise Using Min/Max

Use `arrayMap` combined with `arrayMin` or `arrayMax` to compute element-wise minimum or maximum between two parallel arrays (the "pairwise min/max" pattern):

```sql
-- Element-wise minimum of two arrays
SELECT arrayMap(
    (a, b) -> least(a, b),
    [1, 5, 3, 8, 2],
    [4, 2, 6, 1, 7]
) AS element_min;
-- Result: [1, 2, 3, 1, 2]

-- Element-wise maximum of two arrays
SELECT arrayMap(
    (a, b) -> greatest(a, b),
    [1, 5, 3, 8, 2],
    [4, 2, 6, 1, 7]
) AS element_max;
-- Result: [4, 5, 6, 8, 7]
```

## Normalizing Arrays to [0, 1] Range

`arrayMin` and `arrayMax` together enable min-max normalization of array elements:

```sql
SELECT
    sensor_id,
    hourly_values AS raw,
    arrayMap(
        v -> (v - arrayMin(hourly_values)) / (arrayMax(hourly_values) - arrayMin(hourly_values)),
        hourly_values
    ) AS normalized
FROM sensor_readings
WHERE arrayMax(hourly_values) != arrayMin(hourly_values);
-- Scales each array to [0.0, 1.0] based on its own min and max
```

## Finding the Position of the Min/Max Element

`arrayMin` returns the value; to get the position, combine with `indexOf`:

```sql
SELECT
    sensor_id,
    arrayMax(hourly_values) AS peak_value,
    indexOf(hourly_values, arrayMax(hourly_values)) AS peak_position
FROM sensor_readings;
-- sensor 1: peak 15.2 at position 5
-- sensor 2: peak 100.5 at position 5
-- sensor 3: peak 8.2 at position 4
-- sensor 4: peak 100.0 at position 4
```

## Alerting on Threshold Breaches in Stored Arrays

A batch monitoring query that flags sensors where any stored reading crossed a threshold - without unnesting:

```sql
SELECT
    sensor_id,
    arrayMax(hourly_values) AS max_reading,
    multiIf(
        arrayMax(hourly_values) >= 100, 'critical',
        arrayMax(hourly_values) >= 50,  'warning',
        'ok'
    ) AS alert_level
FROM sensor_readings
ORDER BY max_reading DESC;
```

## Summary

`arrayMin` and `arrayMax` return the smallest and largest elements of an array respectively, with optional lambda-based value transformation before comparison. They are indispensable for row filtering based on array boundary values, computing array ranges, min-max normalization, and identifying peak positions via `indexOf`. Together they expose the full value range of array columns with minimal query verbosity.
