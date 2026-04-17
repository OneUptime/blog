# ClickHouse Approximate Functions Accuracy Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Approximate Function, uniq, Quantile, HyperLogLog, Accuracy

Description: A comparison of ClickHouse approximate aggregate functions - uniq, uniqHLL12, uniqCombined, quantile, quantileTDigest - covering accuracy, memory usage, and use cases.

---

## Why Approximate Functions

Exact aggregations on billions of rows are expensive in time and memory. ClickHouse provides a family of approximate functions that trade small accuracy errors for dramatically lower resource usage. Understanding the accuracy characteristics helps you choose the right function.

## Approximate COUNT DISTINCT

```text
Function         | Algorithm      | Relative Error | Memory (per state) | Notes
-----------------|----------------|----------------|--------------------|---------------------------
count(DISTINCT)  | Exact          | 0%             | O(n)               | Exact but high memory
uniq             | Adaptive sampling | ~2.2%       | ~2.5KB             | Good default
uniqHLL12        | HyperLogLog      | ~2.2%       | ~2.5KB             | Explicit HLL12
uniqCombined     | Combined strategies | ~0.3-2%   | Variable           | Better accuracy, more memory
uniqExact        | Hash set       | 0%             | O(n)               | Exact, high memory
```

```sql
-- Compare outputs on the same data
SELECT
  uniqExact(user_id)    AS exact,
  uniq(user_id)         AS hll_approx,
  uniqHLL12(user_id)    AS hll12,
  uniqCombined(user_id) AS combined
FROM events
WHERE event_time >= today() - 7;
```

Typical result: all values within 1-3% of exact for large datasets (over 1M distinct values).

## Approximate Quantiles

```text
Function              | Algorithm    | Error Guarantee | Memory       | Mergeable
----------------------|--------------|-----------------|--------------|----------
quantile              | Reservoir    | ~1%             | O(1) sampled | No
quantileExact         | Full sort    | 0%              | O(n)         | No
quantileTDigest       | t-digest     | ~1% (tails)     | ~10KB        | Yes
quantileTiming        | Fixed bins   | ~1ms (16ms >1024ms) | ~10KB    | Yes
quantileDD            | DDSketch     | ~1%             | Variable     | Yes
```

```sql
SELECT
  quantile(0.5)(response_ms)      AS p50,
  quantile(0.95)(response_ms)     AS p95,
  quantile(0.99)(response_ms)     AS p99,
  quantileExact(0.99)(response_ms) AS p99_exact
FROM api_logs
WHERE request_time >= today();
```

## quantileTiming - For Response Times

Optimized for millisecond latency values (0-30,000ms range). Extremely fast and memory-efficient.

```sql
SELECT
  quantileTiming(0.95)(response_ms) AS p95,
  quantileTiming(0.99)(response_ms) AS p99
FROM api_logs
GROUP BY toStartOfMinute(request_time);
```

## Using in Materialized Views

Approximate functions with `AggregatingMergeTree` must use `State` and `Merge` variants:

```sql
CREATE MATERIALIZED VIEW mv_daily_uniq
ENGINE = AggregatingMergeTree()
ORDER BY day AS
SELECT
  toDate(event_time) AS day,
  uniqState(user_id) AS daily_users_state
FROM events
GROUP BY day;

-- Query the MV
SELECT day, uniqMerge(daily_users_state) AS daily_users
FROM mv_daily_uniq
GROUP BY day
ORDER BY day;
```

## Accuracy vs Memory Tradeoff Summary

For cardinality estimation, `uniq` is the best default at ~2.2% error and very low memory. Use `uniqCombined` when you need better accuracy (sub-1%) and can afford more memory. Use `uniqExact` only for compliance or billing-critical metrics. For quantiles, prefer `quantileTDigest` when results need to be merged across shards, and `quantileTiming` for latency metrics.

## Summary

ClickHouse's approximate aggregate functions give you sub-percent accuracy at a fraction of the memory cost of exact computation. Use `uniq` for cardinality estimation, `quantileTDigest` for mergeable percentiles, and `quantileTiming` for response time histograms. All approximate functions have `State`/`Merge` variants for use in `AggregatingMergeTree` materialized views.
