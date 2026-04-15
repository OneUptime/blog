# Validation Summary: How to Implement Z-Score Anomaly Detection in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, window functions)
- Z-Score statistical method
- Modified Z-Score (median / MAD based)
- Time-series anomaly detection

## Sources Consulted
- ClickHouse Window Functions documentation — https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse median() aggregate function documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/median
- ClickHouse quantile() aggregate function documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse nullIf / Nullable functions documentation — https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse GitHub Issue #53066 — Nested window functions produce ILLEGAL_AGGREGATION error
- Modified Z-Score formula reference (Iglewicz and Hoaglin) — https://www.statology.org/modified-z-score/

## Issues Found

### 1. Nested window functions in modified Z-score query (Critical)
**What was wrong:** The modified Z-score query nested `median(value) OVER ()` inside another `median(...) OVER ()` call. ClickHouse (like most SQL databases) does not allow nesting window functions — this produces error code 184 (`ILLEGAL_AGGREGATION`).

**What was changed:** Rewrote the query to use a two-step CTE approach: the first CTE computes the median, the second computes the MAD (median absolute deviation) using the pre-computed median, and the final SELECT computes the modified Z-score.

### 2. Modified Z-score formula ordering and sign preservation (Minor)
**What was wrong:** The original formula `abs(value - median) / MAD * 0.6745` always returned a positive value due to `abs()`, losing directional information (whether a point is anomalously high or low). The standard formula is `0.6745 * (x - median) / MAD`, which preserves the sign.

**What was changed:** The rewritten query uses `0.6745 * (value - med) / nullIf(mad, 0)`, which follows the standard formula and preserves sign information.

## Review Notes
- The first "Computing Z-Score" example does not use `nullIf` to guard against division by zero (when stddev is 0), while later examples do. This is not strictly an error since ClickHouse returns `inf`/`nan` for float division by zero rather than erroring, but users should be aware of this. The later examples correctly demonstrate the `nullIf` pattern.
- The `median()` function in ClickHouse is an alias for `quantile(0.5)` and uses reservoir sampling, producing non-deterministic approximate results. For exact median computation, `medianExact()` should be used. This is acceptable for anomaly detection where approximate results are sufficient.
- All other SQL examples (`avg`, `stddevPop` as window functions, `ROWS BETWEEN` frame syntax, `PARTITION BY` grouping, CTE with `WITH`) are syntactically correct and valid ClickHouse SQL.
