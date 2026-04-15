# How to Use range() Function to Generate Sequences in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, Range, Sequence Generation

Description: Learn how range() generates numeric sequences as arrays in ClickHouse, and how to combine it with arrayJoin to produce rows for date ranges, test data, and sliding windows.

---

Generating a sequence of numbers - a range - is a foundational operation for constructing date ranges, creating test data, building sliding window indices, and iterating over fixed counts. ClickHouse's `range` function produces an array of integers that can be used directly in array operations or unnested into rows with `arrayJoin`.

## Function Signatures

```text
range(end)                    -> Array(T)  -- [0, 1, 2, ..., end-1]
range(start, end)             -> Array(T)  -- [start, ..., end-1]
range(start, end, step)       -> Array(T)  -- [start, start+step, ..., < end]
```

All three forms return an array of integers. The element type `T` is the least common supertype of the arguments — unsigned when all arguments are non-negative (e.g., `Array(UInt8)`), signed when any argument is negative (e.g., `Array(Int16)` for a negative step). The upper bound `end` is exclusive. The `step` can be negative to generate a decreasing sequence.

## Basic Usage

```sql
-- [0..4]
SELECT range(5) AS five_elements;
-- Result: [0, 1, 2, 3, 4]

-- [3..7]
SELECT range(3, 8) AS from_3_to_7;
-- Result: [3, 4, 5, 6, 7]

-- [0, 2, 4, 6, 8] - step 2
SELECT range(0, 10, 2) AS even_numbers;
-- Result: [0, 2, 4, 6, 8]

-- [10, 8, 6, 4, 2] - step -2 (decreasing)
SELECT range(10, 0, -2) AS countdown_even;
-- Result: [10, 8, 6, 4, 2]

-- [1..5] - shift range(5) by 1
SELECT arrayMap(x -> x + 1, range(5)) AS one_to_five;
-- Result: [1, 2, 3, 4, 5]
```

## Generating Rows with arrayJoin

Combining `range` with `arrayJoin` expands the array into multiple rows - one per element. This is the standard ClickHouse technique for generating a variable number of rows without a source table:

```sql
-- Generate 5 rows numbered 0 to 4
SELECT arrayJoin(range(5)) AS n;
-- Produces 5 rows: 0, 1, 2, 3, 4

-- Generate 10 rows numbered 1 to 10
SELECT arrayJoin(range(1, 11)) AS n;

-- Use in a subquery for cross-joining
SELECT n
FROM (
    SELECT arrayJoin(range(1, 6)) AS n
)
ORDER BY n;
```

## Generating Date Sequences

By combining `range` with `toDate` and arithmetic, you can generate a sequence of dates without needing a calendar table:

```sql
-- Generate the next 7 days starting from today
SELECT
    toDate('2024-01-01') + n AS dt
FROM (
    SELECT arrayJoin(range(7)) AS n
)
ORDER BY dt;
-- 2024-01-01
-- 2024-01-02
-- ...
-- 2024-01-07

-- Generate all days in January 2024
SELECT
    toDate('2024-01-01') + n AS day_of_month
FROM (
    SELECT arrayJoin(range(31)) AS n
)
ORDER BY day_of_month;
```

## Filling Gaps in Time-Series Data

Use `range`-generated dates to left-join against actual event data, filling in missing dates with zero counts:

```sql
CREATE TABLE daily_events
(
    event_date Date,
    event_count UInt32
) ENGINE = Memory;

INSERT INTO daily_events VALUES
    ('2024-01-01', 120),
    ('2024-01-03', 85),
    ('2024-01-05', 200);

-- Generate full date range and left-join to fill gaps with 0
SELECT
    generated_date,
    coalesce(e.event_count, 0) AS event_count
FROM (
    SELECT toDate('2024-01-01') + n AS generated_date
    FROM (SELECT arrayJoin(range(7)) AS n)
) AS dates
LEFT JOIN daily_events e ON dates.generated_date = e.event_date
ORDER BY generated_date;
-- 2024-01-01: 120
-- 2024-01-02: 0   (filled)
-- 2024-01-03: 85
-- 2024-01-04: 0   (filled)
-- 2024-01-05: 200
-- 2024-01-06: 0   (filled)
-- 2024-01-07: 0   (filled)
```

## Generating Sliding Window Indices

`range` is used to enumerate window start positions for sliding window analysis over stored arrays:

```sql
-- For an array of 8 elements, generate start indices for windows of size 3
-- Windows start at indices 1, 2, 3, 4, 5, 6 (1-based)
SELECT
    window_start,
    arraySlice([10, 20, 30, 40, 50, 60, 70, 80], window_start, 3) AS window
FROM (
    SELECT arrayJoin(range(1, 7)) AS window_start
);
-- window_start=1: [10, 20, 30]
-- window_start=2: [20, 30, 40]
-- window_start=3: [30, 40, 50]
-- window_start=4: [40, 50, 60]
-- window_start=5: [50, 60, 70]
-- window_start=6: [60, 70, 80]
```

## Generating Test Data

`range` with `arrayJoin` is the fastest way to generate synthetic rows for testing or benchmarking:

```sql
-- Generate 1000 test rows with computed values
SELECT
    n AS id,
    n * 2 AS doubled,
    n % 7 AS day_of_week,
    toDate('2024-01-01') + (n % 365) AS event_date
FROM (
    SELECT arrayJoin(range(1000)) AS n
);
```

## Computing Factorials and Combinatorics

`range` combined with `arrayProduct` computes factorials directly:

```sql
-- n! for n from 1 to 8
SELECT
    n,
    arrayProduct(range(1, n + 1)) AS factorial
FROM (
    SELECT arrayJoin(range(1, 9)) AS n
);
-- 1: 1
-- 2: 2
-- 3: 6
-- 4: 24
-- 5: 120
-- 6: 720
-- 7: 5040
-- 8: 40320
```

## Building Arrays with range and arrayMap

`range` is often the seed for `arrayMap` to build computed arrays of any shape:

```sql
-- Array of squares: [1, 4, 9, 16, 25]
SELECT arrayMap(x -> (x + 1) * (x + 1), range(5)) AS squares;

-- Array of powers of 2: [1, 2, 4, 8, 16, 32]
SELECT arrayMap(x -> pow(2, x), range(6)) AS powers_of_2;
-- Result: [1.0, 2.0, 4.0, 8.0, 16.0, 32.0]

-- Array of evenly spaced floats from 0.0 to 1.0 in 5 steps
SELECT arrayMap(x -> x / 4.0, range(5)) AS linspace;
-- Result: [0.0, 0.25, 0.5, 0.75, 1.0]
```

## Generating Hour Buckets for a Day

Combine `range(24)` with a base timestamp to get all 24 hourly buckets for a given day:

```sql
SELECT
    toStartOfHour(
        toDateTime('2024-01-15 00:00:00') + (h * 3600)
    ) AS hour_bucket
FROM (
    SELECT arrayJoin(range(24)) AS h
)
ORDER BY hour_bucket;
-- 2024-01-15 00:00:00
-- 2024-01-15 01:00:00
-- ...
-- 2024-01-15 23:00:00
```

## Summary

`range(end)`, `range(start, end)`, and `range(start, end, step)` generate integer sequence arrays in ClickHouse. Used with `arrayJoin`, they produce rows on demand for date ranges, gap filling, synthetic test data, and sliding window index generation. Combined with `arrayMap`, they seed computed arrays like squares, powers, and evenly-spaced floats. `range` is the fundamental building block for any query that needs to iterate over a numeric or date sequence without a pre-existing source table.
