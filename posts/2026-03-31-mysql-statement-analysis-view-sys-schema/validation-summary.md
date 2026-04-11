# Validation Summary: How to Use the statement_analysis View in MySQL sys Schema

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL sys schema
- MySQL Performance Schema
- `sys.statement_analysis` view
- `sys.x$statement_analysis` view

## Sources Consulted
- MySQL 8.0 Reference Manual: sys.statement_analysis view (https://dev.mysql.com/doc/refman/8.0/en/sys-statement-analysis.html)
- MySQL sys schema source code (statement_analysis view definition)
- MySQL 8.0 Reference Manual: Performance Schema events_statements_summary_by_digest table

## Issues Found

1. **Incorrect column name `rows_sorted_avg`**: The actual column is `rows_sorted` (a total, not an average). Fixed in the column list description and the sort-heavy queries SQL example.

2. **Incorrect column name `sort_merge_passes_avg`**: The actual column is `sort_merge_passes` (a total, not an average). Fixed in the column list description and the sort-heavy queries SQL example.

3. **Incorrect column name `full_scans`**: The actual column is `full_scan` (singular). Additionally, the description said "count of full table scan executions" but it is actually a flag column that shows `*` if a full scan was used or is empty otherwise. Fixed the name and description.

4. **Non-existent column `no_index_used_count`**: This column does not exist in the `sys.statement_analysis` view. The closest concept is the `full_scan` flag which checks `SUM_NO_GOOD_INDEX_USED` and `SUM_NO_INDEX_USED` internally. Removed from the column list.

5. **Arithmetic on formatted string columns**: The lock-heavy queries example used `ROUND(lock_latency / total_latency * 100, 1)` on `sys.statement_analysis`, but `total_latency` and `lock_latency` in that view are human-readable formatted strings (e.g., `'16.75 s'`). Arithmetic division on these strings would not produce correct results. Changed the query to use `sys.x$statement_analysis` which provides raw numeric (picosecond) values.

## Review Notes
- The `sys.x$statement_analysis` view (raw numeric columns) should be used whenever arithmetic operations are needed on latency or other numeric columns. The `sys.statement_analysis` view formats values for human readability but this makes them unsuitable for calculations.
- The `rows_sorted` and `sort_merge_passes` columns are totals across all executions of a normalized statement, not per-execution averages. To get per-execution averages, divide by `exec_count` using the `x$` variant.
