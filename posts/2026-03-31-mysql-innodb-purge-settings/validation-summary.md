# Validation Summary: How to Configure InnoDB Purge Settings in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- MVCC (Multi-Version Concurrency Control)
- InnoDB purge system and undo logs
- InnoDB INFORMATION_SCHEMA tables

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Purge Configuration — https://dev.mysql.com/doc/refman/8.0/en/innodb-purge-configuration.html
- MySQL 8.0 Reference Manual: innodb_purge_threads — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_purge_threads
- MySQL 8.0 Reference Manual: innodb_max_purge_lag — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_max_purge_lag
- MySQL 8.0 Reference Manual: INNODB_METRICS Table — https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-metrics-table.html
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found

1. **`innodb_purge_threads` incorrectly described as dynamic in MySQL 8.0**: The post included a `SET GLOBAL innodb_purge_threads = 8;` command with a comment stating it is "dynamic in 8.0". This variable is NOT dynamic in any MySQL version — it requires a server restart. Removed the `SET GLOBAL` command and corrected the text to state the variable requires a restart.

2. **Purge lag delay formula was incorrect**: The post stated the formula as `delay = (HLL / innodb_max_purge_lag - 1) * 5` microseconds. The correct formula (MySQL 8.0.14+) is `delay = (purge_lag / innodb_max_purge_lag - 0.9995) * 10000` microseconds. The multiplier was off by a factor of 2000 and the subtracted constant was wrong.

3. **`NOW() - trx_started` does not return seconds**: MySQL's `-` operator on DATETIME values performs integer subtraction on the YYYYMMDDHHMMSS numeric representation, not a time difference in seconds. For example, a 1-hour difference returns 10000 instead of 3600. Changed to `TIMESTAMPDIFF(SECOND, trx_started, NOW())` which correctly computes elapsed seconds.

4. **"more than 32 threads provides diminishing returns" is misleading**: The maximum allowed value for `innodb_purge_threads` is 32 (range 1–32). You cannot set it above 32. Changed wording to state that 32 is the maximum allowed value.

5. **Wrong SUBSYSTEM name in INNODB_METRICS query**: The query used `SUBSYSTEM IN ('purge', 'trx')` but the correct subsystem name for transaction metrics (including `trx_rseg_history_len`) is `'transaction'`, not `'trx'`. A query filtering by `'trx'` would return zero rows. Changed to `SUBSYSTEM IN ('purge', 'transaction')`.

## Review Notes
- The post's guidance on HLL thresholds (10,000 as a warning, 100,000 as critical) are reasonable rules of thumb, though not officially documented thresholds.
- The `innodb_undo_log_truncate` variable defaults to ON in MySQL 8.0.2+, so explicitly enabling it is only necessary for earlier 8.0 versions. The post's example is not wrong but could note this.
- The `innodb_max_undo_log_size` example sets it to 1GB, which is the default value. Not incorrect, but redundant for illustration purposes.
