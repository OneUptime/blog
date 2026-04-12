# Validation Summary: How to Calculate Cumulative Sums in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (window functions)
- MySQL 5.7 (user variables)
- SQL window functions: SUM() OVER, AVG() OVER
- PARTITION BY and ORDER BY clauses
- Window frame specifications (ROWS vs RANGE)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Concepts: https://dev.mysql.com/doc/refman/8.0/en/window-functions-concepts.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual — User-Defined Variables: https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Reference Manual — Aggregate Function Descriptions (SUM, AVG): https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html

## Issues Found
1. **Incorrect default frame specification** (Shorthand - Default Frame section): The post stated that "`ROWS UNBOUNDED PRECEDING` frame is the default when `ORDER BY` is specified." Per the MySQL 8.0 documentation, the actual default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, not `ROWS`. The difference between RANGE and ROWS matters when there are duplicate ORDER BY values — RANGE groups peers together while ROWS processes each row individually. Fixed the explanation to correctly state the default is RANGE and note that the shorthand produces the same result as the explicit ROWS frame when there are no duplicate ORDER BY values.

## Review Notes
- The MySQL 5.7 user variable approach relies on left-to-right evaluation of SELECT expressions, which is technically undefined behavior per MySQL documentation. This is a widely known and used pattern that works reliably in practice, but the post could mention this caveat. Not changed since it is standard practice in MySQL 5.7 tutorials.
- User variable assignment in expressions other than SET was deprecated in MySQL 8.0.13. The post correctly scopes this to MySQL 5.7 only, so no change needed.
- All computed results in the sample output are arithmetically correct.
- All SQL syntax is valid for the stated MySQL versions.
