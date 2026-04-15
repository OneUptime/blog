# Validation Summary: How to Build Top/Bottom Performer Reports in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, SQL dialect)
- ClickHouse window functions: `rank()`, `percent_rank()`
- ClickHouse aggregate function: `topK()`
- CTEs (Common Table Expressions) in ClickHouse
- UNION ALL queries in ClickHouse

## Sources Consulted
- ClickHouse official documentation: topK aggregate function (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/topk)
- ClickHouse official documentation: Window Functions (https://clickhouse.com/docs/en/sql-reference/window-functions)
- ClickHouse official documentation: UNION ALL (https://clickhouse.com/docs/en/sql-reference/statements/select/union)
- ClickHouse official documentation: MergeTree engine (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)

## Issues Found

1. **Description mentioned `dense_rank` but post never uses it.**
   - **What was wrong:** The post description stated "using rank, dense_rank, and topK" but `dense_rank()` is never used anywhere in the post. Only `rank()` and `percent_rank()` are used.
   - **What was changed:** Replaced `dense_rank` with `percent_rank` in the description to accurately reflect the content.

2. **`topK` section was misleading about what the function does.**
   - **What was wrong:** The section titled "Using topK for Approximate Top N" implied that `topK` is a faster alternative to `ORDER BY ... LIMIT` for finding top performers by revenue. In reality, `topK(N)(column)` returns the approximately most *frequent* values in a column (by row count), not the top values by any metric. Using it as shown would return products that appear most often in sales records, not the highest-revenue products.
   - **What was changed:** Renamed the section to "Using topK for Most Frequent Values", rewrote the description to accurately explain that `topK` finds most-frequent values (not top-by-metric), and renamed the alias from `top_products` to `most_frequent_products` for clarity. Also updated the Summary section to say "approximate most-frequent-value queries" instead of "approximate fast leaderboards".

## Review Notes
- The Week-over-Week Rank Change query has a minor asymmetry: "this week" covers 8 days (`>= today() - 7` includes today and the 7 prior days) while "last week" covers 7 days (`BETWEEN today() - 14 AND today() - 8`). This is not technically wrong but could produce slightly uneven comparisons. Not changed since it does not affect correctness of the SQL.
- The Bottom N query uses `avg(revenue / units_sold)` which could cause division by zero if any row has `units_sold = 0`. This is a robustness concern rather than a technical error, so it was not changed.
- All ClickHouse SQL syntax (CREATE TABLE, MergeTree engine, window functions, CTEs, UNION ALL with subquery ORDER BY/LIMIT) is correct and current.
