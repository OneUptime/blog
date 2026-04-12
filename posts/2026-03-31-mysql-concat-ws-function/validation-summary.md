# Validation Summary: How to Use CONCAT_WS() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CONCAT_WS, CONCAT, GROUP_CONCAT, UPPER, LPAD, YEAR, MONTH, DAY, NOW, COALESCE, FORMAT)
- SQL (DDL: CREATE TABLE, DML: INSERT, SELECT)

## Sources Consulted
- MySQL 8.0 Reference Manual — String Functions and Operators: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_concat-ws
- MySQL 8.0 Reference Manual — CONCAT() Function: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_concat
- MySQL 8.0 Reference Manual — GROUP_CONCAT() Function: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_group-concat
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples are syntactically correct and produce the stated results.
- The NULL handling behavior for both CONCAT_WS() and CONCAT() is accurately described: CONCAT() returns NULL if any argument is NULL, while CONCAT_WS() skips NULL arguments.
- The comparison table between CONCAT_WS and CONCAT is accurate.
- The post correctly notes that a NULL separator causes CONCAT_WS() to return NULL.
- The example combining CONCAT_WS with YEAR(), MONTH(), DAY(), and LPAD() relies on MySQL's implicit integer-to-string conversion, which works correctly but readers should be aware this is MySQL-specific behavior.
- The GROUP_CONCAT section appropriately distinguishes row-level vs. aggregate-level concatenation.
