# Validation Summary: How to Monitor Host Activity with sys Schema in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- MySQL sys schema (host_summary views)
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: sys.host_summary — https://dev.mysql.com/doc/refman/8.0/en/sys-host-summary.html
- MySQL 8.0 Reference Manual: sys.host_summary_by_statement_latency — https://dev.mysql.com/doc/refman/8.0/en/sys-host-summary-by-statement-latency.html
- MySQL 8.0 Reference Manual: sys.host_summary_by_statement_type — https://dev.mysql.com/doc/refman/8.0/en/sys-host-summary-by-statement-type.html
- MySQL 8.0 Reference Manual: sys.host_summary_by_file_io — https://dev.mysql.com/doc/refman/8.0/en/sys-host-summary-by-file-io.html
- MySQL 8.0 Reference Manual: sys.host_summary_by_stages — https://dev.mysql.com/doc/refman/8.0/en/sys-host-summary-by-stages.html
- MySQL 8.0 Reference Manual: performance_schema.hosts — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-hosts-table.html
- MySQL 8.0 Reference Manual: Statement Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html

## Issues Found

1. **Incorrect column name `connections` in `sys.host_summary` query**: The `sys.host_summary` view does not have a column named `connections`. The correct column name is `total_connections`. Fixed in the first query (Using host_summary section).

2. **Non-existent `avg_latency` column in `host_summary_by_statement_latency` query**: The `sys.host_summary_by_statement_latency` view does not have an `avg_latency` column. Replaced with `lock_latency`, which is an actual column in this view and provides useful diagnostic information.

3. **Non-existent `STATEMENTS_DIGEST` column in Performance Schema query**: The `performance_schema.events_statements_summary_by_host_by_event_name` table has no `STATEMENTS_DIGEST` column. Replaced with `SUM(s.COUNT_STAR) AS total_statements` to correctly aggregate statement counts per host. Also added `GROUP BY` clause and table aliases, since the JOIN produces multiple rows per host (one per event_name) that need aggregation.

4. **Incorrect column name and arithmetic on formatted strings in "Identifying Problematic Hosts" query**: Two issues — (a) `connections` should be `total_connections`, and (b) the query performed arithmetic (`statement_latency / statements`) on the `sys.host_summary` view, where `statement_latency` is a human-readable formatted string (e.g., "10.50 ms"), not a raw number. Changed to use `sys.x$host_summary` which returns raw picosecond values, and added proper conversion (dividing by 1,000,000,000) to produce milliseconds.

## Review Notes
- The `cpu_latency` column in `host_summary_by_statement_latency` and `host_summary_by_statement_type` was added in MySQL 8.0.28. The post does not reference it, which is fine for broader compatibility.
- The `x$` variant views (e.g., `x$host_summary`) are mentioned only in the last query fix. Authors may wish to add a brief note explaining the difference between formatted views and `x$` raw-value views for readers unfamiliar with the sys schema convention.
