# Validation Summary: How to Configure MySQL Slow Query Log

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (slow query log, server system variables, log output configuration)
- systemd (service restart)
- Percona Toolkit (pt-query-digest, mentioned in summary)

## Sources Consulted
- MySQL 8.0 Reference Manual: The Slow Query Log — https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual: Server System Variables (slow_query_log, slow_query_log_file, long_query_time, log_queries_not_using_indexes, log_throttle_queries_not_using_indexes, log_output) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: SHOW VARIABLES Statement — https://dev.mysql.com/doc/refman/8.0/en/show-variables.html

## Issues Found
- **Inconsistent Unix timestamp in sample log entry**: The sample slow query log entry showed `# Time: 2026-03-31T12:00:00.000000Z` but used `SET timestamp=1743422400`, which corresponds to 2025-03-31 12:00:00 UTC. Fixed the timestamp to `1774958400`, which is the correct Unix timestamp for 2026-03-31 12:00:00 UTC.

## Review Notes
- All SQL commands (`SET GLOBAL`, `SHOW VARIABLES`, `SELECT`) use correct syntax and valid variable names.
- The `my.cnf` configuration format and directives are accurate.
- The default value of `long_query_time` (10 seconds) is correctly stated.
- Fractional `long_query_time` values are supported as described (microsecond resolution since MySQL 5.1).
- The `log_throttle_queries_not_using_indexes` description ("10 per minute") is accurate.
- The `log_output = 'FILE,TABLE'` syntax and `mysql.slow_log` table name are correct.
- The sample slow query log entry format matches MySQL 5.7+/8.0 output format.
- The post does not specify a MySQL version, but all content is accurate for MySQL 5.7 and 8.0, which are the currently relevant versions.
