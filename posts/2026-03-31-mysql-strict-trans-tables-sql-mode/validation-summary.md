# Validation Summary: How to Use STRICT_TRANS_TABLES SQL Mode in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- SQL Modes (STRICT_TRANS_TABLES, STRICT_ALL_TABLES)
- InnoDB and MyISAM storage engines
- MySQL configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server SQL Modes: https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL 8.0 Server Error Reference (Error 1366 / ER_TRUNCATED_WRONG_VALUE_FOR_FIELD): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found

### Issue 1: Incorrect description of non-transactional table behavior (line 23)
- **What was wrong:** The post stated that for non-transactional tables, STRICT_TRANS_TABLES "falls back to inserting an adjusted value for the first bad row in a multi-row insert." Per MySQL documentation, if the bad value is in the **first** row, the statement aborts entirely (same as transactional tables). Only bad values in **subsequent** rows get adjusted to the closest valid value with a warning.
- **What was changed:** Rewrote the sentence to correctly describe the first-row-abort / subsequent-row-adjust behavior.

### Issue 2: Inaccurate STRICT_TRANS_TABLES vs STRICT_ALL_TABLES comparison (line 94)
- **What was wrong:** The post stated that with STRICT_TRANS_TABLES, "the first bad row causes an error but previously inserted rows in the statement may remain." This actually describes STRICT_ALL_TABLES behavior. With STRICT_TRANS_TABLES on non-transactional tables, the first bad row aborts the statement, and later bad rows are silently adjusted (no error, just a warning).
- **What was changed:** Corrected the description to accurately distinguish STRICT_ALL_TABLES (error + partial update) from STRICT_TRANS_TABLES (abort on first row, adjust on later rows).

## Review Notes
- The SQL examples are syntactically correct and the error code/SQLSTATE (1366 / HY000) is verified against the MySQL error reference.
- The `CONCAT` approach for enabling the mode via SET GLOBAL/SESSION is functional but could result in duplicate entries if STRICT_TRANS_TABLES is already present; MySQL handles this gracefully so it is not technically wrong.
- The claim that STRICT_TRANS_TABLES is enabled by default in MySQL 8.0 is correct — it is one of six default sql_mode values.
