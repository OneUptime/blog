# Validation Summary: How to Use ClickHouse Projections for Query Acceleration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree tables
- ClickHouse projections
- ClickHouse aggregate functions
- ClickHouse system tables
- ClickHouse EXPLAIN

## Sources Consulted
- ClickHouse Projections guide: https://clickhouse.com/docs/data-modeling/projections
- ClickHouse ALTER TABLE PROJECTION reference: https://clickhouse.com/docs/sql-reference/statements/alter/projection
- ClickHouse EXPLAIN reference: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse system.projections reference: https://clickhouse.com/docs/operations/system-tables/projections
- ClickHouse system.projection_parts reference: https://clickhouse.com/docs/operations/system-tables/projection_parts
- ClickHouse system.query_log reference: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse settings reference: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse materialized views versus projections guide: https://clickhouse.com/docs/managing-data/materialized-views-versus-projections
- ClickHouse projection usage knowledge base article: https://clickhouse.com/docs/knowledgebase/projection_example

## Issues Found
- The post described projections as automatically selected by the optimizer in all cases. Changed this to say projections are automatically considered, and that eligible queries can use them, because ClickHouse chooses projections only when the optimizer determines they are applicable.
- The EXPLAIN example used only `indexes = 1` and told readers to look for a non-current `"Projection: by_type"` string. Updated it to use `EXPLAIN indexes = 1, projections = 1` and to look for `ReadFromMergeTree (by_type)` or a `Projections` entry.
- The projection testing example used the old experimental setting name `allow_experimental_projection_optimization`. Updated examples to use `optimize_use_projections` and `force_optimize_projection_name`.
- The query log monitoring example read projection state from `Settings`. Updated it to use the `projections` column from `system.query_log`.
- The aggregate-state example queried projection-only aliases such as `day`, `users_state`, and `p95_state` directly from the base table. Rewrote it to query the base table with aggregate expressions that ClickHouse can satisfy from an aggregate projection.
- The removal example showed `DROP PROJECTION` followed by `CLEAR PROJECTION` as if both should run sequentially. Clarified that `CLEAR PROJECTION` is an alternative that removes projection files without removing the definition.
- The projection metadata query used `system.projection_parts` with non-existent or inappropriate metadata columns. Updated it to use `system.projections` for projection definitions and `system.projection_parts` only for storage totals.
- The projection storage examples grouped `system.projection_parts` by `name` as if it were the projection definition name. Updated them to report total projection storage per table.
- The insert monitoring query filtered `system.query_log` by a non-existent `table` column. Updated it to filter with `has(tables, 'events')`.

## Review Notes
ClickHouse projection behavior is version-sensitive in a few areas. The post now uses current setting names and system-table columns, but future versions may expose more detailed per-projection storage metadata or additional projection optimizer controls.
