# Validation Summary: How to Use the user_summary View in MySQL sys Schema

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL sys schema
- MySQL Performance Schema
- `sys.user_summary` view
- `sys.user_summary_by_statement_type` view
- `sys.user_summary_by_file_io` view
- `sys.x$user_summary` raw data variant

## Sources Consulted
- MySQL 8.0 Reference Manual: sys.user_summary view — https://dev.mysql.com/doc/refman/8.0/en/sys-user-summary.html
- MySQL 8.0 Reference Manual: sys.user_summary_by_statement_type view — https://dev.mysql.com/doc/refman/8.0/en/sys-user-summary-by-statement-type.html
- MySQL 8.0 Reference Manual: sys.user_summary_by_file_io view — https://dev.mysql.com/doc/refman/8.0/en/sys-user-summary-by-file-io.html
- MySQL 8.0 Reference Manual: Performance Schema statement summary tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html

## Issues Found
1. **Incorrect column name in `sys.user_summary_by_statement_type` query**: The blog referenced `avg_latency` as a column, but this column does not exist in the `sys.user_summary_by_statement_type` view. The actual latency columns are `total_latency`, `max_latency`, `lock_latency`, and `cpu_latency`. Changed `avg_latency` to `max_latency`.
2. **Misleading TRUNCATE comment**: The SQL comment said "Reset all Performance Schema counters" but the TRUNCATE command only resets the `events_statements_summary_by_user_by_event_name` table (per-user statement statistics), not all Performance Schema counters. Changed to "Reset per-user statement statistics" for accuracy.

## Review Notes
- All 12 column names for `sys.user_summary` are verified correct against official MySQL 8.0 documentation.
- The `sys.user_summary_by_file_io` columns (`user`, `ios`, `io_latency`) are correct.
- The `x$user_summary` picosecond-to-seconds conversion (`/ 1e12`) is correct since Performance Schema stores timer values in picoseconds.
- The description of `background` representing internal server threads with NULL user is accurate per the documentation.
- The blog query for `user_summary_by_statement_type` shows a subset of available columns (omitting `max_latency`, `lock_latency`, `cpu_latency`, `rows_affected`, `full_scans`), which is fine for a focused tutorial.
