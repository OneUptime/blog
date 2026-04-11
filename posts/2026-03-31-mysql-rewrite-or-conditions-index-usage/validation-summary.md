# Validation Summary: How to Rewrite OR Conditions for Better Index Usage in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (query optimizer, indexing, EXPLAIN, EXPLAIN ANALYZE)
- SQL (UNION, UNION ALL, OR conditions, JOIN conditions)
- MySQL Optimizer Hints (INDEX_MERGE)

## Sources Consulted
- MySQL 8.0 Reference Manual: Optimization and Indexes — https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html
- MySQL 8.0 Reference Manual: Index Merge Optimization — https://dev.mysql.com/doc/refman/8.0/en/index-merge-optimization.html
- MySQL 8.0 Reference Manual: Optimizer Hints — https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html
- MySQL 8.0 Reference Manual: UNION Clause — https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual: EXPLAIN ANALYZE — https://dev.mysql.com/doc/refman/8.0/en/explain.html

## Issues Found

1. **NULL-safety bug in UNION ALL deduplication example.** The condition `AND email != 'alice@example.com'` in the second branch of the UNION ALL rewrite would incorrectly exclude rows where `email IS NULL` and `phone = '555-1234'`. In SQL, `NULL != 'alice@example.com'` evaluates to NULL (not TRUE), so such rows would be silently dropped — but the original OR query would return them. Fixed to `AND (email != 'alice@example.com' OR email IS NULL)`.

2. **Invalid table alias in OR JOIN example.** The "VERY SLOW" query in the "OR in JOIN Conditions" section referenced `o.id AS order_id`, but the table alias is `oi` (not `o`). This would cause a SQL error. Changed to `oi.order_id` to match the column used in the corresponding FAST UNION rewrite.

3. **Missing version note for INDEX_MERGE hint.** The `INDEX_MERGE` index-level optimizer hint with specific index names was introduced in MySQL 8.0.20. The post mentioned the version requirement for `EXPLAIN ANALYZE` (8.0.18+) but not for this hint. Added "(MySQL 8.0.20+)" to the section heading.

## Review Notes
- The overall approach and advice in the post is sound and well-structured. The UNION rewrite pattern for OR conditions on different indexed columns is a well-known and effective optimization technique.
- The post correctly notes that OR on the same column is typically handled well by the optimizer and recommends IN as a cleaner alternative.
- The UNION (DISTINCT) version of the rewrite is simpler but has the overhead of deduplication; the post correctly presents both UNION ALL (with manual dedup) and UNION as alternatives.
- The deduplication condition in the "OR in JOIN Conditions" UNION rewrite (`AND (p.id != oi.product_id OR oi.product_id IS NULL)`) is logically correct for excluding rows already matched by the first branch, though in practice the semantics of JOIN with OR can be subtle and results may differ for edge cases involving NULLs in join columns.
