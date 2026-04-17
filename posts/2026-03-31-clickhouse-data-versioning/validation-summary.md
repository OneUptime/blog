# Validation Summary: How to Implement Data Versioning in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ReplacingMergeTree engine
- CollapsingMergeTree engine
- SQL (ClickHouse dialect)
- Window functions (`row_number() OVER`)

## Sources Consulted
- ClickHouse official docs — ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse official docs — CollapsingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse official docs — SELECT FINAL modifier: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier
- ClickHouse official docs — ALTER TABLE ... UPDATE (mutations): https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse official docs — Window functions: https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found
1. **"ClickHouse is an append-only database"** — Incorrect. ClickHouse supports `ALTER TABLE ... UPDATE` via mutations. Rewrote the opening to clarify that ClickHouse is optimized for append-heavy workloads and that mutations exist but are heavyweight async operations, not suited for frequent row updates like PostgreSQL UPDATE.
2. **"deduplicates rows with the same primary key"** — Slightly inaccurate. ReplacingMergeTree deduplicates by the sorting key (ORDER BY), not the primary key. While they are often identical in simple cases, ClickHouse treats them as distinct concepts. Changed to "sorting key (ORDER BY)" here and in the Summary.
3. **"After a FINAL merge, only the latest version survives"** — Misleading. FINAL is a query-time virtual merge; it does not modify on-disk data. Background merges (or `OPTIMIZE TABLE`) perform the physical consolidation. Replaced with a clearer explanation distinguishing background merges from FINAL's query-time behavior.

## Review Notes
- The CollapsingMergeTree example is correct: the cancel row (sign=-1) matches the original row (sign=+1) on the ORDER BY column (order_id), and the subsequent insert with a new amount and sign=+1 represents the updated state.
- Version column types used (`UInt64`, `DateTime`) are valid for ReplacingMergeTree, which accepts UInt*, Date, DateTime, or DateTime64.
- The `sign Int8` column type for CollapsingMergeTree is correct and required.
- The window-function-based deduplication query is correct and is a common alternative to FINAL on large tables.
- The post could optionally mention `ReplacingMergeTree(version, is_deleted)` (the two-argument form for soft deletes) and `OPTIMIZE TABLE ... FINAL` for forced consolidation, but these are enhancements, not corrections.
