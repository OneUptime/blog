# Validation Summary: How to Use IN and NOT IN with Subqueries in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (IN, NOT IN, subqueries, EXISTS, JOINs)
- SQL (DDL, DML, aggregate functions, GROUP BY, HAVING)

## Sources Consulted
- MySQL 8.0 Reference Manual — Subqueries with IN: https://dev.mysql.com/doc/refman/8.0/en/any-in-some-subqueries.html
- MySQL 8.0 Reference Manual — EXISTS and NOT EXISTS: https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html
- MySQL 8.0 Reference Manual — Optimizing Subqueries with Semi-Join: https://dev.mysql.com/doc/refman/8.0/en/semijoins.html
- MySQL 8.0 Reference Manual — CREATE TABLE: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — Working with NULL Values: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html

## Issues Found
1. **`product_id` column had `NOT NULL` constraint conflicting with NULL trap example.** The `sale_items` table defined `product_id INT NOT NULL`, but the "NULL Trap with NOT IN" section later inserts `(NULL, 5)` into that column. This INSERT would be rejected by MySQL due to the `NOT NULL` constraint, making the entire NULL demonstration invalid. **Fix:** Changed `product_id INT NOT NULL` to `product_id INT` in the CREATE TABLE statement so the column accepts NULLs, allowing the NULL trap example to work as described.

## Review Notes
- All query outputs were verified against the sample data and are correct.
- The NULL trap explanation is accurate: when any value in a NOT IN subquery is NULL, the entire NOT IN predicate evaluates to UNKNOWN for every row, returning zero results. This is a well-documented SQL behavior.
- The performance note about JOINs vs IN subqueries is reasonable. In modern MySQL 8.0+, the optimizer often rewrites IN subqueries as semi-joins automatically, narrowing the performance gap. The post's hedged language ("often outperforms") is appropriate.
- The HAVING COUNT(*) > 2 query result lacks an ORDER BY clause, so row order is non-deterministic. The shown output matches insertion order, which is a common but not guaranteed behavior. This is minor and not incorrect per se.
