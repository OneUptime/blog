# Validation Summary: How to Monitor File I/O with Performance Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Performance Schema
- MySQL sys schema
- File I/O monitoring (`file_summary_by_instance`, `file_summary_by_event_name`)
- InnoDB storage engine internals (tablespace files, redo logs)

## Sources Consulted
- MySQL 8.0 Reference Manual — Performance Schema File I/O Summary Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-file-summary-tables.html
- MySQL 8.0 Reference Manual — Performance Schema setup_instruments Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html
- MySQL 8.0 Reference Manual — Performance Schema setup_consumers Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-consumers-table.html
- MySQL 8.0 Reference Manual — Performance Schema Timer Units (picoseconds): https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html
- MySQL 8.0 Reference Manual — sys Schema io_global_by_file views: https://dev.mysql.com/doc/refman/8.0/en/sys-io-global-by-file-by-bytes.html
- MySQL 8.0 Reference Manual — InnoDB Redo Log: https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html

## Issues Found
- **Incorrect timer unit conversion in "Finding the Worst Offenders" query**: The query divided `SUM_TIMER_READ` and `MAX_TIMER_READ` by `1e6`, which converts picoseconds to microseconds, but the column aliases were labeled `avg_read_ms` and `max_read_ms` (milliseconds). Changed the divisor from `1e6` to `1e9` so the output correctly represents milliseconds, consistent with the aliases and with the `1e9` divisor used in the `file_summary_by_event_name` query earlier in the post.

## Review Notes
- In MySQL 8.0.30+, redo log files were renamed from `ib_logfile0`/`ib_logfile1` to `#ib_redo*` files in the `#innodb_redo` directory, and `innodb_log_file_size` was deprecated in favor of `innodb_redo_log_capacity`. The post's references to `ib_logfile` and `innodb_log_file_size` remain correct for MySQL versions prior to 8.0.30 and are still widely applicable.
- All other SQL queries, column names, table names, sys schema view names, and timer unit conversions (1e12 for seconds, 1e9 for milliseconds) are correct.
- The TRUNCATE approach for resetting Performance Schema summary tables is the documented method and is correct.
