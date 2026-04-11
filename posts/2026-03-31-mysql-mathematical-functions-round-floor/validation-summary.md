# Validation Summary: How to Use MySQL Mathematical Functions (ROUND, FLOOR, CEIL, ABS)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (DDL, DML, mathematical functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: Mathematical Functions — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html
- MySQL 8.0 Reference Manual: Precision Math — https://dev.mysql.com/doc/refman/8.0/en/precision-math.html
- MySQL 8.0 Reference Manual: DECIMAL Data Type — https://dev.mysql.com/doc/refman/8.0/en/fixed-point-types.html

## Issues Found

1. **Incorrect ROUND output for Mouse row**: `ROUND(29.9500, 2)` was shown as `30.00` but should be `29.95`. The third decimal digit is `0`, which does not trigger rounding up. Fixed the output table.

2. **Incorrect FLOOR output for Headphones row**: `FLOOR(89.4950 * (1 - 5.00 / 100))` = `FLOOR(85.02025)` = `85`, but the output table showed `84`. Fixed to `85`.

3. **Overly broad ROUND rounding claim**: The post stated "When the digit after the rounding position is exactly 5, MySQL rounds away from zero" as a general rule. This is only true for exact-value types (DECIMAL, integer). For approximate-value types (FLOAT, DOUBLE), the behavior depends on the C library and is typically "round half to even" (banker's rounding). Updated the description to clarify this distinction.

## Review Notes
- All SQL syntax is correct and uses current, non-deprecated MySQL functions.
- The CREATE TABLE and INSERT statements are syntactically valid.
- The CEIL/CEILING output table is correct.
- The ABS, TRUNCATE, MOD, POWER, SQRT, RAND, and LOG examples are all correct.
- The best practices section contains sound advice, particularly the guidance about TRUNCATE vs FLOOR for negative numbers and using DECIMAL for financial calculations.
- The practical combined example query is syntactically correct and logically sound.
