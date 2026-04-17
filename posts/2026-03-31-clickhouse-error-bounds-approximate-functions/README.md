# How to Estimate Error Bounds of Approximate Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Approximate Function, Error Bound, Sampling, Statistics

Description: Learn how to quantify and interpret the error bounds of ClickHouse approximate functions including sampling, HyperLogLog, and t-digest to know when results are accurate enough.

---

Approximate functions in ClickHouse trade accuracy for speed. Understanding the expected error bounds helps you decide which function to use and when the approximation is good enough for your use case.

## SAMPLE Clause Error

For a sample fraction `f` and true count `N`, the number of sampled rows is approximately `n = N * f`. The relative standard error (RSE) for a count estimate is:

```text
RSE = 1 / sqrt(n)
```

Examples:
- 10% sample, 100K sampled rows: RSE = 0.3%
- 1% sample, 10K sampled rows: RSE = 1%
- 0.1% sample, 1K sampled rows: RSE = 3.2%

Validate empirically:

```sql
SELECT
    count() * 10 AS approx_count,
    count()      AS sampled_count,
    1 / sqrt(count()) AS rse
FROM events
SAMPLE 0.1
WHERE event_date = today();
```

## uniqHLL12 Error

`uniqHLL12` uses 12-bit HyperLogLog with a typical relative error of ~1.6%:

```sql
SELECT
    uniqExact(user_id)              AS exact,
    uniqHLL12(user_id)              AS hll,
    abs(uniqHLL12(user_id) - uniqExact(user_id)) * 100.0 / uniqExact(user_id) AS error_pct
FROM events
WHERE event_date = today();
```

## uniqCombined Error

`uniqCombined` uses a combination of HLL and a small exact set for cardinalities below a threshold:

```sql
SELECT
    uniqExact(user_id)        AS exact,
    uniqCombined(user_id)     AS combined,
    uniqCombined(12)(user_id) AS combined12
FROM events
WHERE event_date = today();
```

`uniqCombined` achieves ~0.8% error at high cardinalities.

## quantileTDigest Error

t-digest is most accurate at the tails. Typical absolute error at the median is larger than at extreme percentiles:

```sql
SELECT
    quantileExact(0.99)(response_ms)   AS p99_exact,
    quantileTDigest(0.99)(response_ms) AS p99_tdigest,
    abs(quantileExact(0.99)(response_ms) - quantileTDigest(0.99)(response_ms)) AS abs_error
FROM api_requests
WHERE event_date = today();
```

## topK Error

`topK` implements the Filtered Space-Saving algorithm. Per the ClickHouse documentation, it does not provide a guaranteed result — in certain situations, errors may occur and it may return frequent values that aren't the most frequent values. In practice, items that are significantly more frequent than others are reliably returned, while frequency estimates may be slightly overestimated:

```sql
SELECT topK(10)(event_name) AS top_10_events FROM events WHERE event_date = today();
```

## Comparing All Approximate Functions

```sql
SELECT
    -- Cardinality
    uniqExact(user_id)    AS exact_users,
    uniqHLL12(user_id)    AS hll_users,
    uniqCombined(user_id) AS combined_users,
    -- Quantile
    quantileExact(0.95)(response_ms)   AS p95_exact,
    quantileTDigest(0.95)(response_ms) AS p95_tdigest
FROM events
WHERE event_date = today();
```

## Error Bounds Summary

| Function | Typical Relative Error | Memory |
|----------|----------------------|--------|
| `SAMPLE 0.1` | ~0.3% at 100K rows | Proportional |
| `uniqHLL12` | ~1.6% | 2.5 KB/group |
| `uniqCombined` | ~0.8% | ~96 KiB/group (default HLL_precision=17) |
| `quantileTDigest` | <1% at tails | Proportional to compression |
| `topK(100)` | <5% frequency estimate | Fixed |

## When Exact Functions Are Required

- Billing and financial reporting
- Compliance and audit logs
- Deduplication before ingestion

For all other analytics, approximate functions provide sufficient accuracy at dramatically lower cost.

## Summary

ClickHouse approximate functions have well-defined error characteristics. Use sampling when you need additive aggregate approximations at scale, `uniqCombined` for cardinality estimates below 2% error, and `quantileTDigest` for accurate tail percentiles. Always validate error bounds against exact results on a representative sample before switching production dashboards to approximate queries.
