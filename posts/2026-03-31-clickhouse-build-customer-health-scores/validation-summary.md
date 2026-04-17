# Validation Summary: How to Build Customer Health Scores with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, aggregate functions)
- SQL (CTEs, window functions, aggregations)

## Sources Consulted
- ClickHouse `any()` aggregate function docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/any
- ClickHouse window functions docs: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `argMax` docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse date/time functions: `today()`, `toStartOfWeek`, `toYYYYMM`
- ClickHouse conditional functions: `multiIf`, `least`, `greatest`

## Issues Found
- **"Accounts Declining Fastest" query used `any()` to pick `latest_score` and `prev_score` per account.** Per ClickHouse documentation, `any()` is non-deterministic — it returns the first encountered value with arbitrary execution order, so the query would not reliably return the latest pair of scores. Fixed by replacing the `any()` calls with `argMax(health_score, computed_at)` and `argMax(prev_score, computed_at)`, which deterministically pick the values corresponding to the most recent `computed_at` per account.

## Review Notes
- The `CREATE TABLE` statement uses valid ClickHouse types (`LowCardinality(String)`, `UInt64`, etc.) and a reasonable MergeTree `PARTITION BY` / `ORDER BY` layout.
- Date arithmetic `today() - 30` is correct in ClickHouse (Date minus integer returns the date N days earlier).
- `lagInFrame(...) OVER (PARTITION BY ... ORDER BY ...)` is valid ClickHouse syntax. The default frame (`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`) allows offset-1 access to the previous row within the ordered partition.
- `multiIf`, `least`, `greatest`, `round`, `toStartOfWeek`, `toYYYYMM` are all valid ClickHouse functions used correctly.
- The "Categorize Accounts into Health Bands" example is illustrative (uses an ellipsis placeholder for the inner CTE) — not runnable as-is but clearly signposted; no correction needed.
- Thresholds in the health score formula (60 logins, 10 features, 10k api calls, 5 tickets) are illustrative; users would tune these to their own usage distribution.
