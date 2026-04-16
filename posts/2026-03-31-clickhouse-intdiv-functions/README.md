# How to Use intDiv() and intDivOrZero() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Math Function, Integer, Division

Description: Learn how intDiv() performs integer division and intDivOrZero() handles division-by-zero safely in ClickHouse, with examples for bucketing, pagination, and safe division.

---

`intDiv()` performs integer division with truncation toward zero, discarding any fractional part and returning only the integer quotient. `intDivOrZero()` behaves identically except it returns 0 instead of raising an exception when the divisor is zero. These functions are preferable to regular division followed by `toInt64()` casting because they maintain integer arithmetic throughout and make the intent explicit. They are commonly used for bucketing continuous values, computing page offsets, assigning items to groups in round-robin fashion, and anywhere exact integer quotients are needed.

## Function Signatures

```text
intDiv(a, b)       -- integer division; throws on division by zero
intDivOrZero(a, b) -- integer division; returns 0 when b = 0
```

The result has the same width as the dividend (the first argument). The result is truncated toward zero (not floored), so `intDiv(-7, 2)` returns -3, not -4.

## Basic Usage

```sql
SELECT
    intDiv(10, 3)          AS div_10_3,
    intDiv(10, 10)         AS div_10_10,
    intDiv(7, 2)           AS div_7_2,
    intDiv(-7, 2)          AS div_neg7_2,
    intDivOrZero(10, 0)    AS div_by_zero_safe,
    intDivOrZero(10, 3)    AS div_normal;
```

`intDiv(10, 3)` = 3, `intDiv(-7, 2)` = -3 (truncated toward zero), `intDivOrZero(10, 0)` = 0.

## Fixed-Width Time Bucketing

Group events into fixed-duration time buckets by dividing the Unix timestamp by the bucket size in seconds.

```sql
CREATE TABLE api_requests
(
    ts         DateTime,
    endpoint   String,
    latency_ms UInt32
)
ENGINE = MergeTree
ORDER BY (ts, endpoint);

INSERT INTO api_requests VALUES
('2024-11-01 10:00:05', '/search', 42),
('2024-11-01 10:00:12', '/search', 58),
('2024-11-01 10:01:03', '/api',    31),
('2024-11-01 10:01:45', '/search', 120),
('2024-11-01 10:02:10', '/api',    28),
('2024-11-01 10:02:55', '/search', 67);
```

Group requests into 60-second buckets using integer division on the Unix timestamp.

```sql
SELECT
    toDateTime(intDiv(toUnixTimestamp(ts), 60) * 60)  AS minute_bucket,
    endpoint,
    count()                                            AS request_count,
    round(avg(latency_ms), 1)                          AS avg_latency
FROM api_requests
GROUP BY minute_bucket, endpoint
ORDER BY minute_bucket, endpoint;
```

## Pagination Offset Computation

Calculate which page a given row falls on and its position within that page.

```sql
SELECT
    row_number,
    page_size,
    intDiv(row_number - 1, page_size) + 1  AS page_number,
    ((row_number - 1) % page_size) + 1     AS position_on_page
FROM (
    SELECT
        arrayJoin(range(1, 16)) AS row_number,
        5                        AS page_size
)
ORDER BY row_number;
```

## Assigning Items to Buckets

Use `intDiv()` with row numbers to assign items evenly across a fixed number of buckets. Combine with `%` for round-robin assignment.

```sql
CREATE TABLE work_items
(
    item_id    UInt64,
    item_name  String
)
ENGINE = MergeTree
ORDER BY item_id;

INSERT INTO work_items SELECT number + 1, concat('item_', toString(number + 1))
FROM numbers(20);
```

```sql
SELECT
    item_id,
    item_name,
    (item_id - 1) % 4 AS worker_id,
    intDiv(item_id - 1, 5) AS batch_number
FROM work_items
ORDER BY item_id;
```

## Safe Division in Aggregations

Use `intDivOrZero()` when the divisor might be zero due to data conditions, preventing query failures.

```sql
CREATE TABLE experiment_results
(
    variant     String,
    impressions UInt64,
    conversions UInt64
)
ENGINE = MergeTree
ORDER BY variant;

INSERT INTO experiment_results VALUES
('control',   10000, 320),
('variant_a',  8500, 290),
('variant_b',     0,   0);
```

```sql
SELECT
    variant,
    impressions,
    conversions,
    intDivOrZero(conversions * 10000, impressions) AS cpm_rate
FROM experiment_results;
```

The `variant_b` row has zero impressions; `intDivOrZero` returns 0 instead of an error.

## Summary

`intDiv()` and `intDivOrZero()` perform integer division with truncation toward zero in ClickHouse. Use `intDiv()` for bucketing timestamps into equal-width intervals, computing page numbers, batch assignments, and any fixed-width grouping pattern. Use `intDivOrZero()` whenever the divisor may be zero in your data to avoid query failures. Both are integer-typed and more explicit than casting the result of regular float division. Combine with the modulo operator `%` to compute both the quotient and remainder in the same query.
