# Validation Summary: How to Monitor User Activity with sys Schema in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL sys schema (user_summary views)
- MySQL Performance Schema (users table, events_statements_summary_by_user_by_event_name table)

## Sources Consulted
- MySQL 8.0 Reference Manual: sys Schema user_summary views — https://dev.mysql.com/doc/refman/8.0/en/sys-user-summary.html
- MySQL 8.0 Reference Manual: sys Schema user_summary_by_statement_latency — https://dev.mysql.com/doc/refman/8.0/en/sys-user-summary-by-statement-latency.html
- MySQL 8.0 Reference Manual: sys Schema user_summary_by_statement_type — https://dev.mysql.com/doc/refman/8.0/en/sys-user-summary-by-statement-type.html
- MySQL 8.0 Reference Manual: sys Schema user_summary_by_file_io — https://dev.mysql.com/doc/refman/8.0/en/sys-user-summary-by-file-io.html
- MySQL 8.0 Reference Manual: sys Schema user_summary_by_stages — https://dev.mysql.com/doc/refman/8.0/en/sys-user-summary-by-stages.html
- MySQL 8.0 Reference Manual: Performance Schema users table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-users-table.html
- MySQL 8.0 Reference Manual: events_statements_summary_by_user_by_event_name — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html

## Issues Found
1. **Incorrect error aggregation in "Combining User Stats with Errors" query**: The correlated subquery used `SELECT SUM_ERRORS ... LIMIT 1` against `performance_schema.events_statements_summary_by_user_by_event_name`. This table contains one row per user per event_name, so `LIMIT 1` would only return errors from a single arbitrary statement type rather than the user's total errors. Fixed by changing to `SELECT SUM(SUM_ERRORS) ... WHERE USER = u.user` (removed `LIMIT 1`) to correctly aggregate errors across all statement event names for each user.

## Review Notes
- All sys schema view names and column names verified as correct for MySQL 5.7+ and 8.0.
- The `performance_schema.users` query and column names are correct.
- The security monitoring example filtering out `mysql.sys` is appropriate — this is a built-in system account used by the sys schema itself.
- The post covers the formatted (human-readable) variants of the sys views. MySQL also provides `x$` prefixed raw-numeric variants (e.g., `x$user_summary`) which may be more suitable for programmatic consumption, but omitting them is reasonable for a tutorial-style post.
