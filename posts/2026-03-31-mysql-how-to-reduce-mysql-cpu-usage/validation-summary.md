# Validation Summary: How to Reduce MySQL CPU Usage

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (Performance Schema, sys schema, InnoDB, binary logging)
- ProxySQL (read/write splitting)
- mysqldumpslow (slow query log analysis)
- Linux CLI tools (top, awk, pgrep)

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Statement Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual: sys.statement_analysis view — https://dev.mysql.com/doc/refman/8.0/en/sys-statement-analysis.html
- MySQL 8.0 Reference Manual: innodb_flush_log_at_trx_commit — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit
- MySQL 8.0 Reference Manual: sync_binlog — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_sync_binlog
- MySQL 8.0 Reference Manual: Slow Query Log — https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST — https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- ProxySQL Documentation: mysql_query_rules — https://proxysql.com/documentation/main-runtime/#mysql_query_rules

## Issues Found
1. **`avg_cpu_time` column does not exist**: The first Performance Schema query referenced `avg_cpu_time` as a column in `events_statements_summary_by_digest`. This column does not exist. Only `SUM_CPU_TIME` was added in MySQL 8.0.28+. Changed to `sum_cpu_time / count_star` to compute the average manually.

2. **`full_scan = 'YES'` incorrect filter value**: In the `sys.statement_analysis` view, the `full_scan` column uses `'*'` to indicate a full table scan, not `'YES'`. Changed `WHERE full_scan = 'YES'` to `WHERE full_scan = '*'`.

3. **Monitoring awk command referenced wrong column**: The `awk '$7 > 1'` filter targeted column 7 (`State`) in `SHOW PROCESSLIST` tab-delimited output, but the intended column is 6 (`Time`). Changed `$7` to `$6`. Also corrected the comment from "CPU time" to "running for more than 1 second", since `SHOW PROCESSLIST` reports wall-clock execution time, not CPU time.

## Review Notes
- The `SUM_CPU_TIME` column in Performance Schema was introduced in MySQL 8.0.28. The post does not mention this version requirement. Readers on older MySQL versions will get an error on the first query. A version caveat could be helpful in a future update.
- The `innodb_flush_log_at_trx_commit` setting controls InnoDB redo log flushing, not binary log flushing (which is controlled by `sync_binlog`). The section groups both settings together under "Tune Binary Log Flushing", which is slightly misleading but not incorrect since both are commonly tuned together for write performance.
- The `top -p` flag syntax is Linux-specific; macOS uses different flags. This is fine for a server-focused guide but worth noting.
