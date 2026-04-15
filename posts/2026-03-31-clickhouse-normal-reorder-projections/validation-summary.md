# Validation Summary: How to Use Normal (Reorder) Projections in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse Projections (normal/reorder type)
- ClickHouse SQL (ALTER TABLE, EXPLAIN, system tables)

## Sources Consulted
- ClickHouse ALTER TABLE PROJECTION documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/projection
- ClickHouse MergeTree Projections documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#projections
- ClickHouse system.mutations table documentation: https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse EXPLAIN statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/explain

## Issues Found
1. **Inaccurate limitations about column defaults**: The post stated "Projections do not support column defaults or expressions that reference other tables." This is misleading — DEFAULT and MATERIALIZED columns work fine in projections since their values are computed at insert time. The actual restriction is that ALIAS columns cannot be used in a projection's ORDER BY clause. Fixed to state the precise limitation and suggest using MATERIALIZED columns or inline expressions as a workaround.
2. **Missing FINAL modifier limitation**: The post omitted a notable limitation: projections are not supported in SELECT statements with the FINAL modifier. Added this to the limitations list.
3. **Separated "no other tables" into its own bullet**: The original bullet conflated two unrelated limitations. Split into separate items for clarity: ALIAS column restriction and no cross-table references.

## Review Notes
- The `EXPLAIN indexes = 1` syntax shown is correct and commonly used. ClickHouse also supports `EXPLAIN projections = 1` for projection-specific analysis, which could be mentioned as an alternative in a future update.
- All SQL syntax for ADD PROJECTION, MATERIALIZE PROJECTION, column selection, and compound ORDER BY keys is correct per official docs.
- The system.mutations query for checking materialization completeness is accurate — `parts_to_do`, `is_done`, and `command` columns all exist, and the LIKE pattern is valid.
- The distinction between normal and aggregate projections in the comparison table is accurate.
