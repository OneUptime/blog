# Validation Summary: How to Use EXISTS and NOT EXISTS in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (EXISTS and NOT EXISTS operators)
- SQL (correlated subqueries, DELETE with subqueries, anti-join patterns)

## Sources Consulted
- MySQL 8.0 Reference Manual — EXISTS and NOT EXISTS Subqueries: https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html
- MySQL 8.0 Reference Manual — Optimizing Subqueries with EXISTS Strategy: https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization-with-exists.html
- MySQL 8.0 Reference Manual — DELETE Statement: https://dev.mysql.com/doc/refman/8.0/en/delete.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is valid MySQL. All six query examples were traced against the sample data and produce the expected output shown.
- The advice that `SELECT 1` is preferable to `SELECT *` in EXISTS subqueries is a widely taught convention. In practice, MySQL's optimizer recognizes EXISTS semantics and does not retrieve column data regardless of the SELECT list, so the performance difference is negligible. The recommendation is harmless but worth noting it is stylistic rather than a performance concern.
- The performance comparison between EXISTS and IN is presented as a general heuristic. In modern MySQL 8.0+, the optimizer can transform IN subqueries into semi-joins, which may perform comparably to EXISTS. The post's guidance is reasonable as a default rule of thumb but is a simplification of actual optimizer behavior.
- The NULL behavior explanation for NOT IN is correct and is an important practical distinction that the post handles well.
