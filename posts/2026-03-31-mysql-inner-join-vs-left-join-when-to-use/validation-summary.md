# Validation Summary: MySQL INNER JOIN vs LEFT JOIN: When to Use Each

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (JOIN syntax, query optimization)
- SQL (INNER JOIN, LEFT JOIN, LEFT OUTER JOIN)

## Sources Consulted
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — CREATE INDEX: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — EXPLAIN Output: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions (anti-join optimization): https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and follows standard MySQL conventions.
- The anti-join pattern (LEFT JOIN + WHERE IS NULL) is accurately described and is the idiomatic approach in MySQL. The post could mention that `NOT EXISTS` is an alternative anti-join pattern that MySQL also optimizes well, but its omission is not an error.
- The performance claim that INNER JOIN "can be faster" is appropriately hedged — it avoids overstating the difference, which depends heavily on indexes, data distribution, and the optimizer's plan.
- The decision guide table is a useful and accurate quick reference.
