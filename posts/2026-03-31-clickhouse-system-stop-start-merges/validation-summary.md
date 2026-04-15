# Validation Summary: How to Use SYSTEM STOP/START MERGES in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- SQL (ClickHouse dialect)
- SYSTEM STOP MERGES / SYSTEM START MERGES commands
- ClickHouse system tables (system.merges, system.parts, system.replicas)

## Sources Consulted
- ClickHouse official documentation: SYSTEM statements — https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse official documentation: system.merges table — https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse official documentation: system.parts table — https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official documentation: system.replicas table — https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse official documentation: MergeTree settings — https://clickhouse.com/docs/en/operations/settings/merge-tree-settings

## Issues Found
1. **Incorrect method for checking global merge status.** The post suggested querying `system.merge_tree_settings WHERE name = 'merge_max_block_size'` to check whether merges are globally stopped. This is wrong — `merge_max_block_size` is a MergeTree engine setting controlling block size during merge operations; it has no relation to the SYSTEM STOP/START MERGES state. Replaced with a query on `system.replicas` using the `can_perform_merges` column (for replicated tables), and guidance that for non-replicated tables one should check server logs or verify `system.merges` remains empty.

## Review Notes
- All SQL syntax for SYSTEM STOP/START MERGES (server-wide and per-table variants) is correct.
- The system.merges and system.parts queries use valid column names.
- The "too many parts" threshold of 300 per partition is correct (matches the `parts_to_throw_insert` default).
- The claim that in-progress merges complete after SYSTEM STOP MERGES is accurate — the command prevents new merges from being scheduled but does not abort running ones.
- The `max_insert_block_size` setting used in the bulk load example is a valid ClickHouse setting.
- The ALTER TABLE ADD COLUMN syntax is correct for ClickHouse.
