# Validation Summary: How to Track Portfolio Performance in Real-Time with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (ReplacingMergeTree, MergeTree engines)
- ClickHouse SQL (window functions, aggregate functions, FINAL modifier)
- ClickHouse-specific functions: `argMax`, `toYYYYMM`, `LowCardinality`

## Sources Consulted
- ClickHouse documentation on CREATE TABLE and MergeTree engines: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on aggregate functions (`argMax`, `stddevPop`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse documentation on the FINAL modifier: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier
- SQL standard on window function nesting restrictions

## Issues Found
1. **Nested window functions in Rolling 30-Day Volatility query**: The original query used `lag() OVER (...)` inside `stddevPop() OVER (...)`. Window functions cannot be nested inside other window functions — this is prohibited in both standard SQL and ClickHouse. ClickHouse would reject this query with an error. **Fix**: Restructured the query to compute `daily_return` using `lag()` in an intermediate subquery, then applied `stddevPop()` as a window function on the pre-computed `daily_return` column in the outer query.

## Review Notes
- The Daily Return Time Series query and the inner subquery of the Rolling 30-Day Volatility section do not use `FINAL` on the `holdings` table, unlike the other queries. Since `holdings` uses `ReplacingMergeTree`, un-merged duplicate rows could inflate results. This is not a syntax error but a potential correctness issue depending on merge timing. The inconsistency with other queries suggests it may be an oversight, but it could also be intentional for performance reasons in historical time-series contexts.
- All ClickHouse-specific syntax (LowCardinality, ReplacingMergeTree, argMax, FINAL modifier, USING without parentheses) is correct and current.
- The `cost_basis` column semantics are consistent across all queries — treated as total cost basis per holding, not per-share cost.
