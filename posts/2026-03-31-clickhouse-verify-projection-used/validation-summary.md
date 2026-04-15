# Validation Summary: How to Verify ClickHouse Is Using Your Projection

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- ClickHouse (MergeTree engine, projections)
- SQL (EXPLAIN statements, system tables)
- ClickHouse query optimizer and projection selection

## Sources Consulted
- ClickHouse official documentation on EXPLAIN statement (https://clickhouse.com/docs/sql-reference/statements/explain)
- ClickHouse official documentation on projections (https://clickhouse.com/docs/sql-reference/statements/alter/projection)
- ClickHouse official documentation on system.query_log table (https://clickhouse.com/docs/operations/system-tables/query_log)
- ClickHouse official documentation on system.mutations table (https://clickhouse.com/docs/operations/system-tables/mutations)
- ClickHouse official documentation on MergeTree settings including optimize_use_projections (https://clickhouse.com/docs/operations/settings/settings)
- ClickHouse knowledgebase articles on projection usage verification

## Issues Found
1. **Incorrect EXPLAIN output description**: The post claimed the output shows `ReadFromProjection` and `Projection: <name>` when a projection is used. In reality, ClickHouse shows `ReadFromMergeTree (projection_name)` with the projection name in parentheses. Fixed the bullet points to reflect the actual output format.

2. **Wrong EXPLAIN method for projection analysis**: Method 2 used `EXPLAIN PIPELINE`, which is not documented to show projection-specific information. Replaced with `EXPLAIN projections = 1`, which is the correct EXPLAIN option for viewing projection analysis details (conditions evaluated, parts/marks/rows statistics per projection).

3. **Incorrect column name in system.query_log**: The post referenced `used_projections` as the column name. The actual column name is `projections` (type `Array(LowCardinality(String))`). Fixed all references throughout the post.

4. **Non-existent column in system.mutations query**: The query selected `name` from `system.mutations`, but this column does not exist. The correct column is `mutation_id`. Fixed the query.

## Review Notes
- The `optimize_use_projections = 0` setting and its usage for benchmarking are correct.
- The projection selection rules described (column coverage, GROUP BY alignment, materialization requirement) are broadly accurate. Note that ClickHouse v25.6+ introduced indirect reads via `_part_offset`, which relaxes the strict column coverage requirement for normal projections, but the guidance in the post remains sound as general advice.
- The overall structure and methodology of the post (use EXPLAIN before deployment, verify via query_log after execution) is solid advice.
