# Validation Summary: How to Use merge() Table Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (merge() table function, Merge table engine, MergeTree engine)
- SQL (ClickHouse SQL dialect)

## Sources Consulted
- ClickHouse official docs — merge() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/merge
- ClickHouse official docs — Merge table engine: https://clickhouse.com/docs/en/engines/table-engines/special/merge

## Issues Found

1. **`db_name` parameter shown as required (Basic Syntax section)**: The syntax was written as `merge(db_name, tables_regexp)` with no indication that `db_name` is optional. The official docs show it as optional, defaulting to `currentDatabase()`. Fixed to `merge([db_name,] tables_regexp)` and updated the parameter table.

2. **Schema requirements overstated (multiple locations)**: The post claimed "All matched tables must have identical column names and types" and "ClickHouse will error if schemas differ." The official documentation states the schema is derived by "union of their columns and by deriving common types," meaning tables can have different columns and types are coerced to common supertypes. Fixed in the Basic Syntax section, Schema Requirements section, and Summary section.

3. **Sequential scan claim incorrect (Performance Considerations)**: The post stated "merge() performs a sequential scan of all matched tables." The Merge engine documentation explicitly says "Reading is automatically parallelized." Fixed to reflect parallel reads and that each table's own indexes are used.

4. **`_table` filter optimization claim incorrect (Performance Considerations)**: The post stated "The `_table` column filter is evaluated after table selection, not before - all regex-matched tables are still opened." The Merge engine documentation explicitly states: "If you filter on `_table`, only tables which satisfy the filter condition are read." This is a table-selection optimization, not a post-scan filter. Fixed to reflect the correct behavior.

## Review Notes
- The "Filtering by Source Table" section heading and introductory text discuss filtering via the `_table` virtual column, but the code example actually demonstrates using a more specific regex instead. This is not technically wrong but is slightly misleading — a `WHERE _table IN (...)` example would better match the section's stated purpose. Left as-is since the regex approach is a valid alternative.
- The post could mention the `_database` virtual column, which is also available for cross-database merge queries, but this is an enhancement rather than a correction.
