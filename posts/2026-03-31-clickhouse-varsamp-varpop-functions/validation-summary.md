# Validation Summary: How to Use varSamp() and varPop() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Aggregate functions (varSamp, varPop)
- Window functions
- AggregatingMergeTree engine
- Materialized views with -State/-Merge combinators

## Sources Consulted
- ClickHouse varSamp documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/varSamp
- ClickHouse varPop documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/varPop
- ClickHouse aggregate function combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree

## Issues Found
No technical issues found.

## Review Notes
- The explanation of varSamp (N-1 denominator / Bessel's correction) vs varPop (N denominator) is accurate and matches the official ClickHouse documentation formulas.
- The AggregatingMergeTree pattern (target table with `AggregateFunction(varSamp, Float64)` column, materialized view using `varSampState()`, querying with `varSampMerge()`) follows the documented best practice exactly.
- The NULL handling claim that both functions ignore NULLs and return NaN when all inputs are NULL is consistent with standard ClickHouse aggregate function behavior, though the official varSamp/varPop pages do not explicitly document this edge case.
- The window function syntax `sqrt(varSamp(x) OVER (PARTITION BY y))` is valid in ClickHouse, which supports aggregate functions as window functions and allows wrapping them in scalar functions.
- The anomaly detection z-score query could encounter a division-by-zero if all values in a partition are identical (sqrt_var would be 0), but this is a known edge case rather than a technical error in the post.
