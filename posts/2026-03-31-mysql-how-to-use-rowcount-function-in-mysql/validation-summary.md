# Validation Summary: How to Use ROW_COUNT() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (ROW_COUNT() information function)
- Python (mysql-connector-python / PyMySQL)
- Node.js (mysql2 library)

## Sources Consulted
- MySQL 8.0 Reference Manual — ROW_COUNT(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual — FOUND_ROWS(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_found-rows
- MySQL 8.0 Reference Manual — REPLACE Statement: https://dev.mysql.com/doc/refman/8.0/en/replace.html
- MySQL 8.0 Reference Manual — mysql_affected_rows() C API (CLIENT_FOUND_ROWS): https://dev.mysql.com/doc/refman/8.0/en/mysql-affected-rows.html
- MySQL 8.0 Release Notes (8.0.17 deprecation of SQL_CALC_FOUND_ROWS): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-17.html

## Issues Found
- **SQL_CALC_FOUND_ROWS / FOUND_ROWS() deprecation not mentioned**: The "ROW_COUNT() vs Found_Rows()" section used `SQL_CALC_FOUND_ROWS` and `FOUND_ROWS()` without noting that both are deprecated as of MySQL 8.0.17. Added an inline SQL comment noting the deprecation so readers on modern MySQL versions are aware.

## Review Notes
- All ROW_COUNT() behavior descriptions (returns affected rows for DML, -1 for SELECT, 0 for non-row statements) are accurate per official docs.
- The REPLACE reporting (2 for replaced, 1 for new) is correct per MySQL docs.
- The UPDATE "changed vs matched" distinction and CLIENT_FOUND_ROWS flag are correctly described.
- The Python `cursor.rowcount` and Node.js `result.affectedRows` APIs are correct for their respective libraries.
- The stored procedure examples are syntactically valid and demonstrate correct ROW_COUNT() usage patterns.
