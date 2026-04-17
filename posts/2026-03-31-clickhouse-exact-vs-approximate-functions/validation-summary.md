# Validation Summary: How to Choose Between Exact and Approximate Functions in ClickHouse

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- ClickHouse (aggregate functions: uniq, uniqExact, uniqCombined, quantile, quantileExact, quantileTDigest, topK)
- HyperLogLog (algorithm)
- T-Digest (algorithm)
- Filtered Space-Saving (algorithm)
- Reservoir sampling (algorithm)

## Sources Consulted
- ClickHouse uniq docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- ClickHouse uniqCombined docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqcombined
- ClickHouse uniqExact docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse quantile docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse quantileExact docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantileexact
- ClickHouse quantileTDigest docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantiletdigest
- ClickHouse topK docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/topk

## Issues Found
- **topK algorithm name (fixed)**: The post originally described `topK` as using the "Space-Saving algorithm". ClickHouse documentation explicitly states it uses the "Filtered Space-Saving" algorithm (based on Parallel Space Saving with reduce-and-combine). Updated the inline comment in the code example to read "Filtered Space-Saving algorithm".

## Review Notes
- Parametric aggregate function syntax (`quantile(0.99)(latency_ms)`, `topK(10)(url)`) is correct.
- All function names exist and behave as described in current ClickHouse versions.
- The specific error percentages (~2% for `uniq`, ~0.1% for `uniqCombined`, ~1-3% for `quantile` tails) and the speed/memory ratios in the comparison table are not directly stated in ClickHouse docs. They are reasonable order-of-magnitude estimates commonly cited in the community and consistent with the underlying algorithms (HyperLogLog ~1.6% standard error; uniqCombined improved via array/hash/HLL hybrid). They are not strictly inaccurate, so they were left in place, but readers should treat them as ballpark guidance rather than guarantees — the post itself recommends running the side-by-side validation query, which mitigates this.
- `uniq` is described as HyperLogLog; ClickHouse docs use the broader phrase "adaptive sampling algorithm". The underlying mechanism is HyperLogLog-like, so this characterization is acceptable shorthand.
