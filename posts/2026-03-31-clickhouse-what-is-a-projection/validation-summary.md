# Validation Summary: What Is a Projection and How It Works in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse Projections (normal/sort and aggregate)
- ClickHouse system tables (`system.projections`)
- SQL (DDL and DML)

## Sources Consulted
- ClickHouse ALTER PROJECTION documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/projection
- ClickHouse MergeTree Projections documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#projections
- ClickHouse system.projection_parts documentation: https://clickhouse.com/docs/en/operations/system-tables/projection_parts
- ClickHouse system.projections documentation: https://clickhouse.com/docs/en/operations/system-tables/projections

## Issues Found
1. **Incorrect system table query (line 91-96):** The blog queried `system.projection_parts` with a `SELECT name, query` clause, but `system.projection_parts` does not have a `query` column. This table stores part-level storage metadata (rows, bytes, paths, etc.), not projection definitions. Fixed by changing the table to `system.projections`, which does have both `name` and `query` columns and is the correct table for viewing projection definitions. Also removed the `LIMIT 5` clause since this query returns one row per projection, not per part.

## Review Notes
- The post does not mention that projections are not supported in `SELECT` statements with the `FINAL` modifier, which is a documented limitation. This could be a useful addition in a future update.
- The post does not cover `CLEAR PROJECTION` (removes projection files but keeps the definition) vs. `DROP PROJECTION` (removes both). This distinction could help readers managing projections in production.
- All SQL syntax for `ADD PROJECTION`, `MATERIALIZE PROJECTION`, and both normal and aggregate projection patterns is correct per official documentation.
- The projections vs. materialized views comparison table is accurate across all five dimensions.
- The explanation of how the query optimizer automatically selects projections is correct.
