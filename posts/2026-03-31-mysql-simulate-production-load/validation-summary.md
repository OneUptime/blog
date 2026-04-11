# Validation Summary: How to Simulate Production Load on MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (general query log, information_schema, performance_schema, InnoDB internals)
- pt-query-digest (Percona Toolkit)
- mysqlslap (MySQL built-in benchmarking tool)
- Python (pymysql, threading)

## Sources Consulted
- MySQL 8.0 Reference Manual — General Query Log: https://dev.mysql.com/doc/refman/8.0/en/query-log.html
- MySQL 8.0 Reference Manual — mysqlslap: https://dev.mysql.com/doc/refman/8.0/en/mysqlslap.html
- MySQL 8.0 Reference Manual — SHOW STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-status.html
- MySQL 8.0 Reference Manual — performance_schema.global_status: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual — information_schema.PROCESSLIST: https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- Percona Toolkit Documentation — pt-query-digest: https://docs.percona.com/percona-toolkit/pt-query-digest.html
- PyMySQL documentation: https://pymysql.readthedocs.io/

## Issues Found

1. **Approach 1 title referenced deprecated tool and inaccurate action.** The heading "Replay with pt-query-digest and mk-query-digest" had two problems: (a) `mk-query-digest` is from the Maatkit toolkit, which was deprecated and replaced by Percona Toolkit circa 2011 — it should not be recommended; (b) `pt-query-digest` is an analysis tool, not a replay tool, yet the heading said "Replay." Changed the heading to "Capture and Analyze with pt-query-digest" and updated the description to match what the section actually demonstrates.

2. **Missing `--type=genlog` flag on pt-query-digest.** The default input type for pt-query-digest is `slowlog`. When parsing a general query log file, the `--type=genlog` flag is required. Without it, pt-query-digest will misparse or fail on the general log format. Added `--type=genlog` to the command.

3. **Metrics collection script grep matched headers instead of data.** The command `grep -E "Value"` was intended to extract metric values, but when `mysql -e` output is piped, it uses tab-delimited batch mode where headers contain the literal word "Value" (e.g., `Variable_name\tValue`) while data rows contain the actual numbers (e.g., `Queries\t12345`). The grep therefore matched only header lines, discarding the actual data. Fixed by using `mysql -N` (suppress column names) and removing the incorrect grep.

## Review Notes
- The Python script comment says "80/20 read-write mix" based on thread count (20 read / 5 write), but the actual query ratio will skew much higher toward reads since read threads run without any sleep while write threads include a 10ms sleep. The comment is accurate about thread allocation but could be misread as describing query volume ratio.
- The `information_schema.PROCESSLIST` query works but is deprecated in MySQL 8.0.22+ in favor of `performance_schema.processlist`. Both still function.
- The buffer pool hit rate formula and performance_schema queries are correct for MySQL 5.7+.
