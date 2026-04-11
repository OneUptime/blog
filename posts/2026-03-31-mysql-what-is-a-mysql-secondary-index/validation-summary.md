# Validation Summary: What Is a MySQL Secondary Index

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- MySQL (InnoDB storage engine)
- Secondary (non-clustered) indexes
- B-tree index structures
- `EXPLAIN` query analysis
- `performance_schema` for index usage monitoring
- `mysql.innodb_index_stats` for index size reporting

## Sources Consulted
- MySQL 8.0 Reference Manual — Clustered and Secondary Indexes: https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html
- MySQL 8.0 Reference Manual — CREATE INDEX Statement: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — The table_io_waits_summary_by_index_usage Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html
- MySQL 8.0 Reference Manual — innodb_index_stats Table: https://dev.mysql.com/doc/refman/8.0/en/innodb-persistent-stats.html

## Issues Found
No technical issues found.

## Review Notes
- The EXPLAIN output comment mentions "Using index condition" which specifically refers to Index Condition Pushdown (ICP). For the simple query `WHERE customer_id = 42` on a single-column index, the Extra field would typically be NULL rather than "Using index condition." The parenthetical "(or none for full row fetch)" covers the common case, so this is not incorrect but could be clearer in a future revision.
- The write overhead section correctly notes that all secondary indexes must be updated on DML, though it omits InnoDB's change buffer optimization that defers physical writes for non-unique secondary indexes. This simplification is appropriate for the article's scope.
- The `mysql.innodb_index_stats` size query is a useful pattern but readers should be aware that `innodb_stats_persistent` must be enabled (it is by default in MySQL 8.0+) for this table to contain data.
