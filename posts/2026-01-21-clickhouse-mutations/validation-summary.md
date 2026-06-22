# Validation Summary: How to Handle Large Mutations in ClickHouse

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse
- MergeTree mutations
- ALTER TABLE UPDATE and DELETE
- Lightweight DELETE
- TTL rules
- ReplacingMergeTree
- CollapsingMergeTree
- ClickHouse system tables
- ClickHouse server and MergeTree settings

## Sources Consulted
- ClickHouse docs: Updating and deleting ClickHouse data - https://clickhouse.com/docs/guides/developer/mutations
- ClickHouse docs: Lightweight DELETE - https://clickhouse.com/docs/guides/developer/lightweight-delete
- ClickHouse docs: DELETE overview - https://clickhouse.com/docs/deletes/overview
- ClickHouse docs: ALTER TABLE UPDATE - https://clickhouse.com/docs/sql-reference/statements/alter/update
- ClickHouse docs: KILL statements - https://clickhouse.com/docs/sql-reference/statements/kill
- ClickHouse docs: system.mutations - https://clickhouse.com/docs/operations/system-tables/mutations
- ClickHouse docs: system.merges - https://clickhouse.com/docs/operations/system-tables/merges
- ClickHouse docs: system.parts - https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse docs: Manage data with TTL - https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse docs: Manipulations with Table TTL - https://clickhouse.com/docs/sql-reference/statements/alter/ttl
- ClickHouse docs: Server settings - https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse docs: Session settings - https://clickhouse.com/docs/operations/settings/settings
- ClickHouse docs: MergeTree table settings - https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse docs: ReplacingMergeTree - https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse docs: CollapsingMergeTree - https://clickhouse.com/docs/engines/table-engines/mergetree-family/collapsingmergetree

## Issues Found
- The `system.mutations` monitoring examples selected `parts_done`, but current ClickHouse `system.mutations` documents `parts_to_do`, `parts_to_do_names`, and `parts_in_progress_names`, not `parts_done`. Updated the status and queue examples to use documented columns.
- The mutation progress percentage example calculated progress from `parts_done`, which is not a documented `system.mutations` column. Replaced it with a queue-size query using `parts_to_do_names` and `parts_in_progress_names`.
- The mutation processing-rate query used `parts_done` for completed mutations. Replaced it with a `system.merges` query filtered by `is_mutation = 1`, using documented fields such as `elapsed`, `progress`, `rows_read`, and `rows_written`.
- The multiple-column `UPDATE` example assigned to `properties['migrated']`, which is an expression-style map element target rather than the documented `UPDATE column = expr` form. Changed it to update `migration_status`.
- The mutation settings section described `mutations_execute_subqueries_on_initiator` and `mutations_execute_nondeterministic_on_initiator` as limiting parts processed per mutation. Updated the comment to match their documented purpose.
- The TTL aggregation comment said "daily averages" while the query groups only by `metric_name`. Changed the comment to "per-metric averages".
- The killed mutation example implied `is_killed` is universally available. Added a note in the example that `is_killed` is available in ClickHouse Cloud.
- The checklist said mutations temporarily double disk space. Changed it to the narrower and more accurate statement that affected parts can temporarily require extra space.

## Review Notes
The guide is technically relevant and broadly consistent with ClickHouse's current mutation and TTL model. Several examples are illustrative and depend on table schema choices or storage policy setup, especially TTL movement to disks/volumes and replicated table macros. In future revisions, the post could mention that lightweight deletes do not immediately remove data from disk and are not compatible with tables using projections, but the existing lightweight-delete description is not incorrect.
