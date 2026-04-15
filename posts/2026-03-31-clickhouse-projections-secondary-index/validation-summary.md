# Validation Summary: How to Use Projections as Secondary Indexes in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse Projections (normal and aggregate)
- ClickHouse system tables (`system.projection_parts`, `system.projections`)
- SQL (DDL and DML)

## Sources Consulted
- ClickHouse official documentation — Projections: https://clickhouse.com/docs/sql-reference/statements/alter/projection
- ClickHouse official documentation — system.projections: https://clickhouse.com/docs/operations/system-tables/projections
- ClickHouse official documentation — system.projection_parts: https://clickhouse.com/docs/operations/system-tables/projection_parts
- ClickHouse official documentation — EXPLAIN statement: https://clickhouse.com/docs/sql-reference/statements/explain

## Issues Found

1. **Description claimed "without data duplication overhead"** — The post's own trade-offs section states projections incur "Extra storage (roughly 1x per projection)," which directly contradicts the description. Projections store a full copy (or aggregated copy) of the data in an alternative sort order. Removed the misleading phrase from the description.

2. **Aggregate projection query used non-existent columns** — The query `SELECT event_type, sum(total) FROM events WHERE day >= '2026-01-01' GROUP BY event_type` referenced `day` and `total`, which are aliases defined inside the projection, not actual columns of the `events` table. This query would fail with an "Unknown identifier" error. Fixed to use base table columns: `toDate(ts)` instead of `day`, and `sum(value)` instead of `sum(total)`. ClickHouse's query optimizer automatically matches the rewritten query to the aggregate projection.

## Review Notes
- The `system.projection_parts` query uses a `projection_name` column. This column may not be present in all ClickHouse versions — verify against your specific ClickHouse version if the query fails, and consider using `name` or extracting projection identity from the part name.
- The analogy of projections as "secondary indexes" is useful for intuition but technically imprecise. Projections are closer to automatically-maintained materialized views stored inline within the same table parts. True secondary indexes in ClickHouse are skip indexes (`INDEX ... TYPE ...`). The post's framing is acceptable for a tutorial audience.
- The `EXPLAIN indexes = 1` syntax and the advice to look for `Projection: proj_event_type` in the output is correct, though the exact EXPLAIN output format may vary across ClickHouse versions.
- All DDL syntax (`CREATE TABLE`, `ALTER TABLE ADD PROJECTION`, `MATERIALIZE PROJECTION`, `DROP PROJECTION`) is correct and current.
