# Validation Summary: How to Build Box Plot Statistics in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect)
- ClickHouse aggregate functions: `quantile`, `quantiles`, `quantileTDigest`
- ClickHouse date functions: `today()`, `toDate()`
- Common Table Expressions (CTEs) and `WITH` expression aliases
- Statistical concepts: five-number summary, IQR, Tukey fences, outlier detection

## Sources Consulted
- ClickHouse docs — `quantile`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse docs — `quantiles`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiles
- ClickHouse docs — `quantileTDigest`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletdigest
- ClickHouse docs — `WITH` clause: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse docs — date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- Tukey, J. W. (1977), *Exploratory Data Analysis* — standard 1.5×IQR whisker/fence definition

## Issues Found
No technical issues found.

- The parametric aggregate syntax `quantile(level)(expr)` and `quantiles(l1, l2, ...)(expr)` is correct.
- `quantiles(0.25, 0.50, 0.75)(latency_ms)` correctly returns an array `[Q1, median, Q3]`.
- `quantileTDigest` is a valid ClickHouse function and the claim that it offers faster approximate results at scale is accurate.
- The `WITH expression AS alias` pattern works in ClickHouse — aliases (including ones referencing earlier aliases like `iqr = q3 - q1`) are substituted into the main `SELECT`.
- The CTE form `WITH stats AS (SELECT ...) SELECT ... FROM request_logs, stats` is valid; the comma-join cross-joins the single-row CTE against the base table, which is a common pattern in ClickHouse.
- The five-number summary, IQR = Q3 − Q1, and 1.5×IQR whisker/fence definitions are mathematically correct (Tukey).

## Review Notes
- Performance tip for future readers: when the same aggregate is referenced multiple times via `WITH` expression aliases, ClickHouse may re-evaluate the expression at each reference. For very large datasets, computing the quartiles once via `quantiles(...)` into an array and indexing into it can be slightly more efficient than multiple `quantile()` calls — but functionally both approaches produce identical results.
- `quantile` uses reservoir sampling (an approximate algorithm) by default. For exact results, `quantileExact` could be mentioned as an alternative, though it uses more memory. This is a potential future enhancement, not a correctness issue.
- The outlier-count query cross-joins the CTE with the full table. This is correct but scans `request_logs` twice; on very large tables a single-pass approach using window functions or `arrayJoin` over precomputed quartiles could be faster. Again, a possible improvement — not an error.
