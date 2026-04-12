# Validation Summary: How to Use Conditional Aggregation in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CASE expressions, aggregate functions: SUM, COUNT, AVG, COUNT DISTINCT, IF)

## Sources Consulted
- MySQL 8.0 Reference Manual — CASE Expression: https://dev.mysql.com/doc/refman/8.0/en/case.html
- MySQL 8.0 Reference Manual — Aggregate Functions: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- MySQL 8.0 Reference Manual — IF Function: https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_if
- MySQL 8.0 Reference Manual — COUNT(DISTINCT): https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_count-distinct

## Issues Found
1. **Incorrect mention of `NULLIF` in Conditional Averages section**: The introductory text said "use `AVG()` with `NULLIF` to exclude non-matching rows" but the code example does not use `NULLIF`. It relies on omitting the `ELSE` clause in the `CASE` expression to return `NULL`, which `AVG()` ignores. Fixed the text to accurately describe the technique used in the code.

2. **Misleading description in Counting Distinct Values section**: The introductory text said "Combine `COUNT(DISTINCT ...)` with a subquery or use a workaround with `NULLIF`" but the code uses neither a subquery nor `NULLIF`. It uses `COUNT(DISTINCT CASE WHEN ... END)` directly, which is the standard and idiomatic approach. Fixed the text to match the actual code.

## Review Notes
- All SQL code examples are syntactically correct and use standard MySQL syntax.
- The `CASE` inside aggregate functions pattern is well-supported across all MySQL versions (5.x and 8.x).
- The `IF()` shorthand is MySQL-specific and correctly noted as such.
- Performance claims about single-scan processing and index usage are accurate.
