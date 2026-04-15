# How to Use numbers() and zeros() Table Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, numbers(), zeros(), Table Function, Test Data, SQL, Analytics

Description: Learn how to use the numbers() and zeros() table functions in ClickHouse to generate integer sequences, fill date gaps, create test data, and produce zero-filled series.

---

ClickHouse provides two related table functions for generating synthetic row sequences: `numbers(N)` generates integers 0 through N-1, and `zeros(N)` generates N rows all containing the value zero. Both have multi-threaded variants (`numbers_mt` and `zeros_mt`) for large-scale generation. They are the standard tools for date series generation, gap-filling, benchmark data creation, and loop simulation in ClickHouse SQL.

## numbers() Basics

```sql
-- Integers 0..4
SELECT number FROM numbers(5);
```

```text
number
0
1
2
3
4
```

```sql
-- With offset: integers 10..14
SELECT number FROM numbers(10, 5);
```

```text
number
10
11
12
13
14
```

## zeros() Basics

`zeros(N)` generates N rows, all with value zero. This is useful when you want rows without caring about the value.

```sql
SELECT zero FROM zeros(5);
```

```text
zero
0
0
0
0
0
```

Use `zeros()` when the row count matters but the column value does not - for example, to generate rows for a CROSS JOIN:

```sql
-- Generate 1000 synthetic rows where row-level data comes from rand()
SELECT
    rand() % 100000 AS user_id,
    rand() % 1000   AS product_id
FROM zeros(1000);
```

## Generating a Date Series

```sql
-- Last 7 days
SELECT today() - number AS day
FROM numbers(7)
ORDER BY day;
```

```text
day
2026-03-25
2026-03-26
2026-03-27
2026-03-28
2026-03-29
2026-03-30
2026-03-31
```

## Gap-Filling with LEFT JOIN

```sql
WITH days AS (
    SELECT today() - number AS day FROM numbers(30)
)
SELECT
    d.day,
    ifNull(s.revenue, 0.0) AS revenue
FROM days AS d
LEFT JOIN (
    SELECT toDate(order_time) AS day, sum(amount) AS revenue
    FROM orders
    GROUP BY day
) AS s ON d.day = s.day
ORDER BY d.day;
```

## Using zeros() for Row Count Control

When you need exactly N rows for a CROSS JOIN or an enumeration and the zero value is irrelevant:

```sql
-- Generate 90 combinations of segment and day
SELECT
    segments.name AS segment,
    today() - days.n AS day
FROM (
    SELECT ['new', 'active', 'churned'][number + 1] AS name
    FROM numbers(3)
) AS segments
CROSS JOIN (
    SELECT number AS n FROM numbers(30)
) AS days
ORDER BY segment, day;
```

## numbers_mt() and zeros_mt() for Large Sequences

Use the `_mt` variants for very large sequences to take advantage of multi-threaded generation:

```sql
-- Count 1 billion rows (test throughput)
SELECT count() FROM numbers_mt(1000000000);

-- Insert 100M test rows
INSERT INTO benchmark_table (id, val)
SELECT number AS id, rand() % 10000 AS val
FROM numbers_mt(100000000);
```

## Comparing numbers() and zeros()

```text
Function     Column     Typical Use
numbers(N)   number     Sequence generation, date math, IDs
zeros(N)     zero       Row generation when value is irrelevant
numbers_mt   number     Large-scale parallel sequence
zeros_mt     zero       Large-scale parallel row generation
```

## Building a Histogram with zeros() + CROSS JOIN

```sql
-- 10 equal-width buckets across a score range 0-99
SELECT
    b.bucket * 10     AS bucket_start,
    b.bucket * 10 + 9 AS bucket_end,
    countIf(score >= b.bucket * 10 AND score <= b.bucket * 10 + 9) AS freq
FROM (SELECT rand() % 100 AS score FROM zeros(100000)) AS data
CROSS JOIN (SELECT number AS bucket FROM numbers(10)) AS b
GROUP BY bucket_start, bucket_end
ORDER BY bucket_start;
```

## Summary

`numbers(N)` generates sequential integers (optionally with an offset) and is the standard tool for date series, test data, and loop simulation. `zeros(N)` generates N constant-zero rows and is useful when you need rows without a meaningful column value. Both functions have `_mt` variants for multi-threaded generation at scale. Together they cover virtually all synthetic row generation needs in ClickHouse.
