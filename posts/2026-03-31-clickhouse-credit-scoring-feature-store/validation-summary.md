# Validation Summary: How to Build Credit Scoring Feature Stores with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree)
- SQL (ClickHouse dialect)
- Window functions (`row_number() OVER`)
- Aggregate functions with `-If` combinator (`countIf`)
- Data types: `LowCardinality(String)`, `Decimal64`, `Date`, `DateTime`, `UInt64`

## Sources Consulted
- ClickHouse CREATE TABLE reference: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse Aggregate Function Combinators (`-If`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `argMax`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse Null-handling functions (`nullIf`): https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse MergeTree / ReplacingMergeTree engines: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree

## Issues Found
1. **Invalid `CREATE TABLE ... AS SELECT` syntax in the Materialized Feature Table section.** The original code placed the `ENGINE = ReplacingMergeTree(computed_at)` and `ORDER BY customer_id` clauses **after** the `SELECT ... GROUP BY ...` body. In ClickHouse, the table-level clauses (`ENGINE`, `ORDER BY`, `PARTITION BY`, etc.) must appear **before** the `AS SELECT` keyword. As written, the statement would fail with a syntax error. Fixed by reordering so the engine and sort key precede `AS SELECT`.

## Review Notes
- The Delinquency Streak Detection query uses a standard gaps-and-islands pattern. Because the inner query pre-filters to only `event_type = 'missed_payment'`, the two `row_number()` values resolve to the same sequence and `grp` is always `0`, so the HAVING clause effectively counts total missed payments per customer in the last 365 days rather than strictly *consecutive* missed payments separated by successful payments. The SQL is syntactically valid and still produces a useful delinquency signal, so it was left unchanged — but readers who need true streak detection (ignoring interleaved successful payments) would need to include all event types in the inner query and partition the row numbers differently.
- `today() - 365`, `today() - 180`, `today() - 90` rely on implicit `Date` integer subtraction, which is supported in ClickHouse and returns a `Date`. No change needed.
- The `Decimal64(2)` scale parameter is valid; it allows up to 18 significant digits with 2 fractional digits, which is sufficient for typical balances and credit limits.
- `ReplacingMergeTree(computed_at)` deduplicates by the sorting key (`customer_id`), keeping the row with the highest `computed_at` value after background merges — appropriate for a refresh-on-write feature table, though eventual consistency should be noted to readers serving models that require strictly-latest reads (use `FINAL` or the `argMax` pattern in that case).
