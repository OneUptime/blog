# Validation Summary: How to Store and Analyze Infrastructure Costs in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, CTEs, LowCardinality type, Decimal type)
- SQL (aggregation, window functions, CTEs, JOINs)
- FinOps / Cloud Billing concepts (cost attribution, anomaly detection, budget variance)

## Sources Consulted
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse data types (Date, LowCardinality, Decimal, Float64): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree engine and PARTITION BY: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse window functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse aggregate functions (sum, avg, any): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse date functions (toYYYYMM, toStartOfMonth, today): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- SQL standard logical query processing order (WHERE evaluated before window functions)

## Issues Found
1. **Day-over-Day Cost Anomalies query: window function alias used in WHERE clause**
   - **What was wrong:** The original query defined `rolling_avg` as a window function alias in the SELECT clause and then referenced `spike_ratio` (which depends on `rolling_avg`) in the WHERE clause. In SQL's logical processing order, window functions are computed after WHERE, so `rolling_avg` is not available at the WHERE stage. ClickHouse allows alias substitution in WHERE for regular expressions, but this does not extend to window function results. The query would produce an error.
   - **What was changed:** Wrapped the window function computation in a second CTE (`enriched`), then filtered on the computed `rolling_avg` value in the outer SELECT's WHERE clause using the raw expression `daily_cost / (rolling_avg + 0.01) > 2` instead of referencing the alias.
   - **Why:** Window function results must be materialized (via a subquery or CTE) before they can be used in a WHERE filter. This is consistent with both the SQL standard and ClickHouse's query processing model.

## Review Notes
- The Budget Variance query references a `team_budgets` table that is not defined in the post. This is acceptable since it is implied as a pre-existing lookup table, but readers may benefit from seeing its schema.
- The `+ 0.01` epsilon in the spike ratio denominator prevents division by zero but introduces a small bias for very low-cost services. This is a reasonable practical tradeoff for a blog example.
- All ClickHouse-specific syntax (LowCardinality, toYYYYMM, MergeTree, any() aggregate) is correctly used and current.
- The nested aggregate window pattern `sum(sum(cost_usd)) OVER ()` in the Prod vs Non-Prod query is valid and is a clean way to compute percentage of total.
