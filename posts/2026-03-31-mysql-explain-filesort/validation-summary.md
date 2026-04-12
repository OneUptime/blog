# Validation Summary: How to Identify Filesort Using EXPLAIN in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0+)
- MySQL EXPLAIN statement
- MySQL filesort optimization
- MySQL descending indexes (8.0+)
- MySQL stored generated columns
- sort_buffer_size system variable

## Sources Consulted
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — ORDER BY Optimization: https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html
- MySQL 8.0 Reference Manual — Index Condition Pushdown Optimization: https://dev.mysql.com/doc/refman/8.0/en/index-condition-pushdown-optimization.html
- MySQL 8.0 Reference Manual — Descending Indexes: https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- MySQL 8.0 Reference Manual — CREATE INDEX Statement: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — Server System Variables (sort_buffer_size): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_sort_buffer_size

## Issues Found
1. **Misleading EXPLAIN Extra value "Using index condition"**: Two comments in code examples showed `Extra: Using index condition` as the result after eliminating filesort. "Using index condition" specifically refers to MySQL's Index Condition Pushdown (ICP) optimization, which is a separate feature from index-based sort elimination. For the queries shown (simple equality on leading index column with ORDER BY on second column), ICP would not typically apply since the equality condition is already used as the index lookup key. Changed both occurrences to `Extra: Using where (no Using filesort)` and `Extra: Using where (filesort eliminated)` respectively, to accurately reflect that the key indicator is the absence of "Using filesort" in the Extra column.

## Review Notes
- The sort_buffer_size example uses 8MB. While technically valid, the MySQL documentation notes that excessively large sort_buffer_size values can degrade performance on some Linux systems due to memory allocation behavior (glibc mmap threshold). Optimal values are typically in the 256KB-2MB range. The post does not make incorrect claims, but readers should test their specific workload rather than blindly increasing this value.
- The EXPLAIN output examples are intentionally simplified (showing only id, type, key, rows, Extra columns instead of the full set). This is acceptable for readability but readers should be aware that actual EXPLAIN output includes additional columns (select_type, table, partitions, possible_keys, key_len, ref, filtered).
- All SQL syntax is correct for MySQL 8.0. The stored generated column and descending index examples are valid.
