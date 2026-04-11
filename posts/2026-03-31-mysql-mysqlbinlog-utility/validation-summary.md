# Validation Summary: How to Use mysqlbinlog Utility in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL
- mysqlbinlog utility
- MySQL Binary Logs
- MySQL Replication
- Point-in-Time Recovery

## Sources Consulted
- MySQL 8.0 Reference Manual — mysqlbinlog utility: https://dev.mysql.com/doc/refman/8.0/en/mysqlbinlog.html
- MySQL 8.0 Reference Manual — Binary Log: https://dev.mysql.com/doc/refman/8.0/en/binary-log.html
- MySQL 8.0 Reference Manual — SHOW BINARY LOGS: https://dev.mysql.com/doc/refman/8.0/en/show-binary-logs.html
- MySQL 8.0 Reference Manual — Point-in-Time Recovery Using Binary Log: https://dev.mysql.com/doc/refman/8.0/en/point-in-time-recovery-binlog.html
- MySQL 8.0 Reference Manual — binlog_format system variable: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_format

## Issues Found
No technical issues found.

## Review Notes
- In MySQL 8.0.34+, the `binlog_format` system variable was deprecated, and in MySQL 8.4 it was removed entirely with ROW being the only supported format. The post's description of all three formats (ROW, STATEMENT, MIXED) remains accurate for MySQL 8.0 and earlier but readers using MySQL 8.4+ should be aware that only ROW format is available.
- The `--base64-output=DECODE-ROWS` flag produces pseudo-SQL in comments (prefixed with `###`) that is not executable — this is correctly implied by the post's example but could be explicitly noted for clarity.
- The `--read-from-remote-server` option uses the COM_BINLOG_DUMP protocol. MySQL also supports `--read-from-remote-master=BINLOG-DUMP-GTID` for GTID-based replication environments, which is not covered but is outside the scope of this introductory guide.
