# Validation Summary: How MySQL InnoDB Purge Process Works

## Status
validated

## Post Type
Technical Guide / Reference

## Technologies Covered
- MySQL 8.0
- InnoDB Storage Engine
- InnoDB MVCC (Multi-Version Concurrency Control)
- InnoDB Purge System
- InnoDB Undo Logs

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Purge Configuration (https://dev.mysql.com/doc/refman/8.0/en/innodb-purge-configuration.html)
- MySQL 8.0 Reference Manual: innodb_purge_threads (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_purge_threads)
- MySQL 8.0 Reference Manual: innodb_purge_batch_size (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_purge_batch_size)
- MySQL 8.0 Reference Manual: innodb_undo_tablespaces (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_undo_tablespaces)
- MySQL 8.0 Reference Manual: innodb_max_undo_log_size (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_max_undo_log_size)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_METRICS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-metrics-table.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TRX Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html)

## Issues Found
1. **`innodb_purge_threads` dynamic status not noted**: The post used `SET GLOBAL innodb_purge_threads = 8;` without mentioning that this variable only became dynamic in MySQL 8.0.26. On earlier 8.0.x versions, this command would fail and a server restart is required. Added a SQL comment clarifying the version requirement.

2. **`innodb_undo_tablespaces` deprecated without note**: The `my.cnf` example included `innodb_undo_tablespaces = 2` without noting that this variable has been deprecated since MySQL 8.0.14 and the minimum value of 2 is already the default. Added an inline comment noting the deprecation.

## Review Notes
- The MVCC explanation, purge internals description, and monitoring queries are all technically accurate.
- The `information_schema.innodb_metrics` metric names (`trx_rseg_history_len`, `purge_del_mark_records`, `purge_upd_exist_or_extern_records`, `purge_undo_log_pages`) are valid InnoDB metric names. Some purge-related metrics may need to be explicitly enabled via `SET GLOBAL innodb_monitor_enable = 'purge';` before they return data, but the query itself is correct.
- The `innodb_purge_batch_size` is set to 300 in the example, which is the default value. This is fine for demonstration purposes but readers should know they may want to increase it (e.g., to 500-1000) for high-write workloads.
- The advice about long-running transactions blocking purge is accurate and practically important.
- The `information_schema.innodb_trx` query and column names are correct for MySQL 8.0.
