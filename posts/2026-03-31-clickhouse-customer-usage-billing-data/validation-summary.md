# Validation Summary: How to Track Customer Usage and Billing Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide — schema design and SQL query recipes for telecom billing analytics on ClickHouse.

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree, Materialized Views)
- ClickHouse SQL functions: `toYYYYMM`, `toStartOfMonth`, `today`, `toDate`, `sumIf`, `count`, `round`
- ClickHouse data types: `UUID`, `UInt64`, `UInt32`, `UInt8`, `DateTime`, `LowCardinality(String)`, `FixedString(2)`

## Sources Consulted
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse Materialized Views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse MergeTree engines (SummingMergeTree): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse aggregate function combinators (`-If`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `LowCardinality` and `FixedString` type references

## Issues Found
1. **Broken date range in "Monthly Bill Summary per Account"**: The original clause `WHERE occurred_at >= toStartOfMonth(today() - 1) AND occurred_at < toStartOfMonth(today())` only worked on the 1st of the month. On any other day (e.g., April 17), `today() - 1` is yesterday (a Date minus an integer subtracts days), so `toStartOfMonth(today() - 1)` resolves to the start of the *current* month and the range becomes empty. Replaced with `toStartOfMonth(today() - INTERVAL 1 MONTH)`, which correctly returns the start of the previous month regardless of day.
2. **Unit/math inconsistency for `rated_cost`**: The schema comment said `-- in microcents`, but the subsequent queries divide by `1e6` and alias the result as dollars. If `rated_cost` were actually in microcents (10⁻⁸ dollars), `/1e6` would yield cents, not dollars. Changed the comment to `-- in micros (millionths of a dollar)`, which matches the division used throughout the post and aligns with the widely used "micros" convention (e.g., Google's billing APIs).

## Review Notes
- `UInt32` for `rated_cost` (micros) supports per-event values up to ~$4,294. That's fine for a single usage event; aggregate `sum()` results are promoted to `UInt64` internally and do not overflow.
- The materialized view is valid without a `TO` clause; ClickHouse creates an implicit `.inner.*` target from the SELECT column list and the declared engine. Teams running these at scale often prefer an explicit target table (`TO billing_daily`) so the storage can be recreated without dropping the view.
- All SQL functions used (`sumIf`, `toYYYYMM`, `toStartOfMonth`, `toDate`, `round`, `today`, `count`) are current and non-deprecated in ClickHouse.
- Using `today() - 30` for a 30-day rolling window is valid Date arithmetic in ClickHouse (integer days).
