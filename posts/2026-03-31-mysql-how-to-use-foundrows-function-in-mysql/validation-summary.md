# Validation Summary: How to Use FOUND_ROWS() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (FOUND_ROWS(), SQL_CALC_FOUND_ROWS, ROW_COUNT())
- MySQL 8.0+ window functions (COUNT(*) OVER())
- Python (MySQL connector / cursor API)
- Node.js (mysql2 library)

## Sources Consulted
- MySQL 8.0 Reference Manual: FOUND_ROWS() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_found-rows
- MySQL 8.0 Reference Manual: SQL_CALC_FOUND_ROWS — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: ROW_COUNT() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Deprecation Notes (8.0.17) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-17.html

## Issues Found
No technical issues found.

## Review Notes
- The deprecation notice is accurate and well-placed. SQL_CALC_FOUND_ROWS and FOUND_ROWS() were deprecated in MySQL 8.0.17 and removed in MySQL 9.0. The post correctly advises using COUNT(*) or COUNT(*) OVER() as modern alternatives.
- The window function example (`COUNT(*) OVER()`) is correct — window functions are evaluated before LIMIT in MySQL's query processing order, so each returned row carries the full count of matching rows.
- The Node.js code uses mysql2-style destructuring (`[[{ total }]]`), which is correct but assumes the mysql2 library specifically. This is the most common MySQL library for Node.js, so the assumption is reasonable.
- The summary correctly notes that FOUND_ROWS() must be called immediately after the SELECT, as any intervening query resets the value.
