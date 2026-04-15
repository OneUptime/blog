# How to Use sumCount() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, sumCount

Description: Use sumCount() in ClickHouse to collect sum and count in one pass, enabling correct weighted-average computation when merging partial aggregates across shards.

---

Computing an average seems straightforward until you start merging partial results from distributed shards. Averaging pre-computed averages produces incorrect results because it ignores group sizes. ClickHouse's `sumCount()` function solves this elegantly by returning a `(sum, count)` tuple in a single aggregation pass, making it possible to reconstruct a true weighted average even after partial states have been combined.

## Syntax

```sql
sumCount(column)
```

- `column` - a numeric expression.

Returns a `Tuple(sum, count)` where `sum` is the sum of non-NULL values and `count` is the number of non-NULL rows. Access the tuple fields with `.1` (sum) and `.2` (count).

## Basic Example

```sql
SELECT sumCount(number) AS sc
FROM numbers(5);
-- Returns (10, 5)

SELECT
    sumCount(number).1 AS total_sum,
    sumCount(number).2 AS total_count,
    sumCount(number).1 / sumCount(number).2 AS mean
FROM numbers(5);
```

```text
total_sum | total_count | mean
----------|-------------|-----
10        | 5           | 2
```

## The Problem sumCount Solves

Suppose you have two shards:

| Shard | avg_latency | row_count |
|---|---|---|
| A | 100ms | 1000 rows |
| B | 200ms | 10 rows |

`avg(100, 200) = 150ms` - wrong. The correct weighted average is `(100*1000 + 200*10) / 1010 = 101ms`.

`sumCount` preserves both pieces of information so the merge is always correct.

## Practical Table Example

```sql
CREATE TABLE request_logs
(
    server_id  UInt8,
    latency_ms UInt32,
    logged_at  DateTime
)
ENGINE = MergeTree()
ORDER BY (server_id, logged_at);

INSERT INTO request_logs VALUES
    (1, 80,  '2024-01-01 00:00:00'),
    (1, 120, '2024-01-01 00:01:00'),
    (1, 100, '2024-01-01 00:02:00'),
    (2, 300, '2024-01-01 00:00:00'),
    (2, 250, '2024-01-01 00:01:00');
```

```sql
SELECT
    server_id,
    sumCount(latency_ms).1 AS total_latency,
    sumCount(latency_ms).2 AS request_count,
    total_latency / request_count AS avg_latency
FROM request_logs
GROUP BY server_id
ORDER BY server_id;
```

```text
server_id | total_latency | request_count | avg_latency
----------|---------------|---------------|------------
1         | 300           | 3             | 100
2         | 550           | 2             | 275
```

## Using sumCountMerge with AggregatingMergeTree

The real power of `sumCount` emerges when combined with `AggregatingMergeTree` and the `-State` / `-Merge` combinators for pre-aggregated tables:

```sql
CREATE TABLE latency_agg
(
    server_id      UInt8,
    hour           DateTime,
    sc_state       AggregateFunction(sumCount, UInt32)
)
ENGINE = AggregatingMergeTree()
ORDER BY (server_id, hour);

CREATE MATERIALIZED VIEW latency_mv
TO latency_agg
AS
SELECT
    server_id,
    toStartOfHour(logged_at)       AS hour,
    sumCountState(latency_ms)      AS sc_state
FROM request_logs
GROUP BY server_id, hour;
```

Query the pre-aggregated data:

```sql
SELECT
    server_id,
    sumCountMerge(sc_state).1 / sumCountMerge(sc_state).2 AS avg_latency
FROM latency_agg
GROUP BY server_id;
```

## Cross-Day Weighted Average

Roll up hourly pre-aggregates into a daily average correctly:

```sql
SELECT
    toDate(hour)                                          AS day,
    sumCountMerge(sc_state).1                             AS total_latency,
    sumCountMerge(sc_state).2                             AS total_requests,
    total_latency / total_requests                        AS daily_avg_latency
FROM latency_agg
GROUP BY day
ORDER BY day;
```

Because `sumCountMerge` merges all partial states for each day into a single `(sum, count)` tuple before dividing, the result is always the true weighted average.

## Comparison: sumCount vs avg + count

```sql
-- Incorrect cross-shard rollup
SELECT avg(avg_latency) AS wrong_avg
FROM (
    SELECT server_id, avg(latency_ms) AS avg_latency
    FROM request_logs
    GROUP BY server_id
);

-- Correct rollup using sumCount
SELECT
    sumCount(latency_ms).1 / sumCount(latency_ms).2 AS correct_avg
FROM request_logs;
```

## Summary

`sumCount(column)` returns a `(sum, count)` tuple in a single aggregation pass, removing the need to call `sum()` and `count()` separately. Its primary value is in distributed or incremental aggregation scenarios where partial states from different shards or time windows must be merged correctly into a weighted average. Use `sumCountState` and `sumCountMerge` with `AggregatingMergeTree` materialized views to maintain accurate rolling averages without reprocessing raw data.
