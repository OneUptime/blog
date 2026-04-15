# Validation Summary: How Projections Interact with Mutations in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse projections
- ClickHouse mutations (ALTER TABLE UPDATE/DELETE)
- ClickHouse lightweight deletes (DELETE FROM)
- ClickHouse TTL-based data expiry
- system.mutations monitoring table

## Sources Consulted
- ClickHouse system.mutations documentation — https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse lightweight delete documentation — https://clickhouse.com/docs/guides/developer/lightweight-delete
- ClickHouse DELETE statement reference — https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse MergeTree settings (lightweight_mutation_projection_mode) — https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse projections documentation — https://clickhouse.com/docs/sql-reference/statements/alter/projection
- GitHub Issue #50613: Projections ignore lightweight deletes — https://github.com/ClickHouse/ClickHouse/issues/50613

## Issues Found

### Issue 1: Non-existent `parts_done` column in monitoring query
- **What was wrong:** The `system.mutations` monitoring query referenced a `parts_done` column that does not exist in ClickHouse's `system.mutations` table.
- **What was changed:** Removed `parts_done` from the SELECT list. The available progress-tracking columns are `parts_to_do` (decreases as parts are processed) and `is_done` (flag indicating completion).
- **Why:** Running this query as-is would produce an error. The `system.mutations` table provides `parts_to_do` for progress tracking but has no `parts_done` counterpart.

### Issue 2: Incorrect description of lightweight DELETE behavior with projections
- **What was wrong:** The post stated that lightweight deletes work on tables with projections but projections "may still reflect deleted rows until the next merge." In reality, lightweight deletes **throw an error by default** on tables with projections because materialized projection parts do not consult the `_row_exists` deletion mask, leading to incorrect query results (not just stale data).
- **What was changed:** Rewrote the "Lightweight DELETE and Projections" section to accurately describe the default `throw` behavior, explain the `lightweight_mutation_projection_mode` setting (available since v24.7) with its three modes (`throw`, `drop`, `rebuild`), and updated the code example to include the required `SET` statement.
- **Why:** The original text would mislead readers into thinking lightweight deletes transparently work with projections, when they would actually encounter an error. The corrected section gives readers the configuration needed to make it work and explains the trade-offs of each mode.

## Review Notes
- The drop/add/materialize projection workflow in the "Dropping a Projection Before a Large Mutation" section uses `(...)` as a placeholder for the projection definition. This is fine for illustration but readers will need to substitute their actual projection definition.
- The post does not specify minimum ClickHouse version requirements. The lightweight delete projection mode setting requires v24.7+. Readers on older versions will only have the `throw` default behavior.
- The `OPTIMIZE TABLE ... FINAL` command can be very expensive on large tables and should be used with caution in production. The post could benefit from a note about this, though it is not technically incorrect as written.
