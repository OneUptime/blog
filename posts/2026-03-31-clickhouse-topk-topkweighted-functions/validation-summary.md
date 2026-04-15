# Validation Summary: How to Use topK() and topKWeighted() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse aggregate functions: topK(), topKWeighted()
- ClickHouse array functions: arrayJoin()
- ClickHouse window functions
- ClickHouse system tables (system.query_log)

## Sources Consulted
- ClickHouse official documentation for topK: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/topk
- ClickHouse official documentation for topKWeighted: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/topkweighted
- ClickHouse official documentation for system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse official documentation for window functions: https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found

### 1. Incorrect algorithm name (multiple locations)
- **What was wrong:** The post referred to the algorithm as the "Space-Saving heavy hitters algorithm" and "Space-Saving algorithm" in several places. The official ClickHouse documentation names it the "Filtered Space-Saving" algorithm.
- **What was changed:** Updated all references to "Filtered Space-Saving algorithm" throughout the post (description, intro paragraph, "How topK() Works" section, and summary).
- **Why:** Accuracy — the Filtered Space-Saving algorithm is a specific variant, not identical to the original Space-Saving algorithm.

### 2. Incorrect load factor default value
- **What was wrong:** The post stated the default load factor is `3 * N` (both in a code comment and in prose). The `load_factor` parameter actually defaults to `3`, which results in a summary size of `3 * N` items.
- **What was changed:** Updated the code comment from "default is 3 * N" to "default is 3", and rewrote the prose to clarify: "The default load factor is `3`, giving a summary size of `3 * N` items."
- **Why:** The distinction matters — users setting a custom load_factor need to know the parameter itself defaults to 3, not 3*N.

### 3. Wrong column name in system.query_log example
- **What was wrong:** The example used `user_name` as a column in `system.query_log`. The correct column name is `user`.
- **What was changed:** Changed `user_name` to `user` in the topKWeighted query against system.query_log.
- **Why:** `user_name` does not exist in system.query_log; the query would fail with an unknown column error.

## Review Notes
- The post correctly notes that topK results are approximate but could more strongly emphasize that ClickHouse's own docs warn results are not guaranteed — in certain situations, errors might occur and non-top-frequent values may be returned.
- The arrayJoin + topK pattern in SELECT with GROUP BY is valid but somewhat unusual; it works because arrayJoin expands the aggregate result after grouping.
- The window function usage `sum(count()) OVER ()` is valid ClickHouse SQL.
- All other SQL examples use correct syntax and reasonable table/column naming conventions for illustrative purposes.
