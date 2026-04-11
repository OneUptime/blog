# Validation Summary: How to Use TRIM() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (TRIM, LTRIM, RTRIM string functions)
- SQL (DDL, DML, SELECT queries)

## Sources Consulted
- MySQL 8.0 Reference Manual: String Functions and Operators — TRIM() https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_trim
- MySQL 8.0 Reference Manual: String Functions — LTRIM(), RTRIM() https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_ltrim
- MySQL 8.0 Reference Manual: How MySQL Uses Indexes https://dev.mysql.com/doc/refman/8.0/en/mysql-indexes.html

## Issues Found
No technical issues found.

## Review Notes
- The syntax shown matches the official MySQL documentation exactly.
- All code examples produce the expected output, including edge cases like NULL handling, multi-character remstr, and nested TRIM calls.
- The multi-character remstr examples (e.g., `TRIM(LEADING 'www.' FROM 'www.example.com')`) are correct — MySQL TRIM supports multi-character remstr and removes it as a complete unit repeatedly from the edge.
- The claim that LTRIM and RTRIM only remove spaces (unlike TRIM which accepts a custom remstr) is accurate for MySQL.
- The performance note about function-wrapped columns preventing index usage is correct and is good practical advice.
- The UPDATE example's WHERE clause safely handles NULL values since `NULL != NULL` evaluates to NULL (falsy), meaning NULL rows are not unnecessarily updated.
