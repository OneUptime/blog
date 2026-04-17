# Validation Summary: How to Add and Remove Projections in ClickHouse

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- ClickHouse
- SQL DDL (ALTER TABLE)
- ClickHouse projections (normal and aggregate)
- MergeTree table engine
- ClickHouse system tables (`system.mutations`, `system.projection_parts`)
- EXPLAIN query plans

## Sources Consulted
- [ClickHouse ALTER PROJECTION docs](https://clickhouse.com/docs/en/sql-reference/statements/alter/projection)
- [ClickHouse system.projection_parts docs](https://clickhouse.com/docs/en/operations/system-tables/projection_parts)
- [ClickHouse projections data-modeling guide](https://github.com/ClickHouse/clickhouse-docs/blob/main/docs/data-modeling/projections/1_projections.md)
- [Altinity KB: Projections examples](https://kb.altinity.com/altinity-kb-queries-and-syntax/projections-examples/)

## Issues Found
1. **Incorrect column name in `system.projection_parts` query.** The post selected a `projection_name` column, which does not exist in `system.projection_parts`. The projection name is stored in the `name` column, while `parent_name` references the parent part in the base table. Updated the query to select `parent_name` and `name AS projection_name`.
2. **Misleading explanation of aggregate combinators.** The post used `uniqState(user_id)` and stated that aggregate projections require `-State` combinators. ClickHouse projections accept regular aggregate functions (e.g. `count()`, `uniq()`, `sum()`); states and merges are handled internally by the engine. Replaced `uniqState(user_id)` with `uniq(user_id)` and rewrote the explanatory paragraph to reflect that the combinators are managed automatically.

## Review Notes
- The `IN PARTITION '2024-01'` example uses a string partition ID. The practical example at the end uses `PARTITION BY toYYYYMM(event_date)`, which would yield numeric IDs like `202401`. The two examples are presented as independent snippets, so this is not technically wrong, but a reader copying both verbatim against the same table would need to adjust the partition ID format.
- All ALTER TABLE syntax (`ADD PROJECTION`, `MATERIALIZE PROJECTION`, `DROP PROJECTION`, `IN PARTITION`) matches the current ClickHouse SQL reference.
- `EXPLAIN indexes = 1` and the `ReadFromMergeTree` step name are correct for inspecting projection selection.
- The columns referenced from `system.mutations` (`mutation_id`, `command`, `is_done`, `parts_to_do`, `create_time`) all exist in current ClickHouse versions.
