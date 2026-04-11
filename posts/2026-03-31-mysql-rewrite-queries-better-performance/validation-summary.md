# Validation Summary: How to Rewrite Queries for Better Performance in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (query optimization, EXPLAIN, indexing)
- SQL (subqueries, JOINs, UNION ALL, HAVING, covering indexes)

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions (https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization.html)
- MySQL 8.0 Reference Manual: Optimizing Derived Tables and View References with Merging or Materialization (https://dev.mysql.com/doc/refman/8.0/en/derived-table-optimization.html)
- MySQL 8.0 Reference Manual: Comparison Operators — NULL-safe equality and != behavior with NULLs (https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html)
- MySQL 8.0 Reference Manual: Index Merge Optimization (https://dev.mysql.com/doc/refman/8.0/en/index-merge-optimization.html)

## Issues Found

1. **Pattern 3 — UNION ALL duplicate-prevention had a NULL bug**: The condition `AND email != 'alice@example.com'` silently drops rows where `email IS NULL`, because `NULL != 'value'` evaluates to NULL (falsy in a WHERE clause). The original OR query would correctly return rows matching on `phone` regardless of a NULL `email`. Fixed by changing the condition to `AND (email != 'alice@example.com' OR email IS NULL)`.

2. **Pattern 5 — Misleading comment about derived_merge**: The comment stated "MySQL optimizer usually handles this via derived_merge" and suggested HAVING was only needed for "non-mergeable cases." This is incorrect: `derived_merge` cannot optimize derived tables that contain `GROUP BY`, `HAVING`, aggregate functions, `DISTINCT`, `LIMIT`, or `UNION` (per MySQL docs). In this specific example with `GROUP BY`, the derived table is always materialized, so HAVING is always the better approach. Fixed the comment to accurately reflect this behavior.

## Review Notes
- All SQL syntax is correct for MySQL 5.7+ and 8.0+.
- Pattern 2 (correlated subquery to JOIN): MySQL 8.0+ has improved subquery optimization and may automatically decorrelate some subqueries, but the JOIN rewrite remains a solid best practice and is still faster in many real-world cases.
- Pattern 4 (NOT IN vs LEFT JOIN IS NULL): The post correctly notes the NULL semantics issue with NOT IN. `NOT EXISTS` is also a valid alternative that the post mentions in passing but doesn't demonstrate — this could be a useful addition in the future.
- Pattern 5: The `HAVING total > 1000` syntax using a column alias in HAVING is a MySQL extension to standard SQL. This is fine for a MySQL-focused post but worth noting for readers porting queries to other databases.
- EXPLAIN FORMAT=JSON has been available since MySQL 5.6 and is correctly demonstrated.
