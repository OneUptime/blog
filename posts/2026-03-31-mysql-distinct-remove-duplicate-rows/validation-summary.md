# Validation Summary: How to Use DISTINCT to Remove Duplicate Rows in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (SELECT DISTINCT, aggregate functions, EXPLAIN)

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT DISTINCT syntax — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: GROUP BY handling — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- MySQL 8.0 Reference Manual: Aggregate functions (COUNT, SUM with DISTINCT) — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- MySQL 8.0 Reference Manual: Working with NULL values — https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual: EXPLAIN output — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found
No technical issues found.

## Review Notes
- The `YEAR(order_date) = 2025` filter in the aggregate example is functionally correct but prevents index usage on `order_date`. A range condition (`order_date >= '2025-01-01' AND order_date < '2026-01-01'`) would be more performant. This is a style/optimization choice rather than a correctness issue, so no change was made.
- `SUM(DISTINCT price)` is correctly noted as "unusual but valid" — it is rarely useful in practice since it sums only unique price values, which is seldom the intended behavior.
- The equivalence between `SELECT DISTINCT col` and `SELECT col FROM t GROUP BY col` is accurate; MySQL's optimizer often produces the same execution plan for both.
