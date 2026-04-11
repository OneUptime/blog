# Validation Summary: How to Optimize INSERT Performance in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB and MyISAM storage engines)
- SQL (INSERT, LOAD DATA INFILE, ALTER TABLE, transactions)
- InnoDB configuration tuning (innodb_flush_log_at_trx_commit, innodb_buffer_pool_size)

## Sources Consulted
- MySQL 8.0 Reference Manual: INSERT Statement — https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: LOAD DATA Statement — https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement (DISABLE KEYS / ENABLE KEYS) — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: innodb_flush_log_at_trx_commit — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit
- MySQL 8.0 Reference Manual: Reserved Words — https://dev.mysql.com/doc/refman/8.0/en/keywords.html

## Issues Found

1. **DISABLE KEYS comment incorrectly suggests InnoDB compatibility (line 78)**: The comment stated "MyISAM specific, or use for InnoDB bulk loads." `ALTER TABLE ... DISABLE KEYS` has no effect on InnoDB tables — it only works with MyISAM. Fixed the comment to "MyISAM only, has no effect on InnoDB." The post already had the correct follow-up advice about dropping/recreating secondary indexes for InnoDB.

2. **innodb_flush_log_at_trx_commit comment described wrong value (lines 93-94)**: The comment said "0 = flush every second (not every commit)" but the SET command uses value 2. Value 0 writes and flushes once per second with nothing at commit time. Value 2 writes to the OS cache at each commit but flushes to disk only once per second. Fixed the comment to accurately describe value 2.

3. **`key` used as unquoted column name (lines 111-116)**: `KEY` is a reserved word in MySQL. Using it without backtick-quoting would cause a syntax error. Added backticks around `key` in both INSERT examples.

4. **Deprecated `VALUES()` syntax in ON DUPLICATE KEY UPDATE (line 117)**: The `VALUES(col_name)` function in ON DUPLICATE KEY UPDATE context was deprecated in MySQL 8.0.20. Updated to the modern row alias syntax (`AS new_row ... new_row.value`), which is the recommended approach for MySQL 8.0.20+.

## Review Notes
- The "10-20x faster" claim for LOAD DATA INFILE vs INSERT is a commonly cited range and is reasonable, though actual speedup varies significantly based on table structure, indexes, and hardware.
- The batch size recommendation of 500-5,000 rows is sensible general guidance. The optimal batch size depends on row size and `max_allowed_packet` setting, which could be mentioned for completeness.
- The post correctly notes that setting `innodb_flush_log_at_trx_commit` to a non-default value carries durability risk, which is important context for production use.
