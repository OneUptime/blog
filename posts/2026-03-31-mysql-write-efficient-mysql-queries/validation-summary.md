# Validation Summary: How to Write Efficient MySQL Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (query optimizer, EXPLAIN, indexes, composite indexes, covering indexes)
- SQL (DDL with ALTER TABLE, DML with SELECT, JOIN, WHERE, ORDER BY, LIMIT)

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: Multiple-Column Indexes (https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html)
- MySQL 8.0 Reference Manual: Covering Indexes / Using index optimization (https://dev.mysql.com/doc/refman/8.0/en/index-extensions.html)
- MySQL 8.0 Reference Manual: LIMIT Query Optimization (https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html)
- MySQL 8.0 Reference Manual: Optimizing Subqueries with EXISTS (https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html)

## Issues Found
- **Inaccurate comment in covering index section**: The comment said "Query reads only id, status, and amount" but the query also references `created_at` in the WHERE clause. A covering index must include all columns the query accesses (SELECT, WHERE, ORDER BY, etc.), so the comment was misleading. Changed to "Query references status, created_at, id, and amount" to accurately list all four columns the index must cover.

## Review Notes
- The EXPLAIN type column listing (system, const, eq_ref, ref, range, index, ALL) is a simplified subset. MySQL also defines fulltext, ref_or_null, index_merge, unique_subquery, and index_subquery access types. The simplification is appropriate for a tutorial but readers should know the full list exists in the MySQL documentation.
- The keyset pagination comparison is valid for sequential page traversal. Readers should note that keyset pagination does not support random page access (jumping to page N) like OFFSET does, so the two approaches serve slightly different use cases.
- MySQL 8.0.13+ supports functional indexes (e.g., `ALTER TABLE orders ADD INDEX ((YEAR(created_at)))`) which could index expressions like `YEAR(created_at)`. The advice to rewrite as range conditions is still the best general approach, but functional indexes are worth mentioning for readers on MySQL 8.0.13+.
