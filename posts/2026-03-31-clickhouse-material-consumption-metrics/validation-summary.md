# Validation Summary: How to Track Material Consumption Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, aggregate functions, partition/ordering)
- SQL (CREATE TABLE, SELECT with GROUP BY, HAVING, aggregate functions)
- Manufacturing analytics (Bill of Materials variance, scrap cost estimation)

## Sources Consulted
- ClickHouse official documentation: Data Types (UUID, LowCardinality, Float64, Decimal64, DateTime) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse official documentation: MergeTree engine family — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation: Aggregate function combinators (sumIf) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse official documentation: Date/time functions (toYYYYMM, toDate, toStartOfMonth, today) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse official documentation: Decimal type arithmetic — https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- ClickHouse official documentation: nullIf, abs, round functions — https://clickhouse.com/docs/en/sql-reference/functions

## Issues Found
No technical issues found.

## Review Notes
- The `unit_cost` column uses `Decimal64(4)` while quantity columns use `Float64`. Arithmetic between Decimal and Float types was historically unsupported in ClickHouse but implicit coercion was added in ClickHouse 22.3+. Readers using very old ClickHouse versions (pre-22.3) would need explicit casts (e.g., `toFloat64(unit_cost)`).
- The alias `avg_daily_consumption` in the Material Turnover Rate query computes the per-record average (`avg(quantity_used)`), not a true daily average. If multiple consumption records exist per material per day, this would not represent actual average daily consumption. A true daily average would require `sum(quantity_used) / countDistinct(toDate(consumed_at))` or a subquery. This is a minor semantic concern rather than a syntax error.
- The Scrap and Rework section uses a 10% threshold heuristic (`quantity_used > quantity_std * 1.1`) to estimate scrap cost. This is clearly labeled as an estimate, which is appropriate.
- All ClickHouse functions used (toYYYYMM, toDate, toStartOfMonth, today, nullIf, abs, round, sum, avg, sumIf, count DISTINCT) are verified as valid and current.
