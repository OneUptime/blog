# Validation Summary: How to Use covarSamp() and covarPop() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (aggregate functions, combinators, materialized views)
- SQL
- Statistics (covariance, Pearson correlation, Bessel's correction)

## Sources Consulted
- ClickHouse covarSamp docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/covarsamp
- ClickHouse covarPop docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/covarpop
- ClickHouse corr docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/corr
- ClickHouse stddevSamp / varSamp reference pages
- ClickHouse aggregate function combinators (-State, -Merge, -If): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse JOIN / USING docs: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse AggregatingMergeTree engine docs

## Issues Found
- **Invalid JOIN ... USING with a function expression** in the "Covariance Over Time Windows" section. The original query used `JOIN request_logs USING (host_name, toStartOfMinute(timestamp))`, but ClickHouse's USING clause only accepts bare column names, not expressions. The query also referenced ambiguous `timestamp` and mixed columns from both tables without qualification. Fixed by simplifying to a single-table query against `host_metrics` (which earlier examples already treat as containing both `response_time_ms` and `cpu_percent`), grouping by `toStartOfHour(metric_time)` and `host_name`. This preserves the "rolling covariance over time" intent while using valid syntax.

## Review Notes
- The schema referenced by examples is loosely defined across sections (e.g., `request_logs` is assumed to contain different columns in different examples — `status_code`/`response_time_ms` in one spot, `response_time_ms`/`cpu_percent`/`service_name` in the materialized view). This is a didactic convenience common in tutorials and is acceptable, but readers should adapt column names to their own schemas.
- All aggregate function names (`covarSamp`, `covarPop`, `corr`, `stddevSamp`, `varSamp`, `countIf`), combinator syntax (`covarSampState`, `covarSampMerge`, `AggregateFunction(covarSamp, Float64, Float64)`), and the `AggregatingMergeTree` materialized view pattern are accurate per current ClickHouse documentation.
- The statistical explanations (Bessel's correction, N vs N-1 denominators, covariance-to-correlation normalization) are mathematically correct.
