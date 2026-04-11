# Validation Summary: How to Use the NOT Operator in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (NOT operator, WHERE clause filtering)

## Sources Consulted
- MySQL 8.0 Reference Manual — Logical Operators: https://dev.mysql.com/doc/refman/8.0/en/logical-operators.html
- MySQL 8.0 Reference Manual — Comparison Functions and Operators (IN, BETWEEN, LIKE, IS NULL): https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html
- MySQL 8.0 Reference Manual — EXISTS and NOT EXISTS Subqueries: https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html
- MySQL 8.0 Reference Manual — Optimizing Subqueries with EXISTS Strategy: https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization-with-exists.html

## Issues Found
No technical issues found.

## Review Notes
- The warning about `NOT IN` returning no rows when the subquery includes NULLs is accurate and important. This is a common pitfall (`x NOT IN (1, 2, NULL)` evaluates to UNKNOWN because `x != NULL` is always UNKNOWN, which makes the entire AND chain UNKNOWN).
- The De Morgan's law example is correct: `NOT (A AND B)` = `(NOT A) OR (NOT B)`, and the SQL equivalence shown is accurate.
- The performance note that `NOT IN` requires full table scans is a slight simplification — `NOT IN` with a small literal list and an indexed column can still use an index scan. However, the post hedges with "in most cases," which is acceptable.
- All SQL syntax is valid and would execute correctly on MySQL 5.7+/8.0+.
- The equivalence between `NOT (department = 'HR')`, `department != 'HR'`, and `department <> 'HR'` is correct — all three handle NULL values identically (excluding NULL rows).
