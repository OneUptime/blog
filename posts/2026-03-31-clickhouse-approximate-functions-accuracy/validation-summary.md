# Validation Summary: ClickHouse Approximate Functions Accuracy Comparison

## Status
validated

## Post Type
Reference / Guide — compares ClickHouse approximate aggregate functions by accuracy, memory, and use case.

## Technologies Covered
- ClickHouse SQL
- Approximate aggregate functions: `uniq`, `uniqHLL12`, `uniqCombined`, `uniqExact`
- Quantile functions: `quantile`, `quantileExact`, `quantileTDigest`, `quantileTiming`, `quantileDD`
- HyperLogLog, t-digest, reservoir sampling, DDSketch algorithms
- `AggregatingMergeTree` materialized views with `-State` / `-Merge` combinators

## Sources Consulted
- ClickHouse docs — uniq: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- ClickHouse docs — uniqHLL12: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqhll12
- ClickHouse docs — uniqCombined: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqcombined
- ClickHouse docs — quantile: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse docs — quantileTDigest: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantiletdigest
- ClickHouse docs — quantileTiming: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantiletiming
- ClickHouse docs — quantileDDSketch: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantileddsketch
- ClickHouse aggregate function reference index: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference

## Issues Found
- **quantileTiming error characteristic was wrong.** The table claimed `~0.01ms` error and `40KB` memory. ClickHouse's `quantileTiming` uses 1ms precision for values <1024ms and 16ms precision up to 30000ms (per docs and the `QuantileTiming.h` bin layout). 0.01ms (10µs) is two to three orders of magnitude smaller than the actual precision. Changed to `~1ms (16ms >1024ms)`. Memory was also overstated; corrected from `40KB` to `~10KB`, which aligns with the fixed-bin histogram size (≈2835 bins × 4 bytes).

## Review Notes
- The `uniq` row lists `~2.5KB` memory; that figure is exact for `uniqHLL12` (2^12 × 5 bits). `uniq`'s adaptive-sampling state is variable and can grow larger in linear-counting mode, but since both functions are "very small" relative to `uniqExact`, the number is a reasonable shorthand and not technically misleading.
- The `~2.2%` error for `uniq` and `uniqHLL12` is a bit higher than the docs' "~1.6% maximum error" for medium datasets, but it is a commonly cited real-world upper bound in community benchmarks. Acceptable as a typical estimate.
- "Mergeable: No" for `quantile` / `quantileExact` is a simplification. All ClickHouse aggregate functions support `-State` / `-Merge` combinators; the post's "No" reflects the practical advice that reservoir sampling and full-sort don't merge as cleanly as sketch-based functions. Fine as written.
- The materialized view DDL (`CREATE MATERIALIZED VIEW ... ENGINE = AggregatingMergeTree() ORDER BY day AS SELECT ...`) is syntactically valid.
- `quantileTiming` value cap at 30,000ms, `count(DISTINCT)` default behavior (equivalent to `uniqExact`), and `uniqCombined` default precision 17 are all confirmed.
