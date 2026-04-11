# Validation Summary: How to Optimize EXISTS vs IN Performance in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0+
- SQL (subqueries, EXISTS, IN, JOINs)
- MySQL EXPLAIN and query optimizer

## Sources Consulted
- MySQL 8.0 Reference Manual: Optimizing Subqueries with Semijoin Transformations — https://dev.mysql.com/doc/refman/8.0/en/semijoins.html
- MySQL 8.0 Reference Manual: Optimizing Subqueries with EXISTS Strategy — https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization-with-exists.html
- MySQL 8.0 Reference Manual: Optimizing IN and EXISTS Subquery Predicates — https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- SQL Standard behavior for NULL in NOT IN (three-valued logic)

## Issues Found
No technical issues found.

## Review Notes
- The semijoin optimization for `IN (subquery)` was originally introduced in MySQL 5.6, not 8.0. The post references MySQL 8.0 which is accurate (it does apply in 8.0), but readers should know the optimization has been available since 5.6, with improvements in subsequent versions.
- In MySQL 8.0+, the optimizer can also apply semijoin transformations to EXISTS subqueries, not just IN subqueries. The post's summary correctly notes they are often handled equivalently, but the individual sections could give the impression that semijoin is exclusive to IN.
- The NULL behavior with NOT IN is one of the most common SQL pitfalls and is well-explained here. This section alone makes the post valuable.
- All SQL examples are syntactically correct and use appropriate patterns (e.g., DISTINCT on the JOIN rewrite, IS NULL check on the LEFT JOIN anti-join pattern).
