# Validation Summary: How to Use Multiple Ordering Keys in MergeTree Tables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree engine family (MergeTree, ReplacingMergeTree, SummingMergeTree)
- SQL (DDL, DML, EXPLAIN)
- LowCardinality data type

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse ALTER TABLE MODIFY ORDER BY documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/order-by
- ClickHouse primary indexes guide: https://clickhouse.com/docs/en/optimize/sparse-primary-indexes
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree

## Issues Found

1. **Incorrect claim that ORDER BY cannot be changed on existing tables (line 109)**
   - **What was wrong:** The post stated "You cannot change ORDER BY on an existing table directly. You must recreate." The accompanying code example used `CREATE TABLE ... AS` followed by `ALTER TABLE ... MODIFY ORDER BY` with the comment "only allowed for new tables."
   - **What was changed:** Corrected to explain that `ALTER TABLE ... MODIFY ORDER BY` is supported for adding new columns to the end of an existing sorting key. The new key must be a superset of the old key with original columns in the same order. Clarified that recreating the table is only needed when you need a completely different key order (e.g., reordering or removing columns).
   - **Why:** ClickHouse has supported `ALTER TABLE ... MODIFY ORDER BY` for MergeTree tables since at least version 20.x. The previous text would mislead readers into unnecessary table recreation workflows.

2. **Misleading "High Cardinality First" ordering advice (line 28)**
   - **What was wrong:** The section title was "Column Order Matters: High Cardinality First" and the text advised putting the "highest-cardinality column first." This contradicts ClickHouse's official guidance, which recommends ascending cardinality (low cardinality first) among equally queried columns for better compression and sparse index efficiency.
   - **What was changed:** Changed the section title to "Column Order Matters: Most-Queried First" and revised the text to recommend putting the most-queried column first, with lower cardinality preferred among equally queried columns.
   - **Why:** The ClickHouse primary indexes guide demonstrates that ordering by ascending cardinality produces fewer index entries and better data clustering, enabling more effective granule skipping. The primary factor should be query patterns, not raw cardinality.

## Review Notes
- The post correctly explains the index prefix rule, which is one of the most important concepts for ClickHouse schema design.
- The distinction between ORDER BY (sorting key) and PRIMARY KEY is not mentioned. In ClickHouse, PRIMARY KEY defaults to ORDER BY but can be set independently as a prefix of ORDER BY. This is an advanced topic that could be a useful follow-up post.
- The `WHERE user_id = 12345 -- full scan required` comment is slightly simplified; ClickHouse may still benefit from partition pruning or secondary data skipping indexes even when the primary index prefix is not matched. However, the statement is correct in the context of primary index usage alone.
- The EXPLAIN syntax and ReplacingMergeTree examples are accurate and well-constructed.
