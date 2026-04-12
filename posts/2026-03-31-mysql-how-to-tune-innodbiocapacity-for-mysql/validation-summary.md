# Validation Summary: How to Tune innodb_io_capacity for MySQL

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- `innodb_io_capacity` and `innodb_io_capacity_max` system variables
- `innodb_adaptive_flushing` system variable
- fio (Flexible I/O Tester) for benchmarking
- MySQL Performance Schema
- AWS EBS (gp3, io2)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB I/O Capacity Configuration: https://dev.mysql.com/doc/refman/8.0/en/innodb-configuring-io-capacity.html
- MySQL 8.0 Reference Manual — InnoDB Startup Options and System Variables: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual — InnoDB Buffer Pool Flushing: https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool-flushing.html
- MySQL 8.0 Reference Manual — Server Status Variables: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — Optimizing InnoDB Disk I/O: https://dev.mysql.com/doc/refman/8.0/en/optimizing-innodb-diskio.html

## Issues Found
- **SET GLOBAL ordering error**: The original post set `innodb_io_capacity` before `innodb_io_capacity_max`. When the current `innodb_io_capacity_max` is 2000 (the default), attempting `SET GLOBAL innodb_io_capacity = 4000` fails because MySQL enforces the constraint that `innodb_io_capacity` must not exceed `innodb_io_capacity_max`. Fixed by swapping the order of both the SET GLOBAL statements and the config file directives, and added a clarifying note explaining why the max must be set first.

## Review Notes
- The section titled "innodb_flush_sync and Adaptive Flushing" mentions `innodb_flush_sync` in the heading but does not discuss the variable itself. When `innodb_flush_sync` is ON (default), InnoDB can exceed `innodb_io_capacity_max` during checkpoint flushing. The post's statement that adaptive flushing uses `innodb_io_capacity_max` as its ceiling is correct for adaptive flushing specifically, but readers should be aware that `innodb_flush_sync` can override this ceiling during checkpoints.
- The fio command uses `--ioengine=libaio`, which is Linux-specific. This is appropriate since most MySQL servers run on Linux, but macOS or Windows users would need a different I/O engine.
- The 30-40% dirty page threshold mentioned as a warning sign is a reasonable rule of thumb. The actual default for `innodb_max_dirty_pages_pct` in MySQL 8.0 is 90 (raised from 75 in MySQL 5.7), so the post's threshold is conservative but useful as an early investigation trigger.
- All SQL queries, status variable names, and Performance Schema table references are correct for MySQL 8.0.
