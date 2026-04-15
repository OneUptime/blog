# Validation Summary: How to Build Risk Metrics Dashboards with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (ReplacingMergeTree, AggregatingMergeTree, materialized views, window functions, parametric aggregate functions)
- SQL (analytical queries, window functions, subqueries)

## Sources Consulted
- ClickHouse documentation on ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse documentation on AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on aggregate function combinators (-State/-Merge): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation on quantile function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse SQL execution order (WHERE -> GROUP BY -> HAVING -> window functions -> ORDER BY)

## Issues Found
1. **Concentration Risk query used HAVING with a window function alias**: The query used `HAVING concentration_pct > 5` where `concentration_pct` was computed from a window function (`sum(sum(market_value)) OVER ()`). In ClickHouse's SQL execution pipeline, HAVING is evaluated before window functions are computed, so this column alias would not be available in HAVING. Fixed by wrapping the aggregation + window function query in a subquery and filtering with `WHERE concentration_pct > 5` on the outer query instead.

## Review Notes
- The VaR query (Historical Simulation section) does not use `FINAL` on the `positions` table, unlike the other queries. Since the table uses ReplacingMergeTree, un-merged duplicate rows could slightly skew VaR results. For a 252-day lookback, most older partitions would be merged, so this is likely acceptable in practice, but worth noting for readers who need exact results.
- The materialized view correctly uses `sumState()` for the AggregatingMergeTree engine, but the post does not show how to query the view (which requires `sumMerge()` instead of `sum()`). This is a completeness gap, not an error.
- All ClickHouse-specific syntax is correct: `LowCardinality(String)`, `count()`, `countIf()`, `quantile(0.01)(...)`, `FINAL`, `toYYYYMM()`, `today()`, and date arithmetic with integer subtraction.
