# Validation Summary: How to Use TRUNCATE() Function for Numbers in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (TRUNCATE() numeric function)
- MySQL ROUND() function (for comparison)
- MySQL FLOOR() function (for comparison)
- MySQL stored functions (DELIMITER, CREATE FUNCTION)
- MySQL UNIX_TIMESTAMP() function

## Sources Consulted
- MySQL 8.0 Reference Manual: Mathematical Functions — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_truncate
- MySQL 8.0 Reference Manual: ROUND() — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_round
- MySQL 8.0 Reference Manual: FLOOR() — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_floor
- MySQL 8.0 Reference Manual: CREATE FUNCTION — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples produce correct results and use valid MySQL syntax.
- The TRUNCATE vs FLOOR comparison correctly explains the critical difference: TRUNCATE rounds toward zero while FLOOR rounds toward negative infinity, which matters for negative numbers.
- The ROUND(2.9999, 2) → 3.00 example correctly demonstrates cascading rounding behavior.
- The stored function uses the standard amortization formula and valid MySQL stored function syntax including DELIMITER, DETERMINISTIC, DECLARE, and proper data types.
- The summary uses "floor" in quotes colloquially; the post itself correctly distinguishes TRUNCATE from FLOOR in a dedicated section, so this is not misleading.
- The timestamp bucketing technique (dividing UNIX_TIMESTAMP by 900, truncating, then multiplying back) is a well-known and correct approach for 15-minute interval grouping.
