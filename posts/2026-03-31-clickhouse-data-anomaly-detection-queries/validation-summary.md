# Validation Summary: How to Build Data Anomaly Detection Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- ClickHouse (SQL, window functions, aggregate functions)
- Statistical anomaly detection patterns (z-score, moving average, IQR, lag-based drop detection)

## Sources Consulted
- [ClickHouse Window Functions documentation](https://clickhouse.com/docs/en/sql-reference/window-functions)
- [ClickHouse GitHub Issue #47818 — "Window function is found in HAVING in query"](https://github.com/ClickHouse/ClickHouse/issues/47818)
- [ClickHouse GitHub Issue #47819 — "QUALIFY Clause (Just like HAVING but for window functions)"](https://github.com/ClickHouse/ClickHouse/issues/47819)
- [ClickHouse: Filtering and Window Functions (Hellmar Becker, 2025)](https://blog.hellmar-becker.de/2025/09/24/clickhouse-filtering-and-window-functions/)
- ClickHouse aggregate function reference for `quantile`, `stddevPop`, `avg`, `count`, `lagInFrame`
- ClickHouse date/time function reference for `toStartOfHour` and `INTERVAL` syntax

## Issues Found

1. **Method 2 (Moving Average Threshold) — `HAVING` filtering on window function alias.**
   The outer query had no `GROUP BY` and tried to filter on `ratio`, which is computed via window functions (`avg(...) OVER (...)`). ClickHouse rejects window functions in `HAVING` (see issue #47818). Replaced `HAVING ratio > 2 OR ratio < 0.5` with `QUALIFY ratio > 2 OR ratio < 0.5`, which is the dedicated clause for filtering on window-function results.

2. **Method 3 (IQR-Based Outlier Detection) — Window functions called inside `HAVING` of an aggregated query.**
   The query had `GROUP BY hour` and then a `HAVING` clause that contained `quantile(0.25)(event_count) OVER ()` and `quantile(0.75)(event_count) OVER ()`. Window functions are evaluated after `HAVING` in SQL execution order, and ClickHouse explicitly errors on this pattern. Restructured the query to perform aggregation in an inner subquery and apply the IQR check via `QUALIFY` on the outer query, where the window quantiles can be computed and filtered.

3. **Method 4 (Sudden Drop Detection) — Same `HAVING` issue as Method 2.**
   The `delta` alias was computed from `lagInFrame(...) OVER (...)`, then filtered via `HAVING delta < -1000`. Replaced with `QUALIFY delta < -1000`.

## Review Notes

- `quantile(0.25)(event_count) OVER ()` is valid in ClickHouse — the docs state that all aggregate functions can be used as window functions over a frame. Note that `quantile` is approximate (reservoir sampling); for fully deterministic IQR bounds, `quantileExact` is an alternative, but the approximate version is appropriate for anomaly detection.
- The `QUALIFY` clause used in the fixes is supported in modern ClickHouse (added around 2024) and is the canonical way to filter on window function output. Readers on older ClickHouse versions would need to wrap the window-producing query in a subquery and filter via `WHERE` instead.
- Method 1's CTE + `CROSS JOIN stats` pattern is valid in ClickHouse, and alias substitution allows `WHERE abs(z_score) > 3` to work correctly (the alias is expanded inline).
- `lagInFrame` is preferred over `lag` in ClickHouse (the post correctly uses `lagInFrame`).
- The "Storing Anomaly Results" snippet references illustrative tables (`anomaly_log`, `anomaly_query_results`) that the reader is expected to define themselves; this is appropriate for a tutorial.
