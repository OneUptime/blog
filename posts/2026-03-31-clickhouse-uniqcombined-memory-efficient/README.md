# How to Use uniqCombined for Memory-Efficient Count Distinct in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, uniqCombined, Count Distinct, Cardinality, Memory

Description: Learn how to use uniqCombined in ClickHouse for accurate approximate count distinct with lower memory usage than uniqExact and better accuracy than uniqHLL12.

---

`uniqCombined` is ClickHouse's recommended function for approximate count distinct queries. It adapts its algorithm based on cardinality: using an exact small set for low cardinalities and switching to a HyperLogLog sketch for high cardinalities, giving better accuracy per memory byte than a fixed HLL.

## How uniqCombined Works

- For small cardinalities (up to a few thousand elements): uses exact counting via array and hash table
- Above that threshold: switches to a HyperLogLog sketch
- Uses 17-bit HLL precision by default (smaller error than `uniqHLL12`)

## Basic Usage

```sql
SELECT uniqCombined(user_id) AS approx_users
FROM events
WHERE event_date = today();
```

## Comparing Functions

```sql
SELECT
    uniqExact(user_id)    AS exact,
    uniqCombined(user_id) AS combined,
    uniqHLL12(user_id)    AS hll12,
    uniq(user_id)         AS uniq
FROM events
WHERE event_date >= today() - 7;
```

Typical result: `uniqCombined` is within 0.5-1% of `uniqExact` and uses significantly less memory (up to ~80x at high cardinalities).

## Daily Active Users

```sql
SELECT
    event_date,
    uniqCombined(user_id) AS dau
FROM events
WHERE event_date >= today() - 30
GROUP BY event_date
ORDER BY event_date;
```

## Lower-Precision Variant

`uniqCombined(12)` uses 12-bit HLL (same precision as `uniqHLL12`) but still uses the adaptive small-set approach:

```sql
SELECT uniqCombined(12)(user_id) AS approx_dau
FROM events
WHERE event_date = today();
```

Use `uniqCombined` (17-bit) for higher accuracy or `uniqCombined(12)` to reduce memory at some accuracy cost.

## Pre-Aggregated States for Rollups

```sql
CREATE TABLE daily_unique_users
(
    event_date Date,
    ustate     AggregateFunction(uniqCombined, UInt64)
)
ENGINE = AggregatingMergeTree
ORDER BY event_date;

INSERT INTO daily_unique_users
SELECT
    event_date,
    uniqCombinedState(user_id) AS ustate
FROM events
GROUP BY event_date;

-- Weekly unique users (merging daily states)
SELECT
    toMonday(event_date) AS week,
    uniqCombinedMerge(ustate) AS weekly_unique_users
FROM daily_unique_users
WHERE event_date >= today() - 28
GROUP BY week
ORDER BY week;
```

## Memory Usage

At 1 million distinct values, `uniqCombined` uses approximately 96 KB of state. `uniqExact` at the same cardinality requires ~8 MB (storing all 1M values as 64-bit integers). The memory savings make `uniqCombined` the default choice for large-cardinality GROUP BY queries.

## Accuracy vs Functions Comparison

| Function | Relative Error | Memory at 1M cardinality |
|----------|---------------|--------------------------|
| `uniqExact` | 0% | ~8 MB |
| `uniqCombined` | ~0.5% | ~96 KB |
| `uniqHLL12` | ~1.6% | ~2.5 KB |
| `uniq` | ~2% | ~4 KB |

## When to Use uniqCombined

- DAU/MAU metrics on large user bases
- Unique IP or session counts per endpoint
- Any approximate count distinct where 0.5-1% error is acceptable
- Pre-aggregated rollup tables storing cardinality states

## Summary

`uniqCombined` is the best general-purpose approximate count distinct function in ClickHouse, offering ~0.5% error with ~80x less memory than `uniqExact`. Use it with `AggregateFunction` column types to build efficient pre-aggregated rollup tables that can serve daily, weekly, and monthly unique user queries by merging stored states.
