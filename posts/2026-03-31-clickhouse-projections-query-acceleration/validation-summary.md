# Validation Summary: How to Use Projections for Query Acceleration in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse Projections (Normal and Aggregate)
- ClickHouse SQL (DDL and DML)
- ClickHouse system tables (system.mutations, system.projection_parts)

## Sources Consulted
- ClickHouse official documentation on projections: https://clickhouse.com/docs/data-modeling/projections
- ClickHouse ALTER PROJECTION documentation: https://clickhouse.com/docs/sql-reference/statements/alter/projection
- ClickHouse EXPLAIN statement documentation: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse system.projection_parts documentation: https://clickhouse.com/docs/operations/system-tables/projection_parts
- ClickHouse system.projections documentation: https://clickhouse.com/docs/operations/system-tables/projections
- ClickHouse 2023 changelog (for force_optimize_projection_name): https://clickhouse.com/docs/whats-new/changelog/2023

## Issues Found

### 1. Aggregate projection query used projection aliases instead of base table columns
- **What was wrong:** The "Aggregate Projection Query" section queried `sum(total_bytes)` and `sum(request_count)`, which are aliases defined inside the projection definition, not actual columns of the base table `http_logs_with_agg`. This query would fail because those columns do not exist on the base table.
- **What was changed:** Replaced with `sum(bytes)` and `count()`, which are the original column and aggregate function from the base table. ClickHouse transparently recognizes that the query matches the aggregate projection structure and reads from the pre-computed projection data.
- **Why:** Aggregate projections work transparently — you write queries using the base table's columns and aggregate functions, and ClickHouse automatically routes to the projection if the query matches its structure.

### 2. Misleading description of `force_optimize_projection` setting
- **What was wrong:** The text said "force ClickHouse to use a specific projection" but `force_optimize_projection = 1` does not select a specific named projection. It forces that *some* applicable projection must be used; if none can serve the query, it returns an error.
- **What was changed:** Updated the description to "force ClickHouse to use a projection. If no applicable projection exists, the query will return an error."
- **Why:** To force a *specific* named projection, you would use `force_optimize_projection_name = 'proj_name'` (available since ClickHouse 23.10), which is a different setting.

## Review Notes
- The `EXPLAIN indexes = 1` syntax is correct and does show projection selection in the ReadFromMergeTree node. However, ClickHouse also supports `EXPLAIN projections = 1` which provides more detailed projection-specific analysis. Both can be combined: `EXPLAIN indexes = 1, projections = 1`.
- The `system.projection_parts` query uses `name` as the projection identifier. In this system table, `name` is technically the projection data part name (not purely the projection name). For simply listing which projections exist on a table, `system.projections` may be a cleaner alternative, though it does not include size information.
- The post could mention `force_optimize_projection_name` (added in ClickHouse 23.10) and `preferred_optimize_projection_name` (added in 23.11) as additional tools for controlling projection selection, but this is optional enrichment rather than a correction.
- All SQL syntax for CREATE TABLE with inline projections, ALTER TABLE ADD/DROP/MATERIALIZE PROJECTION, and the system.mutations progress check is correct.
