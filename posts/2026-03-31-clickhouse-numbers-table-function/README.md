# How to Use numbers() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Table Function, numbers(), Query Pattern, Analytics

Description: Learn how the numbers() and numbers_mt() table functions generate integer sequences in ClickHouse for date series, test data generation, range queries, and loop simulation.

---

`numbers(N)` is a ClickHouse table function that generates a single-column table named `number` containing the integers `0, 1, 2, ..., N-1`. `numbers(offset, N)` generates `offset, offset+1, ..., offset+N-1`. `numbers_mt(N)` is the multi-threaded variant that generates the same sequence using parallel threads, making it faster for very large N values. These functions are the idiomatic way in ClickHouse to produce sequential integer sequences for date-range generation, test data population, loop simulation, and indexed array operations.

## Basic numbers() Usage

```sql
-- Generate integers 0 through 9
SELECT number FROM numbers(10);
```

```text
number
0
1
2
3
4
5
6
7
8
9
```

```sql
-- Generate integers starting from an offset
SELECT number FROM numbers(5, 5);
```

```text
number
5
6
7
8
9
```

## Counting Rows Produced

```sql
SELECT count() FROM numbers(1000000);
```

```text
count()
1000000
```

## Generating a Date Series

One of the most common uses of `numbers()` is producing a continuous date range for gap-filling.

```sql
-- Generate the last 30 days as Date values
SELECT
    today() - number      AS day,
    formatDateTime(today() - number, '%Y-%m-%d') AS day_str
FROM numbers(30)
ORDER BY day;
```

```text
day         day_str
2024-05-17  2024-05-17
2024-05-18  2024-05-18
...
2024-06-15  2024-06-15
```

## Filling Gaps in a Time Series

```sql
-- Left join a date series to fill missing days with zero
WITH date_series AS (
    SELECT today() - number AS day
    FROM numbers(30)
)
SELECT
    ds.day,
    ifNull(stats.page_views, 0) AS page_views
FROM date_series AS ds
LEFT JOIN (
    SELECT
        toDate(event_time) AS day,
        count()            AS page_views
    FROM events
    WHERE event_type = 'page_view'
    GROUP BY day
) AS stats ON ds.day = stats.day
ORDER BY ds.day;
```

## Generating Hourly Buckets

```sql
-- 24-hour timeline for today, starting at midnight UTC
SELECT
    toStartOfHour(toDateTime(today()) + (number * 3600)) AS hour_start
FROM numbers(24)
ORDER BY hour_start;
```

```text
hour_start
2024-06-15 00:00:00
2024-06-15 01:00:00
...
2024-06-15 23:00:00
```

## Creating Test Data

`numbers()` is the standard way to generate large synthetic datasets for benchmarking.

```sql
-- Insert 10 million synthetic event rows
INSERT INTO events (event_time, event_type, user_id)
SELECT
    now() - (rand() % 86400)         AS event_time,
    ['page_view','click','purchase'][1 + (rand() % 3)] AS event_type,
    rand() % 1000000                  AS user_id
FROM numbers(10000000);
```

```sql
-- Synthetic user table with realistic-looking data
SELECT
    number                            AS user_id,
    concat('user_', toString(number)) AS username,
    concat('user', toString(number), '@example.com') AS email,
    today() - (rand() % 365)          AS signup_date,
    rand() % 100                      AS score
FROM numbers(1, 100001);
```

## Factorial and Mathematical Sequences

```sql
-- Compute factorials using numbers() and arrayProduct
SELECT
    number AS n,
    arrayProduct(arrayMap(i -> toFloat64(i), range(1, number + 1))) AS factorial
FROM numbers(1, 11)
ORDER BY n;
```

```text
n   factorial
1   1
2   2
3   6
4   24
5   120
6   720
7   5040
8   40320
9   362880
10  3628800
```

## Generating a Multiplication Table

```sql
SELECT
    a.number + 1 AS row_num,
    b.number + 1 AS col_num,
    (a.number + 1) * (b.number + 1) AS product
FROM numbers(5) AS a
CROSS JOIN numbers(5) AS b
ORDER BY row_num, col_num;
```

## Simulating a Loop for Per-Step Calculations

```sql
-- Compound interest calculation over 12 months
SELECT
    number + 1               AS month,
    1000.0 * pow(1.05 / 12 + 1, number + 1) AS balance
FROM numbers(12)
ORDER BY month;
```

```text
month  balance
1      1004.17
2      1008.35
...
12     1051.16
```

## numbers_mt() for Large Sequences

`numbers_mt()` uses multiple threads and is faster for very large sequences.

```sql
-- Multi-threaded generation of 1 billion row sequence (count only)
SELECT count() FROM numbers_mt(1000000000);
```

For large test data inserts, `numbers_mt` reduces wall-clock generation time.

```sql
-- Insert 100M rows using multi-threaded number generation
INSERT INTO large_test_table
SELECT
    number                   AS id,
    rand() % 10000           AS user_id,
    rand() % 1000            AS product_id,
    toFloat64(rand() % 1000) / 10.0 AS amount
FROM numbers_mt(100000000);
```

## Generating Fixed-Width Padded Identifiers

```sql
SELECT
    number,
    leftPad(toString(number), 6, '0') AS padded_id
FROM numbers(1, 5);
```

```text
number  padded_id
1       000001
2       000002
3       000003
4       000004
5       000005
```

## Building a Histogram Bucket Series

```sql
-- Create fixed-width histogram buckets for a numeric column
SELECT
    number * 100              AS bucket_start,
    number * 100 + 99         AS bucket_end,
    countIf(score BETWEEN number * 100 AND number * 100 + 99) AS freq
FROM numbers(10)
CROSS JOIN (
    SELECT rand() % 1000 AS score FROM numbers(100000)
) AS data
GROUP BY bucket_start, bucket_end
ORDER BY bucket_start;
```

## Generating a Cartesian Product for Combinations

```sql
-- All (segment, day) combinations for a dashboard pre-fill
SELECT
    segment_names.name AS segment,
    dates.day
FROM (
    SELECT ['active', 'new', 'churned'][number + 1] AS name FROM numbers(3)
) AS segment_names
CROSS JOIN (
    SELECT today() - number AS day FROM numbers(7)
) AS dates
ORDER BY segment, day;
```

## Summary

`numbers(N)` and `numbers(offset, N)` generate integer sequences in a single `number` column, making them the standard tool in ClickHouse for date-series generation, gap-filling with LEFT JOIN, synthetic test data creation, mathematical sequence computation, and loop simulation via CROSS JOIN. Use `numbers_mt(N)` when generating very large sequences (hundreds of millions or more) to take advantage of parallel generation. The functions have zero overhead at small N and scale to billions of rows for benchmark workloads.
