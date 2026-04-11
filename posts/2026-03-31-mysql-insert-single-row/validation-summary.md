# Validation Summary: How to Insert a Single Row in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (INSERT INTO statement, DML operations)
- Python (mysql-connector / mysqlclient driver example)

## Sources Consulted
- MySQL 8.0 Reference Manual — INSERT Statement: https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual — LAST_INSERT_ID(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- MySQL 8.0 Reference Manual — ROW_COUNT(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual — INSERT IGNORE and ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — DEFAULT keyword in INSERT: https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual — UTC_TIMESTAMP(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_utc-timestamp
- Python DB-API 2.0 — cursor.lastrowid: https://peps.python.org/pep-0249/#lastrowid

## Issues Found
No technical issues found.

## Review Notes
- The `ROW_COUNT()` example is correct but worth noting that it returns the affected row count of the *immediately preceding* statement. If any other statement runs between the INSERT and the `SELECT ROW_COUNT()` call, the result will reflect that intervening statement instead. The post's usage is correct as presented.
- All SQL syntax is valid for MySQL 5.7+ and 8.0+.
- The Python example uses parameterized queries with `%s` placeholders, which is the correct and safe approach for mysql-connector-python and mysqlclient drivers.
