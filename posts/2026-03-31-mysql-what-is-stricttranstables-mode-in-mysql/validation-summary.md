# Validation Summary: What Is STRICT_TRANS_TABLES Mode in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (SQL modes, specifically STRICT_TRANS_TABLES and STRICT_ALL_TABLES)
- InnoDB (transactional storage engine)
- Python (mysql.connector library for application-level error handling example)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server SQL Modes — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_strict_trans_tables
- MySQL 8.0 Reference Manual: STRICT_ALL_TABLES — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_strict_all_tables
- MySQL 8.0 Reference Manual: INSERT IGNORE behavior — https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual: SHOW WARNINGS — https://dev.mysql.com/doc/refman/8.0/en/show-warnings.html
- mysql-connector-python documentation for exception classes

## Issues Found
- **STRICT_TRANS_TABLES vs STRICT_ALL_TABLES comparison table**: The description of STRICT_TRANS_TABLES behavior on non-transactional tables was inaccurate. It stated "Warns on first bad row, accepts rest," which implies the first bad row is accepted with a warning. Per MySQL documentation, STRICT_TRANS_TABLES actually **errors** if the bad value occurs in the first row of a multi-row statement on a non-transactional table; it only adjusts and warns for bad values in subsequent rows (because already-inserted rows in non-transactional tables cannot be rolled back). Changed to: "Errors on first bad row; adjusts and warns for subsequent rows."

## Review Notes
- The "Checking Warnings After Insert" section shows `SHOW WARNINGS` output with Level=Error after a failed INSERT in strict mode. This is technically correct (SHOW WARNINGS displays errors from the previous statement), but readers might find it slightly confusing since the section title mentions "warnings." Not changed since it is technically accurate.
- The claim that STRICT_TRANS_TABLES is enabled by default in MySQL 8.0 is correct (it has been in the default sql_mode since MySQL 5.7.5).
- All SQL syntax, error codes (1406/22001, 1048/23000, 1292/22007), and Python exception handling are correct.
