# Validation Summary: How to Use FORMAT() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (FORMAT(), ROUND(), TRUNCATE(), CONCAT() functions)
- SQL (DDL, DML, aggregate queries)

## Sources Consulted
- MySQL 8.0 Reference Manual — String Functions: FORMAT() (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_format)
- MySQL 8.0 Reference Manual — Mathematical Functions: ROUND(), TRUNCATE() (https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html)

## Issues Found
1. **Incorrect behavior for negative decimal_places**: The post claimed `FORMAT(123.456, -1)` returns `NULL` with the comment "negative decimal places returns NULL." In MySQL, negative values for the decimal_places argument are treated as 0, so the actual return value is `'123'`, not NULL. Fixed the example output and comment accordingly.

## Review Notes
- All other code examples (basic formatting, locale usage, NULL handling, negative numbers, CREATE TABLE/INSERT/SELECT, CONCAT usage, aggregate queries, comparison table) are technically correct.
- The advice about applying FORMAT() only at the final output stage is sound best practice.
- The locale parameter documentation correctly notes it was added in MySQL 5.6.
- The flowchart accurately represents the conceptual processing order of FORMAT().
