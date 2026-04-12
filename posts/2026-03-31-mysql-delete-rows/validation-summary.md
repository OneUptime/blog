# Validation Summary: How to Delete Rows with DELETE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DELETE statement, DML)
- Python (`mysql-connector-python` library)
- MySQL Workbench (`sql_safe_updates` mode)

## Sources Consulted
- MySQL 8.0 Reference Manual — DELETE Statement: https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual — sql_safe_updates: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_sql_safe_updates
- MySQL 8.0 Reference Manual — ROW_COUNT(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual — Subquery Restrictions: https://dev.mysql.com/doc/refman/8.0/en/subquery-restrictions.html
- mysql-connector-python documentation: https://dev.mysql.com/doc/connector-python/en/

## Issues Found
- **`sql_safe_updates` description was inaccurate.** The post stated that a DELETE "without a primary key condition in the WHERE clause" raises an error. This is incorrect in two ways: (1) `sql_safe_updates` checks for any key/indexed column, not just the primary key; (2) a LIMIT clause also satisfies the safety check, even without a key condition. Fixed the description to say "without a key condition in the WHERE clause or a LIMIT clause."

## Review Notes
- The derived table workaround for same-table subquery DELETEs is correct and remains the standard approach even in MySQL 8.0+.
- The summary states DELETE is "irreversible," which is true under autocommit (the default). Within an explicit transaction, ROLLBACK is possible, but the general advice is sound for the target audience.
- The Python example correctly uses parameterized queries with `%s` placeholders, which is the proper approach for `mysql-connector-python` to prevent SQL injection.
