# How to Use numbers() for Generate Series in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, numbers(), Generate Series, Table Function, SQL, Date Range

Description: Learn how to use ClickHouse's numbers() table function as a generate series equivalent for creating sequences, date ranges, and test data.

---

PostgreSQL has `generate_series()`, but ClickHouse achieves the same result with the `numbers()` and `numbers_mt()` table functions. These are essential for generating date ranges, test data, and filling gaps in time-series queries.

## Basic numbers() Usage

```sql
-- Generate integers 0 through 9
SELECT number FROM numbers(10);

-- Generate with offset: 1 through 10
SELECT number + 1 AS n FROM numbers(10);

-- Generate a range: 5 through 14
SELECT number FROM numbers(5, 10);  -- start=5, count=10
```

## Generate a Date Range

Create a continuous sequence of dates:

```sql
SELECT today() - number AS day
FROM numbers(30)
ORDER BY day;
```

Generate the last 24 hours by hour:

```sql
SELECT
    now() - toIntervalHour(number) AS hour,
    formatDateTime(now() - toIntervalHour(number), '%Y-%m-%d %H:00') AS hour_label
FROM numbers(24)
ORDER BY hour;
```

## Fill Gaps in Time-Series Data

Use `numbers()` to fill missing time buckets in a LEFT JOIN:

```sql
WITH
    hours AS (
        SELECT toStartOfHour(now() - toIntervalHour(number)) AS hour
        FROM numbers(24)
    ),
    actual AS (
        SELECT
            toStartOfHour(timestamp) AS hour,
            count() AS event_count
        FROM events
        WHERE timestamp >= now() - INTERVAL 24 HOUR
        GROUP BY hour
    )
SELECT
    h.hour,
    coalesce(a.event_count, 0) AS event_count
FROM hours h
LEFT JOIN actual a ON h.hour = a.hour
ORDER BY h.hour;
```

## Generate Test Data

Quickly populate a table with synthetic data:

```sql
INSERT INTO test_events
SELECT
    toString(number) AS event_id,
    number % 100 AS user_id,
    arrayElement(['click', 'view', 'purchase', 'scroll'], (number % 4) + 1) AS event_type,
    now() - toIntervalSecond(number * 10) AS timestamp,
    rand() % 1000 AS value
FROM numbers(1000000);
```

## numbers_mt() for Parallel Generation

For very large sequences, use `numbers_mt()` which generates numbers in parallel:

```sql
-- Generate 1 billion rows faster
SELECT sum(number) FROM numbers_mt(1000000000);
```

## Generate a Calendar Table

```sql
SELECT
    today() - number AS date,
    toDayOfWeek(today() - number) AS dow,
    formatDateTime(today() - number, '%W') AS day_name,
    toMonth(today() - number) AS month,
    toYear(today() - number) AS year
FROM numbers(365)
ORDER BY date;
```

## Generate Fibonacci-Style Sequences

```sql
SELECT
    number,
    round(pow((1 + sqrt(5)) / 2, number + 1) / sqrt(5)) AS fib_approx
FROM numbers(20);
```

## Summary

ClickHouse's `numbers()` function is the equivalent of `generate_series()` in PostgreSQL. It is invaluable for creating date ranges, filling time-series gaps in LEFT JOINs, generating test data, and building calendar tables. Use `numbers_mt()` for parallelized generation of very large sequences.
