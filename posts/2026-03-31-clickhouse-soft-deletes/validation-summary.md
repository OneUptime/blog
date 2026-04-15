# Validation Summary: How to Implement Soft Deletes in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ReplacingMergeTree engine
- ClickHouse TTL (Time-To-Live)
- ClickHouse Materialized Views
- SQL

## Sources Consulted
- ClickHouse TTL documentation: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse ALTER TABLE TTL reference: https://clickhouse.com/docs/sql-reference/statements/alter/ttl
- ClickHouse MergeTree TTL syntax: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse Materialized Views documentation: https://clickhouse.com/docs/en/guides/developer/cascading-materialized-views

## Issues Found

### Issue 1: Missing DELETE keyword in TTL syntax
- **What was wrong:** The `ALTER TABLE ... MODIFY TTL` statement used `TTL updated_at + INTERVAL 1 YEAR WHERE is_deleted = 1`, which is missing the required `DELETE` action keyword. ClickHouse TTL grammar requires an explicit action (`DELETE`, `RECOMPRESS`, `TO DISK`, `TO VOLUME`) before the `WHERE` clause.
- **What was changed:** Added the `DELETE` keyword: `MODIFY TTL updated_at + INTERVAL 1 YEAR DELETE WHERE is_deleted = 1`.
- **Why:** Without the `DELETE` keyword, the SQL statement is syntactically invalid and would fail to execute.

### Issue 2: Materialized view with WHERE filter breaks soft-delete semantics
- **What was wrong:** The materialized view `active_users_mv` included `WHERE is_deleted = 0` in its SELECT. ClickHouse materialized views are insert triggers that run the SELECT against each newly inserted block. When a soft-delete row (is_deleted=1) is inserted, the WHERE clause filters it out, so the MV never receives it. This means ReplacingMergeTree on the MV never gets the newer "deleted" version and the old "active" row persists in the MV indefinitely — silently breaking the soft-delete pattern.
- **What was changed:** Removed the `WHERE is_deleted = 0` filter from the MV definition so all row versions flow through to the MV's ReplacingMergeTree, which can then properly deduplicate by version. Added a follow-up query example showing that reads against the MV still filter on `is_deleted = 0`.
- **Why:** The MV must receive all versions (both active and deleted) for ReplacingMergeTree to correctly keep only the latest version per user_id. The filtering should happen at query time, not at materialization time.

## Review Notes
- The overall approach (ReplacingMergeTree + is_deleted flag + version column) is a well-established pattern for soft deletes in ClickHouse.
- The `FINAL` keyword caveat is correctly noted — it does force synchronous deduplication and can impact read performance on large tables.
- The deletion history query (without FINAL) correctly notes that all versions are visible until background merges occur. This is accurate but readers should be aware that after merges, only the latest version per ORDER BY key is retained.
- The `ReplacingMergeTree(version)` built-in `is_deleted` parameter (available in newer ClickHouse versions 23.2+) is an alternative approach not covered here. In newer versions, `ReplacingMergeTree(version, is_deleted)` natively supports a deletion flag that causes rows to be physically removed during merges when the flag is set, without needing `WHERE is_deleted = 0` in queries with `FINAL`.
