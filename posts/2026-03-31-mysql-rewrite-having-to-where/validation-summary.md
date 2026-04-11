# Validation Summary: How to Rewrite HAVING to WHERE When Possible in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SQL query optimization)
- SQL HAVING and WHERE clauses
- GROUP BY and aggregate functions
- MySQL index usage with filtered queries

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement (https://dev.mysql.com/doc/refman/8.0/en/select.html)
- MySQL 8.0 Reference Manual: GROUP BY Modifiers — HAVING clause (https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html)
- MySQL 8.0 Reference Manual: WHERE Clause Optimization (https://dev.mysql.com/doc/refman/8.0/en/where-optimization.html)
- MySQL 8.0 Reference Manual: Problems with Column Aliases (https://dev.mysql.com/doc/refman/8.0/en/problems-with-alias.html)

## Issues Found
- **Example 2 (Date Filter in HAVING) — semantically incorrect rewrite:** The original BEFORE query used `HAVING YEAR(MIN(created_at)) = 2024`, which references the aggregate function `MIN()`. This directly contradicts the post's own rule that only non-aggregate conditions can be moved from HAVING to WHERE. Furthermore, the proposed AFTER query (`WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'`) is not semantically equivalent — the BEFORE query found customers whose *earliest* order was in 2024 and counted *all* their orders, while the AFTER query counted only 2024 orders for *any* customer with orders in that year. **Fix:** Replaced the example with a correct non-aggregate date filter. The new BEFORE query uses `HAVING order_year = 2024` (where `order_year` is the alias for `YEAR(created_at)`, a non-aggregate expression), which can validly be moved to a WHERE range condition for better performance and index usage.

## Review Notes
- MySQL's optimizer can sometimes automatically move non-aggregate HAVING conditions to WHERE (noted in the MySQL documentation), but explicit rewriting is still recommended for clarity and to ensure the optimization applies across all MySQL versions and storage engines.
- The post correctly notes that MySQL is a special case in allowing HAVING to reference SELECT aliases — this is a MySQL extension not part of standard SQL. This is worth knowing but the post handles it accurately.
- All other examples (1, 3, index usage, alias exception) are technically correct and demonstrate valid, semantically equivalent rewrites.
