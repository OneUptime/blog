# Validation Summary: How to Optimize ClickHouse Queries with Projection Hints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse Projections (aggregate and sort-order types)
- ClickHouse SQL (ALTER TABLE, EXPLAIN, system tables)

## Sources Consulted
- ClickHouse official documentation — ALTER TABLE projections: https://clickhouse.com/docs/en/sql-reference/statements/alter/projection
- ClickHouse official documentation — MergeTree projections: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#projections
- ClickHouse official documentation — system.projections table: https://clickhouse.com/docs/en/operations/system-tables/projections

## Issues Found

### 1. `FROM` clause in aggregate projection definition
**What was wrong:** The aggregate projection definition included `FROM events` inside the SELECT statement. ClickHouse projection definitions implicitly select from the parent table and must not contain a FROM clause.
**What was changed:** Removed `FROM events` from the `proj_user_daily` projection definition.
**Why:** This would cause a syntax error in ClickHouse. The official documentation syntax is `ALTER TABLE [db.]name ADD PROJECTION name ( SELECT <COLUMN LIST EXPR> [GROUP BY] [ORDER BY] )` with no FROM clause.

### 2. Query example referenced projection aliases instead of base table columns
**What was wrong:** The "Query That Uses the Projection" example used `sum(event_count)` and `WHERE date >= today() - 30`, referencing `event_count` and `date` which are aliases defined only within the projection, not actual columns on the `events` table. ClickHouse projections are transparent — queries must reference the original base table columns and expressions.
**What was changed:** Rewrote the query to use `count() AS event_count` and `WHERE toDate(ts) >= today() - 30`, matching the original column expressions that ClickHouse can then transparently map to the projection.
**Why:** The original query would fail with a column-not-found error since `event_count` and `date` are not columns on the `events` table. The optimizer matches queries against projections based on the original expressions, not projection aliases.

### 3. Incorrect column name in `system.projections` query
**What was wrong:** The query checking projection materialization status referenced a non-existent `is_materialized` column on the `system.projections` table. The actual columns are `database`, `table`, `name`, `type`, `sorting_key`, `query`, and `settings`.
**What was changed:** Replaced `is_materialized` with the actual available columns: `type`, `sorting_key`, and `query`.
**Why:** The `is_materialized` column does not exist in `system.projections`. Materialization status can be checked via `system.projection_parts` or the `projections` column in `system.parts`, not via `system.projections` directly.

## Review Notes
- The `EXPLAIN indexes = 1` syntax is valid (ClickHouse treats `EXPLAIN` as shorthand for `EXPLAIN PLAN`). For projection-specific analysis, `EXPLAIN indexes = 1, projections = 1` could be more targeted, but the current form works and does show projection usage in the output.
- The comparison table between Projections and Materialized Views is accurate and helpful.
- The section on "Checking Projection Materialization Status" title is slightly misleading after the fix since `system.projections` shows projection definitions, not materialization status. However, the query is still useful for listing projections on a table, so no change was made beyond correcting the column names.
