# Validation Summary: How to Use EXPLAIN for SELECT Queries in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (EXPLAIN statement)
- MySQL 8.0+ (EXPLAIN ANALYZE)
- SQL query optimization

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: EXPLAIN Statement (https://dev.mysql.com/doc/refman/8.0/en/explain.html)
- MySQL 8.0 Reference Manual: EXPLAIN ANALYZE (https://dev.mysql.com/doc/refman/8.0/en/explain.html#explain-analyze)

## Issues Found
1. **Incorrect `PRIMARY` select_type description**: The post described `PRIMARY` as "outermost SELECT in a subquery," which is misleading — it implies PRIMARY is itself nested inside a subquery. Changed to "outermost SELECT when subqueries or unions are present," which matches the MySQL documentation definition.

## Review Notes
- EXPLAIN ANALYZE was specifically introduced in MySQL 8.0.18, not just "MySQL 8." The post's wording is acceptable for a general audience but could be more precise.
- The EXPLAIN output columns list omits `partitions`, `key_len`, `ref`, and `filtered` columns present in MySQL 5.7+. This is acceptable as the post focuses on the most important columns.
- The `type` column list omits less common join types (`fulltext`, `ref_or_null`, `index_merge`, `unique_subquery`, `index_subquery`). This is fine for an introductory guide.
- The `SUBQUERY` select_type description ("inner SELECT in a subquery") is slightly imprecise — the MySQL docs say "First SELECT in subquery" — but is acceptable for this level of detail.
