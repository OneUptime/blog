# Validation Summary: How to Write a Basic Subquery in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SQL syntax, subqueries)
- SQL standard features (SELECT, WHERE, FROM, IN, EXISTS, UPDATE, INSERT)

## Sources Consulted
- MySQL 8.0 Reference Manual: Subqueries — https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: UPDATE Statement — https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual: INSERT Statement — https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual: Optimizing Subqueries — https://dev.mysql.com/doc/refman/8.0/en/optimizing-subqueries.html
- MySQL 8.0 Reference Manual: Date and Time Functions (DATE_SUB, NOW) — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found
No technical issues found.

## Review Notes
- The `NOT IN` subquery example (in the UPDATE section) could potentially return unexpected results if `customer_id` in the orders table contains NULL values, since `NOT IN` with NULLs evaluates to UNKNOWN. This is a known SQL gotcha but not a bug in the code as written — it depends on the schema. A future improvement could mention this caveat or suggest `NOT EXISTS` as a safer alternative.
- The `timestamp` column name used in the INSERT example is a MySQL reserved word. It works in most contexts without backticks, but using backticks (`` `timestamp` ``) would be more defensive. This is a minor style point, not a correctness issue.
- The performance tip "Use EXISTS instead of IN for large subquery results" is a reasonable general guideline. In MySQL 8.0+, the optimizer can often convert `IN` subqueries into efficient semi-joins automatically, so the performance difference is less pronounced than in older versions. The advice remains valid as a general rule of thumb.
