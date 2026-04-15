# Validation Summary: How to Build Process Control Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, aggregate functions)
- Process control concepts (PLC data, SPC, setpoint deviation, alarm tracking)

## Sources Consulted
- ClickHouse aggregate function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/corr
- ClickHouse aggregate function combinators (avgIf, countIf): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse SQL reference for CREATE TABLE: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse data types (LowCardinality, Nullable): https://clickhouse.com/docs/en/sql-reference/data-types

## Issues Found

### 1. Nested aggregate functions in Process Correlation Analysis query
- **What was wrong:** The original query used `corr(avgIf(...), avgIf(...))`, nesting the `corr()` aggregate function around `avgIf()` aggregate functions. ClickHouse (and SQL in general) does not allow nesting aggregate functions. This query would fail with an error. Additionally, the original query included `toStartOfHour(recorded_at) AS hour` in the SELECT and GROUP BY, which would mean `corr()` would only see one row per group, making correlation meaningless.
- **What was changed:** Restructured the query to use a subquery. The inner query computes hourly averages per tag using `avgIf()` with `GROUP BY hour`. The outer query then applies `corr()` across all hourly rows to produce a single correlation coefficient.
- **Why:** `corr()` needs row-level inputs to compute a meaningful Pearson correlation. The two-step approach first pivots the data into one row per hour with separate columns for each tag's average, then correlates those columns across all hours.

## Review Notes
- All other SQL queries are syntactically correct and use valid ClickHouse functions and syntax.
- `LowCardinality(String)`, `Nullable(Float64)`, `Float64`, and `DateTime` are all valid ClickHouse types used appropriately.
- `stddevPop()`, `countIf()`, `avgIf()`, `nullIf()`, `corr()`, `toStartOfHour()`, `toDate()`, `toYYYYMMDD()`, `today()`, `round()`, `abs()` are all valid ClickHouse functions.
- ClickHouse's `/` operator returns `Float64` for integer operands, so the `countIf(...) / count() * 100` expressions in the summary and alarm queries work correctly without explicit casting.
- The `HAVING` clause referencing column aliases (e.g., `HAVING total_alarms > 10`) is valid in ClickHouse.
- The `PARTITION BY toYYYYMMDD(recorded_at)` is a common and valid ClickHouse partitioning strategy.
- The `setpoint` column is correctly declared as `Nullable(Float64)` and queries appropriately filter with `WHERE setpoint IS NOT NULL` before performing arithmetic on it.
