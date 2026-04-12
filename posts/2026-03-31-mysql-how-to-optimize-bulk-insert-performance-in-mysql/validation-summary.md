# Validation Summary: How to Optimize Bulk INSERT Performance in MySQL

## Status
validated

## Post Type
Tutorial / Performance Guide

## Technologies Covered
- MySQL (InnoDB, MyISAM)
- SQL (INSERT, LOAD DATA INFILE, REPLACE, INSERT IGNORE)
- Python (mysql.connector)

## Sources Consulted
- MySQL 8.0 Reference Manual: INSERT Statement — https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual: LOAD DATA Statement — https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement (DISABLE KEYS / ENABLE KEYS) — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: InnoDB Startup Configuration — https://dev.mysql.com/doc/refman/8.0/en/innodb-init-startup-configuration.html
- MySQL 8.0 Reference Manual: innodb_flush_log_at_trx_commit — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit
- MySQL 8.0 Reference Manual: innodb_log_buffer_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_log_buffer_size
- MySQL 8.0 Reference Manual: Optimizing INSERT Statements — https://dev.mysql.com/doc/refman/8.0/en/insert-optimization.html
- MySQL Connector/Python Developer Guide: cursor.executemany() — https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-executemany.html

## Issues Found
1. **Technique 4 — `ALTER TABLE ... DISABLE KEYS` missing MyISAM-only caveat**: The `DISABLE KEYS` / `ENABLE KEYS` syntax only affects non-unique indexes on MyISAM tables. On InnoDB (the default engine since MySQL 5.5), the statement is silently ignored and provides no benefit. The post presented it as a general technique without noting this limitation. **Fix:** Added a note clarifying that `DISABLE KEYS` only works on MyISAM tables and updated the SQL comment accordingly. The subsequent InnoDB-specific section (`unique_checks`, `foreign_key_checks`) was already correct.

## Review Notes
- The Python example uses `mysql.connector.connect()` with `executemany()`, which is correct. Note that `executemany` in the mysql-connector-python driver does not automatically rewrite to a multi-row INSERT by default; setting `connection.autocommit = False` (the default) and committing after each batch as shown is the right pattern.
- `REPLACE` is presented as an upsert option, which is technically correct but worth noting that it performs a DELETE + INSERT internally (rather than an UPDATE), which can be slower and has side effects like changing AUTO_INCREMENT values and firing DELETE triggers. `INSERT ... ON DUPLICATE KEY UPDATE` is generally preferred for true upserts. This is not an error in the post but could be mentioned in a future revision.
- The `innodb_log_buffer_size` variable became dynamically settable only in MySQL 8.0.12+. On earlier versions, `SET GLOBAL innodb_log_buffer_size` would fail. Since MySQL 5.7 reached EOL in October 2023, assuming MySQL 8.0+ is reasonable for a 2026 post.
