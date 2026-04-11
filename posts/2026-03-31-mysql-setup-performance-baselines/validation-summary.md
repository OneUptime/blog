# Validation Summary: How to Set Up MySQL Performance Baselines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+ / 8.0)
- MySQL Performance Schema (`performance_schema.global_status`)
- InnoDB buffer pool metrics
- Bash scripting
- cron scheduling
- bc (arbitrary precision calculator)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server Status Variables (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html) - verified `Questions`, `Threads_connected`, `Threads_running`, `Innodb_buffer_pool_reads`, `Innodb_buffer_pool_read_requests`, `Slow_queries` variable names and semantics
- MySQL 8.0 Reference Manual: Performance Schema Status Variable Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html) - confirmed `performance_schema.global_status` is the correct source for status variables in modern MySQL
- MySQL 8.0 Reference Manual: DAYOFWEEK() function (https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_dayofweek) - confirmed 1=Sunday, 2=Monday mapping
- MySQL 8.0 Reference Manual: JOIN syntax (https://dev.mysql.com/doc/refman/8.0/en/join.html) - confirmed JOIN/CROSS JOIN/INNER JOIN are syntactic equivalents in MySQL, so JOIN without ON is valid
- MySQL 8.0 Reference Manual: CREATE TABLE syntax (https://dev.mysql.com/doc/refman/8.0/en/create-table.html) - confirmed DATETIME DEFAULT CURRENT_TIMESTAMP is valid in 5.6.5+

## Issues Found
- **QPS calculation was incorrect**: The `Questions` server status variable is a cumulative counter (total statements executed since server startup), not a rate. The original script computed `$QUESTIONS/300`, which divides the total cumulative count by 300 seconds. This does not yield the QPS for the 5-minute capture interval -- it produces a meaningless value that grows as server uptime increases. Fixed by storing the previous `Questions` value in a temp file (`/tmp/mysql_baseline_prev_questions`) and computing the delta: `(current_questions - previous_questions) / 300`. The first run after a restart will insert QPS=0, and all subsequent runs will have the correct interval-based QPS.

## Review Notes
- The `Slow_queries` variable is also a cumulative counter, but storing it as a raw snapshot value is acceptable since deltas can be computed from consecutive rows in the baseline table. This is a different use case from QPS where the script was explicitly trying to compute a rate.
- The script uses `-p${MYSQL_MONITOR_PASSWORD}` on the command line, which will cause MySQL to emit a warning about using passwords on the command line. For production use, a MySQL option file (`~/.my.cnf`) or `mysql_config_editor` would be more secure, but this is acceptable for a tutorial.
- The anomaly detection query uses a hardcoded `1500` as `current_qps`. In practice, this would be replaced with a live metric fetch. The hardcoded value serves as a clear example.
