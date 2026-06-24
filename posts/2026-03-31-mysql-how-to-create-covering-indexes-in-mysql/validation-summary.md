# Validation Summary: How to Create Covering Indexes in MySQL

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- MySQL 8.0 InnoDB secondary indexes / covering indexes
- `EXPLAIN` output (`Using index` in the `Extra` column = index-only scan)
- `mysql.innodb_index_stats` (`stat_name = 'size'`)

## Sources Consulted
- MySQL 8.0 Reference Manual — EXPLAIN Output Format / Extra information — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html (verified that `Using index` in the `Extra` column means the column information is retrieved from the index without reading the actual row — i.e., a covering index)
- MySQL 8.0 Reference Manual — How MySQL Uses Indexes / multiple-column indexes (column-order/leftmost-prefix rules for index design)

## Issues Found
- None — the covering-index definition, the `Using index` EXPLAIN marker, the index-design column-ordering rules (WHERE columns first, then ORDER BY, then SELECT-only columns), and the `mysql.innodb_index_stats` size query were verified against the sources above and are accurate.

## Review Notes
- "Using index" (not "Using index condition") is correctly used to denote a covering/index-only scan; the post does not confuse the two.
- The `idx_covering_orders (user_id, status, created_at)` example with `key_len: 4` for an INT `user_id = 42` lookup is consistent (4 bytes for a non-null INT).
- The COUNT example: `CREATE INDEX idx_user_id ON orders (user_id)` lets `SELECT COUNT(*) ... WHERE user_id = 42` be satisfied as an index-only scan (`Using index`); correct. (Note the post's "Without covering index: full table scan" comment refers to the no-index case, which is accurate.)
- The `mysql.innodb_index_stats` query filtering `stat_name = 'size'` returns index size in pages (`stat_value`), which matches the documented persistent-stats table; left as-is.
- The leftmost-prefix guidance (only the query's referenced columns, filter columns first) is consistent with the manual's multiple-column index behavior.
