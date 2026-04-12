# Validation Summary: How to Use NOT EXISTS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (NOT EXISTS, EXISTS, NOT IN, correlated subqueries)
- SQL anti-join patterns
- MySQL DELETE with correlated subqueries
- MySQL date functions (YEAR, CURDATE, DATE_SUB, NOW)

## Sources Consulted
- MySQL 8.0 Reference Manual: EXISTS and NOT EXISTS Subqueries — https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html
- MySQL 8.0 Reference Manual: DELETE Statement — https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual: Comparison Functions and Operators (NULL-safe behavior) — https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html
- MySQL 8.0 Reference Manual: Subquery Restrictions — https://dev.mysql.com/doc/refman/8.0/en/subquery-restrictions.html
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found
No technical issues found.

## Review Notes
- The `DELETE FROM contacts c1 WHERE NOT EXISTS (...)` syntax using a table alias in a single-table DELETE is supported in MySQL 8.0.16+. Earlier versions (5.7, pre-8.0.16) do not support aliases in single-table DELETE statements. Since the post does not target a specific MySQL version and 8.0 is the current GA release, this is acceptable but worth noting.
- The derived table pattern in the duplicate-removal DELETE (`SELECT ... FROM (SELECT ... FROM contacts) keep_ids`) correctly avoids MySQL's restriction against referencing the target table directly in a subquery of a DELETE/UPDATE statement. This is a well-known workaround.
- The NULL behavior explanation for NOT IN is accurate and is one of the most common SQL pitfalls — when any value in the NOT IN subquery is NULL, the entire NOT IN predicate evaluates to UNKNOWN for every outer row, effectively returning zero results.
