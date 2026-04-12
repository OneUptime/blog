# Validation Summary: How MySQL Sorts Data Internally (Filesort)

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- MySQL filesort algorithm (two-pass and single-pass)
- MySQL EXPLAIN for query analysis
- MySQL indexing (B-tree, composite, descending, covering indexes)
- MySQL sort buffer and related system variables

## Sources Consulted
- MySQL 8.0 Reference Manual — ORDER BY Optimization: https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html
- MySQL 8.0 Reference Manual — Server System Variables (`sort_buffer_size`, `max_length_for_sort_data`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format (Extra column): https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — Descending Indexes: https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- MySQL 8.0 Reference Manual — Server Status Variables (Sort_merge_passes, Sort_rows, etc.): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html

## Issues Found

1. **Incorrect EXPLAIN Extra column comment for simple ORDER BY index** (line 98): The comment stated `Extra: Using index (or Using index condition)` after adding an index on `created_at` for a query selecting `id, name`. "Using index" means a covering index scan, but `name` is not in the index so a table lookup is still required. "Using index condition" refers to Index Condition Pushdown (ICP) for WHERE predicates, which is unrelated to ORDER BY optimization. Fixed to `Extra: Backward index scan (Using filesort is eliminated)`, which accurately reflects MySQL 8.0 behavior for DESC ordering with an index.

2. **Missing deprecation note for `max_length_for_sort_data`** (line 57): The variable `max_length_for_sort_data` was deprecated in MySQL 8.0.20. Since the post references MySQL 8 features (descending indexes), this omission could mislead readers using current MySQL versions. Added a deprecation note and explanation that the optimizer now makes the algorithm choice automatically.

## Review Notes
- The descriptions of the two-pass and single-pass sort algorithms are accurate and well-explained.
- The `sort_buffer_size` default of 256KB and the explanation of merge sort fallback are correct.
- The composite index example `(status, created_at)` for WHERE + ORDER BY is correct — equality column first, then sort column.
- The covering index example correctly includes all selected columns.
- The monitoring section accurately lists all relevant Sort_* status variables.
- The descending index syntax for MySQL 8.0 is correct.
- In MySQL 8.0.20+, the internal sort algorithm also evolved to use a "packed addons" approach for variable-length fields, which further optimizes the single-pass sort. This is not mentioned but is an advanced detail that doesn't affect the post's accuracy.
