# Validation Summary: How to Choose the Right Column Order for Composite Indexes in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB composite indexes)
- MySQL EXPLAIN and EXPLAIN ANALYZE
- MySQL Performance Schema (`events_statements_summary_by_digest`)
- Percona Toolkit (`pt-query-digest`)

## Sources Consulted
- MySQL 8.0 Reference Manual — Multiple-Column Indexes: https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — Index Condition Pushdown Optimization: https://dev.mysql.com/doc/refman/8.0/en/index-condition-pushdown-optimization.html
- MySQL 8.0 Reference Manual — ORDER BY Optimization: https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html
- MySQL 8.0 Reference Manual — Performance Schema Statement Digest Summary Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual — Index Skip Scan: https://dev.mysql.com/doc/refman/8.0/en/range-optimization.html#range-access-skip-scan

## Issues Found

1. **Incorrect column name in index comment (line 40)**: The comment on the `idx_less_optimal` index said "range column in the middle stops index use for created_at". This was wrong — with the index `(status, created_at, customer_id)`, a range predicate on `created_at` stops the index from being used for `customer_id` (the subsequent column), not for `created_at` itself. Fixed to say "stops index use for customer_id".

2. **Misleading EXPLAIN Extra field comment (line 66)**: The comment said `Extra: Using index condition (no filesort)`. "Using index condition" specifically refers to Index Condition Pushdown (ICP), which is a distinct optimization unrelated to filesort avoidance. For the query `SELECT id FROM orders WHERE status = 'pending' ORDER BY created_at` with index `(status, created_at)`, since InnoDB secondary indexes include the primary key, this is a covering index. The Extra field would more accurately show "Using where; Using index" with no "Using filesort". Fixed the comment accordingly.

## Review Notes
- In MySQL 8.0.13+, the Index Skip Scan optimization can allow MySQL to use a composite index even when the leftmost column is not referenced in the WHERE clause. The post's statement that `WHERE customer_id = 42` "Does NOT use the index" `(status, customer_id, created_at)` is a valid simplification for teaching purposes, but readers should be aware that skip scan may apply in some cases.
- Rule 2 (highest selectivity first among equality columns) is a commonly taught heuristic. In practice, for queries that use equality on all indexed columns, the column order among equality columns has minimal impact on performance. The benefit primarily applies to queries that use only a prefix of the index, or in index compression scenarios.
- The `EXPLAIN ANALYZE` mention in the summary is valid for MySQL 8.0.18+. Earlier versions do not support this syntax.
