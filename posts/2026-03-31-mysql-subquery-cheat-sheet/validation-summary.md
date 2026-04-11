# Validation Summary: MySQL Subquery Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- MySQL (subqueries, scalar subqueries, correlated subqueries, derived tables, EXISTS, IN, ANY/ALL, CTEs)

## Sources Consulted
- MySQL 8.0 Reference Manual: Subqueries — https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- MySQL 8.0 Reference Manual: Subqueries with EXISTS or NOT EXISTS — https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html
- MySQL 8.0 Reference Manual: Subqueries with ANY, IN, or SOME — https://dev.mysql.com/doc/refman/8.0/en/any-in-some-subqueries.html
- MySQL 8.0 Reference Manual: Subqueries with ALL — https://dev.mysql.com/doc/refman/8.0/en/all-subqueries.html
- MySQL 8.0 Reference Manual: Derived Tables — https://dev.mysql.com/doc/refman/8.0/en/derived-tables.html
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html

## Issues Found
No technical issues found.

## Review Notes
- The "Subquery in FROM with Aggregation" example uses `MAX(total_salary)` with `GROUP BY dept_id` on the outer query, but the inner derived table already produces exactly one row per `dept_id`. The outer `GROUP BY` and `MAX()` are redundant — a simple `SELECT dept_id, total_salary FROM (...) dept_totals` would suffice. The query is correct and executes without error, but could be misleading as a teaching example since it implies the outer aggregation is necessary.
- The summary states "EXISTS is more efficient than IN for correlated lookups." This is conventional wisdom and true for the short-circuit behavior of EXISTS, but modern MySQL 8.0+ optimizer can transform IN subqueries into semi-joins, making performance comparable in many cases. The claim is not incorrect but is a simplification.
- CTEs (`WITH` syntax) require MySQL 8.0+. The post does not mention this version requirement, which could confuse readers on MySQL 5.7 or earlier.
