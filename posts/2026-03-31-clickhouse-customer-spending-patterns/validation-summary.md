# Validation Summary: How to Analyze Customer Spending Patterns with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide — practical SQL recipes for analyzing customer spending patterns in ClickHouse.

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, window functions, aggregate combinators)

## Sources Consulted
- ClickHouse Data Types (UUID, UInt64, LowCardinality, Decimal, Date, DateTime): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse Date/Time functions (`today`, `toYYYYMM`, `toDayOfWeek`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse Conditional functions (`multiIf`, `nullIf`): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse Aggregate function combinators (`sumIf`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse SELECT query clauses (HAVING, ORDER BY): https://clickhouse.com/docs/en/sql-reference/statements/select

## Issues Found

1. **"Top Merchants Per Customer" query used `HAVING` to filter a window function result.**
   - What was wrong: The query applied `HAVING merchant_rank <= 5`, but ClickHouse evaluates `HAVING` before window functions are computed, so a window-function alias cannot be referenced in `HAVING`. The query would fail with an unknown identifier / not-an-aggregate error.
   - What changed: Wrapped the aggregated, window-ranked result in a subquery and moved the `merchant_rank <= 5` filter to the outer `WHERE`. Also changed the window function's `ORDER BY` to reference `sum(amount)` directly rather than the alias, since alias resolution inside `OVER (ORDER BY ...)` is not reliable across ClickHouse versions.
   - Why: This is the standard, version-agnostic way to filter by window-function output in ClickHouse (equivalent to `QUALIFY`, which is only available in newer versions).

## Review Notes

- The nested aggregate pattern `sum(amount) / sum(sum(amount)) OVER (PARTITION BY customer_id)` in the "Spending by Category" query is correct and supported in ClickHouse — the inner `sum(amount)` is the per-group aggregate and the outer `sum(...) OVER (...)` aggregates those group totals per customer.
- `toDayOfWeek(txn_date)` returns 1 (Monday) through 7 (Sunday) by default, so the weekend filter `IN (6, 7)` correctly captures Saturday and Sunday.
- The Month-over-Month query's current-month window is 31 days (`today() - 30` through `today()`) while the prior-month window is 30 days (`today() - 60` through `today() - 31`). This is a minor asymmetry; for a strict 30 vs. 30 comparison, the current month could use `txn_date BETWEEN today() - 29 AND today()`. Left unchanged because the intent is a rolling MoM heuristic, not exact calendar months.
- For very large tables, consider adding a secondary data-skipping index on `category` or `merchant_id`, or pre-aggregating into a `SummingMergeTree` / materialized view, to keep these per-customer scans fast. Not an error in the post — just a future optimization.
