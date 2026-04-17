# Validation Summary: How to Use first_value() and last_value() Aggregate Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect)
- `first_value()` / `last_value()` aggregate and window functions
- `argMin` / `argMax` aggregate functions
- Window function frame clauses (`ROWS BETWEEN ... PRECEDING AND ... FOLLOWING`)
- MergeTree table engine

## Sources Consulted
- ClickHouse `first_value` documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/first_value
- ClickHouse `last_value` documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/last_value
- ClickHouse Window Functions reference: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `argMin` / `argMax` reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmin

## Issues Found
- **Incorrect function reference in the intro paragraph.** The original text read: "so you almost always pair them with `anyIf` or use them inside a window function with an explicit `ORDER BY`." `anyIf` is the `-If` combinator applied to `any` — it filters by a condition and has no ordering guarantee. The correct pairing (and the one the rest of the post actually demonstrates) is `argMin` / `argMax`. Fixed by changing `anyIf` to `argMin`/`argMax` so the intro is consistent with the GROUP BY section and with ClickHouse's recommended pattern.

## Review Notes
- Syntax for `first_value` / `last_value` in both aggregate and window contexts is correct.
- The use of `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to get partition-wide first/last values is correct and necessary — without it, the default frame (RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) would cause `last_value` to return the current row's value rather than the partition's last value. The post correctly addresses this.
- The sample query results (open_price, close_price, low, high, total_volume, change_from_open, running_low, running_open) were spot-checked against the sample inserts and all arithmetic matches.
- The phrasing "in the order rows happen to be stored" is a slight simplification — ClickHouse docs describe aggregate-context behavior as non-deterministic/arbitrary when the source stream is not ordered. The intuition conveyed is acceptable and the post correctly warns the reader to use window functions or `argMin`/`argMax` for deterministic results.
- The post does not cover `first_value(x) RESPECT NULLS` / `IGNORE NULLS` variants or the related settings like `first_value_respect_nulls`. That is fine for a tutorial-level introduction.
