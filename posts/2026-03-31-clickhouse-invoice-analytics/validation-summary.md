# Validation Summary: How to Build Invoice Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, SQL dialect)
- ClickHouse data types: UUID, UInt64, String, LowCardinality, Decimal64, Date, Nullable
- ClickHouse functions: `today()`, `toYYYYMM`, `toStartOfMonth`, `toStartOfWeek`, `dateDiff`, `countIf`, `sumIf`, `quantile`, `round`

## Sources Consulted
- ClickHouse SQL Reference — Data Types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree Engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Date/Time Functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse Aggregate Function Combinators (`-If`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `quantile` function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse `dateDiff`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff

## Issues Found
No technical issues found.

Verified:
- Table DDL uses valid ClickHouse types and engine syntax. `PARTITION BY toYYYYMM(issue_date)` and `ORDER BY (customer_id, issue_date)` are idiomatic for MergeTree.
- `Date` subtraction (`today() - due_date`) returns an integer number of days, so `BETWEEN 0 AND 30` and `> 90` comparisons are valid.
- `countIf` / `sumIf` are the correct aggregate combinator forms.
- `quantile(0.9)(expr)` uses the correct parameterized aggregate syntax.
- `dateDiff('day', issue_date, paid_date)` is the current signature (unit as first arg).
- `HAVING late_rate_pct > 30` referencing a SELECT-list alias is supported in ClickHouse.
- `paid_date IS NOT NULL` is valid for `Nullable(Date)` columns.

## Review Notes
- The "DSO" section technically computes average/p90 days-to-pay rather than the classical DSO formula `(Accounts Receivable / Total Credit Sales) × Days`. This is called out as a KPI in the post and the SQL is correct for what it computes, but future readers may want the textbook DSO variant for strict finance use cases.
- In the Late Payment Rate query, `avg(dateDiff('day', due_date, paid_date))` includes early payments (negative values), which can pull the "avg_days_late" figure down. An `avgIf(..., paid_date > due_date)` would strictly measure lateness; left as-is since the current SQL is still technically valid.
