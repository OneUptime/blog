# Validation Summary: How to Use OPTIMIZE TABLE in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- MergeTree family engines (MergeTree, ReplacingMergeTree, AggregatingMergeTree, SummingMergeTree)
- SQL DDL (OPTIMIZE TABLE statement)

## Sources Consulted
- ClickHouse OPTIMIZE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/optimize
- ClickHouse `alter_sync` setting documentation: https://clickhouse.com/docs/en/operations/settings/settings#alter_sync
- ClickHouse `mutations_sync` setting documentation: https://clickhouse.com/docs/en/operations/settings/settings#mutations_sync
- ClickHouse `replication_alter_partitions_sync` setting documentation: https://clickhouse.com/docs/en/operations/settings/settings#replication_alter_partitions_sync
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree

## Issues Found

### 1. Incorrect claim about default blocking behavior and wrong setting name
**What was wrong:** The post stated "The statement returns after scheduling the merge, not after it completes" (line 19), which contradicted a later statement that "By default, OPTIMIZE TABLE blocks until the merge is complete." The post also used `mutations_sync = 0` to control blocking behavior, but `mutations_sync` applies to ALTER TABLE mutations (UPDATE/DELETE), not OPTIMIZE TABLE.

**What was changed:** Replaced the incorrect description with an accurate explanation: for non-replicated MergeTree tables, OPTIMIZE is synchronous; for ReplicatedMergeTree, the `alter_sync` setting controls wait behavior. Changed the code example from `SETTINGS mutations_sync = 0` to `SETTINGS alter_sync = 0`. Updated the section heading from "NOWAIT vs Default Behavior" to "Non-Blocking Mode for Replicated Tables" since there is no NOWAIT keyword for OPTIMIZE TABLE.

**Why:** The `alter_sync` setting (alias `replication_alter_partitions_sync`) is documented as controlling wait behavior for ALTER, OPTIMIZE, and TRUNCATE on replicated tables. Using `mutations_sync` would have no effect on OPTIMIZE TABLE.

### 2. Incorrect terminology for SummingMergeTree
**What was wrong:** The post described SummingMergeTree as performing "row collapsing," but SummingMergeTree performs row summation (replacing rows with the same primary key with a single row containing summed numeric values). "Row collapsing" is the term for CollapsingMergeTree.

**What was changed:** Changed "SummingMergeTree row collapsing is done" to "SummingMergeTree row summation is complete."

**Why:** Conflating summation and collapsing could mislead readers about which engine to use for their use case.

## Review Notes
- The post does not mention the `DEDUPLICATE [BY expression]` clause, which is a useful feature of OPTIMIZE TABLE for explicit deduplication control. This is not an error but could be a valuable addition in a future update.
- The post does not mention the `FORCE` modifier (alternative to `FINAL` introduced in newer versions). Not an error since `FINAL` is the standard approach.
- All SQL query examples are syntactically correct and use valid system table columns (`system.merges` and `system.parts`).
- The practical example and monitoring queries are well-structured and accurate.
