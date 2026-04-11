# Validation Summary: How to Respond to MySQL Slow Query Incidents

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (slow query log, EXPLAIN, Performance Schema)
- mysqldumpslow (MySQL built-in log analysis tool)
- pt-query-digest (Percona Toolkit)
- sqlfluff (SQL linter)

## Sources Consulted
- MySQL 8.0 Reference Manual — Slow Query Log: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual — Server System Variables (long_query_time, slow_query_log, slow_query_log_file, log_queries_not_using_indexes): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA PROCESSLIST Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual — KILL Statement: https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual — mysqldumpslow: https://dev.mysql.com/doc/refman/8.0/en/mysqldumpslow.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — Performance Schema Statement Digest Summary Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- Percona Toolkit — pt-query-digest: https://docs.percona.com/percona-toolkit/pt-query-digest.html

## Issues Found
No technical issues found.

## Review Notes
- The `information_schema.PROCESSLIST` table is deprecated as of MySQL 8.0.22 in favor of `performance_schema.processlist`. The post's usage still works and is widely understood, but a future update could mention the newer alternative.
- The Performance Schema timer conversion (`avg_timer_wait / 1e12`) correctly converts picoseconds to seconds. In MySQL 8.0.28+, the `sys` schema provides views like `sys.statements_with_runtimes_in_95th_percentile` that handle formatting automatically, which could be mentioned as a convenience alternative.
- The composite index column order (equality column `status` first, range column `created_at` second) follows best practices for B-tree index design.
