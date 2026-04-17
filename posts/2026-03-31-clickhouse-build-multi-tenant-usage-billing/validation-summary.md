# Validation Summary: How to Build Multi-Tenant Usage Billing with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree / ReplacingMergeTree engines)
- ClickHouse SQL dialect (window functions, QUALIFY, CTEs, Decimal/DateTime64 types)
- Usage-based / metering billing patterns

## Sources Consulted
- ClickHouse ReplacingMergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse Decimal data type: https://clickhouse.com/docs/sql-reference/data-types/decimal
- ClickHouse QUALIFY clause: https://clickhouse.com/docs/sql-reference/statements/select/qualify
- ClickHouse Window Functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse Date/Time functions (toStartOfMonth, toYYYYMM): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse FINAL modifier: https://clickhouse.com/docs/sql-reference/statements/select/from#final-modifier

## Issues Found

1. **`quantity Float64` combined with `unit_price Decimal(10, 6)` produces a type error.**
   ClickHouse's Decimal docs explicitly state: *"Operations between Decimal and Float32/Float64 are not defined."* Expressions like `sum(quantity * unit_price)` (used in the Monthly Usage Summary, Invoice Line Items, and Revenue by Tier queries) would throw "Illegal types of arguments" at runtime. Changed `quantity Float64` to `quantity Decimal(18, 6)` in the schema so that all downstream arithmetic stays in the Decimal domain. This is also the more appropriate type choice for a billing ledger where floating-point rounding is undesirable.

2. **Window function result referenced in `WHERE` is invalid.**
   The "Detect Anomalous Usage Spikes" query defined `rolling_avg` via a window function and then filtered with `WHERE spike_ratio > 5`, where `spike_ratio` expands to an expression containing the window function. Per ClickHouse docs: *"WHERE is performed before window functions evaluation, while QUALIFY is performed after it."* The query would error with a message about window functions not allowed in WHERE. Changed `WHERE spike_ratio > 5` to `QUALIFY spike_ratio > 5`, which is the purpose-built ClickHouse clause for filtering on window-function results.

## Review Notes

- `ReplacingMergeTree(ts)` with `DateTime64(3)` as the version column is valid — ClickHouse accepts `UInt*`, `Date`, `DateTime`, or `DateTime64` as the optional `ver` parameter.
- Deduplication in `ReplacingMergeTree` is eventually consistent (performed during background merges). The post correctly addresses this by using `FINAL` in the Invoice Line Items query. Readers should understand that the Monthly Usage Summary query (without `FINAL`) may include unmerged duplicates — potentially worth calling out, but not a correctness bug in an illustrative example.
- `QUALIFY` support in ClickHouse is relatively recent (available in modern versions). If compatibility with older ClickHouse is required, the alternative is to wrap the windowed projection in a subquery/CTE and filter in an outer `WHERE`.
- The Revenue by Tier query assumes a `tenants` table with a `plan` column — not defined in the post, but clearly illustrative.
- Not changed: `toStartOfMonth(ts) = toStartOfMonth(now())` is correct but does not leverage the partition pruning you would get from a range predicate like `ts >= toStartOfMonth(now())`. A stylistic improvement only.
