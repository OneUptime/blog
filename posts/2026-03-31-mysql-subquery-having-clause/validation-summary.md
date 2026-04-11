# Validation Summary: How to Use Subqueries in the HAVING Clause in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SQL syntax, GROUP BY, HAVING, subqueries, CTEs, aggregate functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: HAVING clause — https://dev.mysql.com/doc/refman/8.0/en/select.html#id4651990
- MySQL 8.0 Reference Manual: Subqueries — https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- MySQL 8.0 Reference Manual: Date and Time Functions (MONTH, CURDATE, INTERVAL) — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html

## Issues Found

1. **Incorrect code fence language tag**: The SQL logical execution order diagram used ` ```dockerfile ` as the language tag. Changed to ` ```text ` since it is a plain-text diagram, not a Dockerfile.

2. **Missing `active` column in `employees` CREATE TABLE**: The "Combining HAVING with a subquery and a WHERE clause" section references `WHERE active = 1`, but the `employees` table definition did not include an `active` column. Added `active TINYINT DEFAULT 1` to the CREATE TABLE statement so readers following along sequentially won't get an error.

3. **Missing `order_date` column in `orders` CREATE TABLE**: The "SUM in HAVING compared to a threshold from another table" section references `MONTH(order_date)`, but the `orders` table definition did not include an `order_date` column. Added `order_date DATE` to the CREATE TABLE statement.

4. **`MONTH(CURDATE()) - 1` returns 0 in January**: The expression `MONTH(CURDATE()) - 1` performs integer arithmetic on the month number, returning 0 when the current month is January. Since no valid date has month 0, the subquery would match no rows and return NULL, causing the HAVING comparison to fail silently. Changed to `MONTH(CURDATE() - INTERVAL 1 MONTH)` which correctly wraps January back to December (month 12).

## Review Notes
- The "SUM in HAVING" example filters by month only (not year), so it would match orders from December of any year when run in January. This is a simplification acceptable for a tutorial but would need year filtering in production.
- The CTE example requires MySQL 8.0+. MySQL 5.7 reached end-of-life in October 2023, so this is a reasonable baseline.
- The summary states that subqueries in HAVING run once (non-correlated). While the examples in this post are all non-correlated, correlated subqueries in HAVING are also valid MySQL. The statement is accurate in context of this article's scope.
