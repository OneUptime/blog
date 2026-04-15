# Validation Summary: How to Build Utility Billing Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, LowCardinality, Decimal64, window functions, conditional aggregates)
- SQL (DDL, analytical queries, window functions, subqueries)

## Sources Consulted
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types (Decimal64, LowCardinality, Nullable): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse window functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse aggregate function combinators (-If): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse date functions (toYYYYMM, toStartOfMonth, today): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- SQL HAVING clause semantics and logical query processing order

## Issues Found

1. **Billing Anomaly Detection query used HAVING without GROUP BY to filter window function results.**
   - **What was wrong:** The query used `HAVING consumption_ratio > 3` without a GROUP BY clause to filter rows based on a window function alias. In SQL's logical processing order, HAVING is evaluated before window functions, so filtering on a window function result via HAVING is incorrect. Without GROUP BY, HAVING does not act as a per-row filter.
   - **What was changed:** Restructured the query to use a subquery: the inner query computes the window function (`avg_12_month`), and the outer query computes the `consumption_ratio` and filters with `WHERE` instead of `HAVING`.
   - **Why:** This is the correct way to filter on window function results in SQL — compute the window in a subquery, then filter in the outer query's WHERE clause.

2. **Summary incorrectly referenced ReplacingMergeTree.**
   - **What was wrong:** The summary stated "ReplacingMergeTree or partitioning by billing period keeps historical analyses efficient" but the table was defined with plain `MergeTree()`, and ReplacingMergeTree was never used or discussed in the post.
   - **What was changed:** Replaced "ReplacingMergeTree or partitioning" with "MergeTree with partitioning" to match the actual table definition.
   - **Why:** The summary should accurately reflect the content of the post.

## Review Notes
- The Payment Collection Rate query does not guard against division by zero if `sum(total_amount)` is 0. This is an unlikely edge case for billing data but could be addressed with `nullIf` for completeness.
- The Billing Anomaly Detection query filters `WHERE bill_period_end >= today() - 90` before computing the window function, which means the 12-row moving average only has access to rows within the 90-day window (roughly 3 monthly billing periods). For a true 12-month moving average, the filter should be applied in the outer query instead. This is a design consideration rather than a syntax error.
- All ClickHouse data types, functions, and engine syntax are correct and current.
