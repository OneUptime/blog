# Validation Summary: How to Configure InnoDB I/O Capacity in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB I/O capacity tuning (`innodb_io_capacity`, `innodb_io_capacity_max`)
- InnoDB flush methods (`innodb_flush_method`)
- InnoDB adaptive flushing
- fio (Flexible I/O Tester) for storage benchmarking
- MySQL Performance Schema (`file_summary_by_event_name`)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_io_capacity
- MySQL 8.0 Reference Manual: innodb_io_capacity_max — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_io_capacity_max
- MySQL 8.0 Reference Manual: innodb_flush_method — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_flush_method
- MySQL 8.0 Reference Manual: Performance Schema File I/O Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-file-summary-tables.html
- MySQL 8.0 Reference Manual: InnoDB Server Status Variables — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- fio documentation — https://fio.readthedocs.io/en/latest/

## Issues Found
1. **Incorrect column names in performance_schema query**: The query selecting from `performance_schema.file_summary_by_event_name` used `NAME` and `COUNT` as column names. The correct column names are `EVENT_NAME` and `COUNT_STAR`. The original query would have produced an SQL error. Fixed both column references.

## Review Notes
- The fio benchmark uses `--bs=4k` with a comment saying "similar to InnoDB page writes," but InnoDB's default page size is 16K (`innodb_page_size=16384`). While 4K random write IOPS is the standard storage benchmark metric and is commonly used for this purpose, the comment is slightly misleading. Not changed since 4K IOPS is the industry-standard benchmark and storage vendors quote specs in 4K IOPS.
- The redo log status variables `Innodb_redo_log_current_lsn` and `Innodb_redo_log_checkpoint_lsn` were introduced in MySQL 8.0.30. For earlier MySQL 8.0 versions, users would need to parse `SHOW ENGINE INNODB STATUS` output instead. The post does not specify a MySQL version requirement for this section.
- The `O_DIRECT_NO_FSYNC` flush method recommendation for NVMe is valid but the MySQL documentation notes it should be used with caution — it skips the fsync() call after each write, relying on the OS not to reorder writes. This is generally safe on modern Linux with NVMe but carries risk on some configurations.
- All other technical claims, default values, SQL syntax, configuration syntax, and status variable names are accurate.
