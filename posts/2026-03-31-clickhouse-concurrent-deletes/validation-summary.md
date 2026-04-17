# Validation Summary: How to Handle Concurrent Deletes in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse mutations (`ALTER TABLE ... DELETE`)
- Lightweight DELETE (`DELETE FROM`)
- `system.mutations` system table
- ReplacingMergeTree engine

## Sources Consulted
- ClickHouse docs: Lightweight DELETE — https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse docs: ALTER mutations — https://clickhouse.com/docs/en/sql-reference/statements/alter#mutations
- ClickHouse docs: system.mutations — https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse docs: Lightweight DELETE guide — https://clickhouse.com/docs/en/guides/developer/lightweight-delete

## Issues Found

1. **Incorrect claim about lightweight DELETE concurrency.** The original "Lightweight DELETEs and Concurrency" section claimed lightweight DELETEs are "more concurrent-friendly" and that "Multiple lightweight deletes can be applied concurrently to different parts without blocking each other." Per ClickHouse documentation, lightweight DELETEs are themselves mutations and "all mutations on a table are executed sequentially." They are faster than rewrite-based mutations because they only update the hidden `_row_exists` mask column, but they do not bypass the per-table mutation queue. Reworded the section to accurately describe lightweight DELETEs as still-queued mutations that drain quickly because they avoid full part rewrites and do not block concurrent inserts.

2. **Misleading summary line.** The summary stated "ClickHouse serializes traditional mutations per table but handles lightweight DELETEs more concurrently." This implied lightweight DELETEs are not serialized, which contradicts the docs. Updated the summary to clarify that all mutations (including lightweight DELETEs) are serialized per table, and that lightweight DELETEs drain faster because they only update a mask column.

## Review Notes
- The `system.mutations` columns referenced (`mutation_id`, `command`, `create_time`, `is_done`, `table`) are all valid and current.
- The `ReplacingMergeTree(version)` example with the `deleted UInt8` flag column is a valid soft-delete pattern; queries should also typically use `FINAL` or aggregate by max version to deduplicate, though that's beyond the scope of the post and acceptable as a high-level recommendation.
- Lightweight DELETE was made GA in ClickHouse 23.3 — readers on older versions (pre-22.8) won't have access. Not flagged in the post but worth noting for future updates.
- The claim that traditional mutations "run one after another on each data part" is accurate: mutations are totally ordered per part.
