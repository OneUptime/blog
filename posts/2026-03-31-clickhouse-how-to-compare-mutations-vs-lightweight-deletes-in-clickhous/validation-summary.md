# Validation Summary: How to Compare Mutations vs Lightweight Deletes in ClickHouse

## Status
validated

## Post Type
Guide / Comparison reference

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse mutations (`ALTER TABLE ... DELETE`, `ALTER TABLE ... UPDATE`)
- ClickHouse lightweight deletes (`DELETE FROM`)
- `system.mutations` system table
- `_row_exists` hidden column
- `KILL MUTATION` statement

## Sources Consulted
- [Lightweight Delete | ClickHouse Docs](https://clickhouse.com/docs/guides/developer/lightweight-delete)
- [The Lightweight DELETE Statement | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/delete)
- [ALTER TABLE DELETE | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/alter/delete)
- [Handling Updates and Deletes in ClickHouse (official blog)](https://clickhouse.com/blog/handling-updates-and-deletes-in-clickhouse)
- [ClickHouse Release 23.3 notes](https://clickhouse.com/blog/clickhouse-release-23-03)
- [PR #62195: Add setting lightweight_deletes_sync](https://github.com/ClickHouse/ClickHouse/pull/62195)

## Issues Found

1. **Incorrect table-level `MODIFY SETTING` for an experimental session setting.** The post showed `ALTER TABLE events MODIFY SETTING allow_experimental_lightweight_delete = 1;`. `allow_experimental_lightweight_delete` is a user/session-level setting, not a MergeTree table setting, so this `ALTER` would fail. Removed the line.
2. **Incorrect `SHOW CREATE TABLE` guidance.** The post suggested running `SHOW CREATE TABLE events` and "looking for `allow_experimental_lightweight_delete`." Because the setting is not a table-level setting, it would never appear in `SHOW CREATE TABLE`. Replaced with a valid example (`DELETE FROM ... IN PARTITION ...`).
3. **Outdated enablement instructions.** Lightweight deletes have been GA since ClickHouse 23.3 and are enabled by default; `allow_experimental_lightweight_delete = 1` is only required on versions 22.8–23.2. Clarified this and also removed the `SET allow_experimental_lightweight_delete = 1;` from the GDPR example so it matches current ClickHouse behaviour.
4. **Minor enhancement for correctness.** Added a reference to `lightweight_deletes_sync` (default `2`), which is the correct, documented way to control sync/async behaviour of lightweight deletes.

Also updated the "What Are Lightweight Deletes" paragraph to note the GA in 23.3 so the 22.8 reference is not misleading in 2026.

## Review Notes
- `system.mutations` column references (`command`, `create_time`, `is_done`, `parts_to_do`, `parts_to_do_names`, `latest_failed_part`) all match current documentation.
- `KILL MUTATION WHERE table = '...' AND mutation_id = '...'` syntax is valid.
- The `_row_exists` hidden column is accurately described; it only materializes in parts where rows have been lightweight-deleted.
- The table's "Concurrent operations – Serialized (one mutation at a time)" is a simplification. In practice, multiple mutations can be queued, and different parts may be mutated in parallel; within a given part mutations are applied in order. This is acceptable as a high-level comparison and has not been changed.
- The claim that mutations are "the only way to update non-primary-key columns" is still broadly true in production ClickHouse; on-the-fly / lightweight updates are available in newer versions but remain experimental and narrowly scoped, so the guidance still holds.
- For physical erasure (e.g. GDPR), the post correctly prefers mutations; note that users should also consider `OPTIMIZE TABLE ... FINAL` or waiting for a merge after lightweight deletes if they ultimately choose that path. Not added since it was outside the scope of the fix.
