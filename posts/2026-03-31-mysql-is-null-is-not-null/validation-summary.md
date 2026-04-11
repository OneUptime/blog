# Validation Summary: How to Use IS NULL and IS NOT NULL in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SQL syntax, NULL handling, IS NULL / IS NOT NULL predicates)
- SQL aggregate functions (COUNT, AVG, SUM)
- SQL JOIN operations (INNER JOIN, LEFT JOIN)
- COALESCE() and IFNULL() functions
- NULL-safe equality operator (<=>)

## Sources Consulted
- MySQL 8.0 Reference Manual — Comparison Functions and Operators: https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html
- MySQL 8.0 Reference Manual — Working with NULL Values: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual — Aggregate Functions: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — ORDER BY Optimization: https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL code examples are syntactically correct and produce the expected output as shown.
- The aggregate function calculations were manually verified: AVG(salary) = (95000 + 72000 + 105000 + 88000 + 65000) / 5 = 85000.0000, which correctly excludes Frank's NULL salary.
- COUNT(*) = 6, COUNT(salary) = 5 (excludes Frank), COUNT(dept_id) = 4 (excludes Eve and Frank) — all correct.
- The COALESCE/IFNULL output table was verified row-by-row against the sample data and is accurate.
- The NULL ORDER BY behavior (NULLs first in ASC, last in DESC) is correctly documented per MySQL behavior.
- The spaceship operator (`<=>`) section is accurate: `NULL <=> NULL` returns 1 and `NULL = NULL` returns NULL.
- All best practices listed are accurate and reflect MySQL documentation.
