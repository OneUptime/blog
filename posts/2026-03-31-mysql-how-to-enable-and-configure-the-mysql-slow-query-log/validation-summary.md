# Validation Summary: How to Enable and Configure the MySQL Slow Query Log

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (slow query log feature)
- mysqldumpslow (built-in MySQL log analysis tool)
- pt-query-digest (Percona Toolkit)

## Sources Consulted
- MySQL 8.0 Reference Manual — The Slow Query Log: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual — Server System Variables (slow_query_log, long_query_time, log_queries_not_using_indexes, min_examined_row_limit): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — mysqldumpslow: https://dev.mysql.com/doc/refman/8.0/en/mysqldumpslow.html
- MySQL 8.0 Reference Manual — FLUSH Statement: https://dev.mysql.com/doc/refman/8.0/en/flush.html
- Percona Toolkit — pt-query-digest documentation: https://docs.percona.com/percona-toolkit/pt-query-digest.html

## Issues Found
- **Incorrect mysqldumpslow sort flag comments**: The comment on `mysqldumpslow -s t` said "Top 10 slowest queries" and the comment on `mysqldumpslow -s at` said "Top 10 by total time." The `-s t` flag sorts by total cumulative query time and `-s at` sorts by average query time. Fixed the first comment to "Top 10 by total time" and the second to "Top 10 by average time" to accurately reflect what each flag does.

## Review Notes
- All SQL commands (`SET GLOBAL`, `SHOW VARIABLES LIKE`) are syntactically correct and use valid variable names.
- The `my.cnf` configuration directives are all valid for MySQL 5.7+ and 8.0.
- The slow query log entry format shown is accurate for MySQL 5.7+/8.0.
- The log rotation technique (mv + FLUSH SLOW LOGS) is the correct approach.
- The default `long_query_time` of 10 seconds is correctly stated.
- The description of `long_query_time` supporting fractional seconds (e.g., `0.5`) is correct — MySQL supports microsecond resolution.
