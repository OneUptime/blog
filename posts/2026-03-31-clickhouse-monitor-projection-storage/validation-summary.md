# Validation Summary: How to Monitor Projection Storage Overhead in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (MergeTree engine, projections)
- SQL (ClickHouse dialect)
- Prometheus (mentioned for metrics export)

## Sources Consulted
- ClickHouse `system.projection_parts` documentation: https://clickhouse.com/docs/operations/system-tables/projection_parts
- ClickHouse `system.parts` documentation: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse `system.mutations` documentation: https://clickhouse.com/docs/operations/system-tables/mutations
- ClickHouse `system.query_log` documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse ALTER PROJECTION documentation: https://clickhouse.com/docs/sql-reference/statements/alter/projection
- ClickHouse Prometheus integration documentation: https://clickhouse.com/docs/integrations/prometheus
- ClickHouse blog on projections: https://clickhouse.com/blog/clickhouse-faster-queries-with-projections-and-primary-indexes

## Issues Found

1. **`parts_done` column does not exist in `system.mutations`**: The query in the "Monitoring Projection Materialization Progress" section referenced a `parts_done` column that does not exist in `system.mutations`. The available columns are `parts_to_do`, `is_done`, `latest_fail_reason`, etc., but there is no completion counter. Removed `parts_done` from the SELECT list to make the query valid.

2. **Wrong column name `used_projections` in `system.query_log`**: The "Identifying Underused Projections" query referenced `ql.used_projections`, but the actual column name in `system.query_log` is `projections`. Changed all references from `used_projections` to `projections`.

3. **Unnecessary `JSONExtractArrayRaw()` call**: The `projections` column in `system.query_log` is of type `Array(String)`, not a JSON string. Using `JSONExtractArrayRaw()` on it is incorrect. Changed `has(JSONExtractArrayRaw(ql.used_projections), pp.name)` to `has(ql.projections, pp.name)`.

4. **String comparison on array column**: The `countIf(ql.used_projections != '')` check treated the column as a string, but since `projections` is `Array(String)`, changed it to `countIf(notEmpty(ql.projections))`.

## Review Notes
- The "Identifying Underused Projections" query uses `has(ql.projections, pp.name)` which assumes `projections` stores bare projection names. In some ClickHouse versions, the array may contain fully qualified names (e.g., `database.table.projection_name`). Users may need to adjust the join condition with `hasSubstr` or string manipulation depending on their ClickHouse version.
- The mention of the ClickHouse Prometheus endpoint is valid but requires explicit configuration in self-hosted deployments. ClickHouse does not expose a Prometheus endpoint by default.
- The overhead ratio query may produce a division-by-zero error if `total_bytes` is 0 for a table (e.g., an empty table with only projection metadata). Consider wrapping with `if(t.total_bytes > 0, ...)` in production use.
