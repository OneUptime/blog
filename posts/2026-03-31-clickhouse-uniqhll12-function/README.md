# How to Use uniqHLL12() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, uniqHLL12, HyperLogLog, Count Distinct

Description: Learn how to use uniqHLL12() in ClickHouse for approximate distinct counting using HyperLogLog with 2^12 registers, balancing accuracy and memory.

---

Counting distinct values at scale is one of the most resource-intensive operations in analytical databases. ClickHouse offers `uniqHLL12()` as a fixed-precision HyperLogLog implementation that uses exactly 2^12 (4096) registers to estimate cardinality. This gives a predictable memory footprint and a typical error rate of around 1.6%, making it a reliable choice for high-cardinality approximate counting in production workloads.

## What Is uniqHLL12()

`uniqHLL12()` applies the HyperLogLog algorithm with a fixed precision of 12 bits, meaning it always allocates 2^12 registers regardless of the input size. This differs from `uniq()`, which uses an adaptive algorithm that may switch between exact and approximate modes depending on the number of distinct values encountered.

The syntax is straightforward:

```sql
SELECT uniqHLL12(column_name) FROM table_name;
```

The function accepts any data type that ClickHouse can hash, including strings, integers, UUIDs, and tuples.

## Basic Usage Examples

### Counting Distinct Users

```sql
-- Count distinct users who visited a page
SELECT
    page_path,
    uniqHLL12(user_id) AS approx_distinct_users
FROM page_views
WHERE event_date >= today() - 7
GROUP BY page_path
ORDER BY approx_distinct_users DESC
LIMIT 20;
```

### Counting Distinct IPs in Telemetry

```sql
-- Approximate unique source IPs per hour
SELECT
    toStartOfHour(timestamp) AS hour,
    uniqHLL12(source_ip) AS unique_ips
FROM network_logs
WHERE timestamp >= now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour;
```

## Memory and Accuracy Characteristics

The fixed 2^12 register count means each `uniqHLL12()` state occupies approximately 2.5 KB of memory, regardless of the dataset size. This makes it predictable for aggregations over millions or billions of rows.

```sql
-- Compare uniq() vs uniqHLL12() on the same dataset
SELECT
    uniq(session_id)       AS exact_or_adaptive,
    uniqHLL12(session_id)  AS hll12_estimate
FROM sessions
WHERE event_date = today();
```

Typical results show `uniqHLL12()` within 1-2% of the true count for cardinalities above a few thousand. For very low cardinalities (under 100), the error can be higher, and `uniq()` or `uniqExact()` may be preferable.

## Using uniqHLL12() with -If and -Array Combinators

ClickHouse combinators extend aggregate functions without requiring subqueries.

```sql
-- Count distinct users who completed checkout vs those who did not
SELECT
    uniqHLL12If(user_id, event_type = 'checkout_complete') AS checkout_users,
    uniqHLL12If(user_id, event_type != 'checkout_complete') AS non_checkout_users
FROM events
WHERE event_date = today();
```

```sql
-- Count distinct values across an array column
SELECT uniqHLL12Array(tag_ids) AS distinct_tags
FROM articles;
```

## Materialized Views with uniqHLL12State()

To pre-aggregate HLL sketches for fast dashboard queries, use the `-State` and `-Merge` suffixes with an `AggregatingMergeTree`.

```sql
-- Create a summary table storing HLL states
CREATE TABLE daily_user_sketches
(
    event_date  Date,
    page_path   String,
    user_sketch AggregateFunction(uniqHLL12, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (event_date, page_path);

-- Populate via a materialized view
CREATE MATERIALIZED VIEW mv_daily_user_sketches
TO daily_user_sketches
AS
SELECT
    toDate(timestamp)            AS event_date,
    page_path,
    uniqHLL12State(user_id)      AS user_sketch
FROM page_views
GROUP BY event_date, page_path;

-- Query the sketch by merging states
SELECT
    event_date,
    page_path,
    uniqHLL12Merge(user_sketch) AS approx_distinct_users
FROM daily_user_sketches
GROUP BY event_date, page_path
ORDER BY event_date DESC, approx_distinct_users DESC;
```

## Comparing uniqHLL12() with Other Distinct Count Functions

```sql
-- Side-by-side comparison of distinct count methods
SELECT
    uniqExact(user_id)   AS exact_count,
    uniq(user_id)        AS adaptive_approx,
    uniqHLL12(user_id)   AS hll12_approx,
    uniqCombined(user_id) AS combined_approx
FROM events
WHERE event_date = today();
```

| Function | Algorithm | Memory | Typical Error |
|---|---|---|---|
| uniqExact | Hash set | O(n) | 0% |
| uniq | Adaptive sampling | Variable | ~2.2% |
| uniqHLL12 | HLL 2^12 | ~2.5 KB | ~1.6% |
| uniqCombined | Adaptive hybrid | Variable | ~0.5% |

Use `uniqHLL12()` when you need a stable memory footprint and consistent accuracy across large distributed aggregations.

## Combining Sketches Across Shards

Because `uniqHLL12()` produces mergeable sketches, you can safely aggregate states produced on different shards:

```sql
-- On a distributed table, ClickHouse merges HLL states automatically
SELECT
    event_date,
    uniqHLL12Merge(user_sketch) AS global_unique_users
FROM distributed_daily_sketches
GROUP BY event_date
ORDER BY event_date;
```

## Summary

`uniqHLL12()` provides approximate distinct counting with a fixed 2^12 HyperLogLog register layout, offering roughly 1.6% error at a constant ~2.5 KB per aggregation state. It is well-suited for high-cardinality counting in materialized views, dashboards, and distributed query pipelines where consistent memory usage matters more than exact results. For scenarios requiring higher accuracy, consider `uniqCombined()`, and for exact counts on smaller datasets, use `uniqExact()`.
