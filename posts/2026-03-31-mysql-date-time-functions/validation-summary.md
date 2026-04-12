# Validation Summary: How to Use DATE() and TIME() Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL DATE() function
- MySQL TIME() function
- MySQL DATETIME and TIMESTAMP data types
- MySQL HOUR(), CURDATE(), CAST(), DATE_FORMAT() functions
- MySQL stored procedures

## Sources Consulted
- MySQL 8.0 Reference Manual — DATE() and TIME() functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — CAST function: https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html
- MySQL 8.0 Reference Manual — DATE_FORMAT(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- MySQL 8.0 Reference Manual — CREATE PROCEDURE syntax: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html

## Issues Found
- **Misleading comment in comparison section**: The SQL comment "All return the same type of result for a DATETIME input" was inaccurate because `DATE()` and `CAST(... AS DATE)` return a `DATE` type, while `DATE_FORMAT()` returns a `VARCHAR`. The table in the post correctly noted this distinction, but the code comment contradicted it. Changed to: "All extract the date portion, but DATE_FORMAT returns a VARCHAR, not a DATE".

## Review Notes
- The `HOUR(TIME(viewed_at))` usage in the "Grouping by Hour of Day" section is redundant since `HOUR()` can extract directly from a DATETIME value without the intermediate `TIME()` call. However, since the post is specifically about demonstrating DATE() and TIME(), this usage is pedagogically reasonable and not incorrect.
- The index considerations advice is accurate and valuable — wrapping a column in DATE() prevents index usage, and the range-comparison alternative is the correct optimization.
