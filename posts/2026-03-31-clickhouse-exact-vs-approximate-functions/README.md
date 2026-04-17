# How to Choose Between Exact and Approximate Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Approximate Query, Exact Query, Query Optimization, Analytics

Description: Learn when to use exact versus approximate aggregate functions in ClickHouse to balance query speed, memory use, and result accuracy.

---

## The Core Trade-Off

ClickHouse provides both exact and approximate versions of many aggregate functions. Exact functions produce correct results but require more CPU and memory. Approximate functions sacrifice a small, predictable amount of accuracy in exchange for dramatically faster queries and lower resource usage.

## COUNT DISTINCT - uniqExact vs uniq

```sql
-- Exact: full in-memory hash set
SELECT uniqExact(user_id) AS exact_users FROM events;

-- Approximate: HyperLogLog, ~2% error, much lower memory
SELECT uniq(user_id) AS approx_users FROM events;

-- Better accuracy than uniq, uses combined approach
SELECT uniqCombined(user_id) AS accurate_users FROM events;
```

Use `uniqExact` only when precision is legally or contractually required. For dashboards and monitoring, `uniqCombined` provides ~0.1% error with 3-5x lower memory.

## Quantile - quantileExact vs quantile vs quantileTDigest

```sql
-- Exact: sorts all data, very high memory
SELECT quantileExact(0.99)(latency_ms) FROM http_logs;

-- Reservoir sampling: fast, ~1-3% error for tails
SELECT quantile(0.99)(latency_ms) FROM http_logs;

-- t-digest: best tail accuracy, bounded memory
SELECT quantileTDigest(0.99)(latency_ms) FROM http_logs;
```

For SLA monitoring, `quantileTDigest` is the recommended choice - better tail accuracy than reservoir sampling with predictable memory.

## Group By Cardinality - topK vs exact

```sql
-- Exact top-k (requires full aggregation + sort)
SELECT url, count() AS cnt FROM access_logs GROUP BY url ORDER BY cnt DESC LIMIT 10;

-- Approximate heavy hitters (Filtered Space-Saving algorithm)
SELECT topK(10)(url) FROM access_logs;
```

Approximate `topK` is ideal for finding dominant elements when you do not need an exact rank for items near the boundary.

## Decision Framework

```text
Question: Does 1-3% error affect a business decision?
  YES -> Use exact function
  NO  -> Use approximate function

Question: Is the query used for billing, compliance, or legal reporting?
  YES -> Use exact function
  NO  -> Use approximate function

Question: Is the dataset > 100M rows or query latency > 1 second?
  YES -> Approximate is worth evaluating
  NO  -> Exact is fine
```

## Side-by-Side Comparison Query

Validate approximate functions against exact on a sample:

```sql
SELECT
    uniqExact(user_id)                          AS exact_distinct,
    uniqCombined(user_id)                        AS approx_distinct,
    abs(uniqCombined(user_id) - uniqExact(user_id))
        / uniqExact(user_id)                     AS relative_error,
    quantileExact(0.99)(latency_ms)              AS exact_p99,
    quantileTDigest(0.99)(latency_ms)            AS approx_p99
FROM events
WHERE toDate(ts) = yesterday();
```

## Performance Comparison Reference

| Function Pair | Speed Gain | Memory Reduction | Typical Error |
|---|---|---|---|
| uniqExact vs uniqCombined | 3-5x | 60-80% | ~0.1% |
| quantileExact vs quantileTDigest | 2-4x | 50-70% | ~1% at P99 |
| exact GROUP BY vs topK | 5-20x | 90%+ | bounded overcount |

## Summary

Choose approximate functions for exploratory analytics, dashboards, and monitoring where sub-2% error is acceptable. Use exact functions for billing, compliance reporting, and cases where accuracy directly impacts business decisions. Run periodic validation queries to confirm that approximate results remain within your required error tolerances.
