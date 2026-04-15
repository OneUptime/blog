# Validation Summary: How to Use optimize_aggregation_in_order in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, aggregation optimization)
- SQL (DDL, DML, EXPLAIN pipeline)
- ClickHouse system tables (system.query_log)

## Sources Consulted
- ClickHouse official docs — GROUP BY clause: https://clickhouse.com/docs/sql-reference/statements/select/group-by
- ClickHouse official docs — query optimization guide: https://clickhouse.com/docs/optimize/query-optimization
- ClickHouse official docs — system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse official docs — async vs optimize_read_in_order: https://clickhouse.com/docs/knowledgebase/async_vs_optimize_read_in_order
- ClickHouse blog — definitive guide to query optimization: https://clickhouse.com/resources/engineering/clickhouse-query-optimisation-definitive-guide
- ChistaDATA — comprehensive guide to ClickHouse EXPLAIN: https://chistadata.com/comprehensive-guide-clickhouse-explain/

## Issues Found
1. **Incorrect EXPLAIN pipeline output description (line 58)**: The post stated to look for "`AggregatingTransform` with `sorted` indicated in the output." In reality, when in-order aggregation is active, the EXPLAIN pipeline shows `AggregatingInOrderTransform` (a distinct transform name), not the standard `AggregatingTransform` with a "sorted" annotation. Fixed to reference `AggregatingInOrderTransform` and clarify that it replaces the standard `AggregatingTransform`.

## Review Notes
- The `system.query_log` query using `Settings['optimize_aggregation_in_order']` is syntactically correct, but the `Settings` map only contains non-default settings and requires `log_query_settings = 1` to be enabled. This is a minor operational caveat, not an error in the post.
- The setting's default value is 0 (disabled), which is consistent with the post's approach of explicitly enabling it.
- The post correctly notes that GROUP BY must be a prefix of the ORDER BY key. ClickHouse also supports injective functions applied to the key columns, but omitting this advanced detail is reasonable for the post's scope.
- The performance trade-off (lower memory but potentially longer execution time) could be mentioned but is not required for correctness.
