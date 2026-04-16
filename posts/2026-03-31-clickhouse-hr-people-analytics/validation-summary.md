# Validation Summary: How to Use ClickHouse for HR and People Analytics

## Status
validated

## Post Type
Tutorial / Guide (applied SQL patterns for a specific analytics domain)

## Technologies Covered
- ClickHouse (MergeTree engine, SQL dialect)
- ClickHouse data types: `Date`, `UInt64`, `UInt32`, `UInt16`, `LowCardinality(String)`, `Decimal(10, 2)`, `Float32`
- ClickHouse functions: `toYYYYMM`, `countIf`, `nullIf`, `round`, `today`, `multiIf`, `avg`, `median`, `min`, `max`, `count`

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types reference: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse `LowCardinality` docs: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse `Decimal` docs: https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- ClickHouse date/time functions (`toYYYYMM`, `today`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse conditional functions (`countIf`, `multiIf`): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse aggregate functions (`avg`, `median`, `min`, `max`, `count`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse `nullIf`: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls

## Issues Found
No technical issues found.

All schemas use valid ClickHouse data types and MergeTree configuration (partition key, order key). Date arithmetic with `today() - 365` is valid (subtracting an integer from a `Date` returns a `Date` offset by days). Aggregate-with-filter usage via `countIf(...)` is correct, as is division-by-zero guarding via `nullIf(..., 0)`. The subquery-based "latest snapshot" selector in the compensation analysis is syntactically and semantically valid. `GROUP BY` references to SELECT-list aliases (`month`, `tenure_bucket`) are supported by ClickHouse.

## Review Notes
- The `median` function in ClickHouse is an alias for `quantile(0.5)` which uses a reservoir-sampling approximation (`quantileReservoirSampler`). For exact median values on pay-gap analyses where precision matters for compliance/reporting, consider `quantileExact(0.5)` instead. Still technically correct as written, just something to be aware of.
- The attrition-rate query assumes a single `headcount_snapshot` event per month per employee; if multiple snapshots exist per month the denominator could double-count. This is a data-modeling caveat rather than a SQL error.
- Mixing lifecycle events (`termination`, `voluntary_termination`) and `headcount_snapshot` rows in the same `employee_events` table is a reasonable wide-event pattern for ClickHouse, but readers should note that fields like `base_salary` may be null/zero for termination rows depending on ingestion.
- None of the above are technical errors — they are modeling considerations left to the reader.
