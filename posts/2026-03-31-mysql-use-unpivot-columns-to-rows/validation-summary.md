# Validation Summary: How to Use Unpivot (Columns to Rows) in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (general, applies to 5.7+ and 8.x)
- SQL UNION ALL
- SQL CROSS JOIN
- SQL CASE expressions

## Sources Consulted
- MySQL 8.0 Reference Manual — UNION Clause: https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual — SELECT Statement: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — CASE Expression: https://dev.mysql.com/doc/refman/8.0/en/case.html
- MySQL 8.0 Reference Manual — INSERT ... SELECT: https://dev.mysql.com/doc/refman/8.0/en/insert-select.html
- MySQL 8.0 Reference Manual — DECIMAL Data Type: https://dev.mysql.com/doc/refman/8.0/en/fixed-point-types.html

## Issues Found
No technical issues found.

## Review Notes
- The result table displays DECIMAL(10,2) values without trailing zeros (e.g., `5000` instead of `5000.00`). This is a common blog formatting simplification and does not affect correctness of the technique being taught.
- The "Dynamic Unpivot" section title is slightly informal — the approach using a numbers table with CROSS JOIN still hard-codes column names in a CASE expression. It reduces repetition but is not truly dynamic (that would require prepared statements or dynamic SQL). The section body text correctly describes it as avoiding repetition rather than being fully dynamic.
- The "Unpivot Multiple Measure Columns" section references a hypothetical `wide_sales` table not defined in the post. This is acceptable as an illustrative pattern but readers would need to adapt it to their own schema.
- All SQL syntax is valid for MySQL 5.7+ and 8.x. The techniques shown are the standard approach for unpivoting in MySQL, which lacks a native UNPIVOT operator (unlike SQL Server, Oracle, or PostgreSQL with LATERAL/UNNEST).
