# Validation Summary: How to Configure join_buffer_size in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0+)
- MySQL join_buffer_size system variable
- MySQL EXPLAIN and optimizer hints
- MySQL Block Nested Loop (BNL) and hash join algorithms
- MySQL my.cnf configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: join_buffer_size system variable (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_join_buffer_size)
- MySQL 8.0 Reference Manual: Block Nested-Loop and Batched Key Access Joins (https://dev.mysql.com/doc/refman/8.0/en/bnl-bka-optimization.html)
- MySQL 8.0 Reference Manual: Hash Join Optimization (https://dev.mysql.com/doc/refman/8.0/en/hash-joins.html)
- MySQL 8.0 Reference Manual: Optimizer Hints (https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html)
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0.18 Release Notes (hash join introduction)
- MySQL 8.0.20 Release Notes (HASH_JOIN/NO_HASH_JOIN hint deprecation)

## Issues Found

1. **Deprecated `HASH_JOIN` optimizer hint removed**: The query `SELECT /*+ HASH_JOIN(o) */ ...` used the `HASH_JOIN()` optimizer hint, which was introduced in MySQL 8.0.18 but deprecated in MySQL 8.0.20. In current MySQL 8.0 versions, hash joins are used automatically for equi-joins without usable indexes, so no hint is needed. Removed the hint from the example query.

2. **Incorrect EXPLAIN FORMAT=JSON field name**: The post instructed readers to look for `"join_algorithm": "hash join"` in EXPLAIN FORMAT=JSON output. This field does not exist in MySQL's EXPLAIN JSON output. The correct field is `"using_join_buffer": "hash join"`. Fixed the field name.

3. **Incorrect claim about `Using index` in EXPLAIN Extra**: The post stated that after adding an index, `Extra` should show `Using index` instead of `Using join buffer`. `Using index` in MySQL EXPLAIN output specifically indicates a covering index (where all columns needed by the query are in the index). Since the example query selects `o.*`, the new index `idx_customer_id (customer_id)` does not cover all columns. The correct behavior is that the join type changes from `ALL` to `ref`/`eq_ref` and `Using join buffer` disappears from `Extra`. Fixed the description.

## Review Notes
- The `BNL(o, c)` optimizer hint used in the "Per-Session Override" section is deprecated in MySQL 8.0.20+. It still works in MySQL 5.7 and early 8.0 versions but readers targeting modern MySQL should be aware of the deprecation. This was not changed since the section doesn't specify a MySQL version and BNL hints remain functional (though deprecated) in current MySQL 8.0.
- The default value of 262144 (256 KB) is correct for both MySQL 5.7 and 8.0.
- The memory calculation in the "Memory Considerations" section is a simplification (assumes one join buffer per connection), but the surrounding text correctly notes that multiple joins in a single query can allocate the buffer multiple times, making the actual worst case higher.
