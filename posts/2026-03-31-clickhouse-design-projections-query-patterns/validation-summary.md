# Validation Summary: How to Design Projections for Common Query Patterns in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse MergeTree engine
- ClickHouse Projections (normal/reorder and aggregate)
- ClickHouse SQL functions (`toStartOfHour`, `toDate`, `count`, `avg`, `max`)
- ClickHouse system tables (`system.query_log`, `system.projection_parts`)
- ClickHouse `EXPLAIN` statement

## Sources Consulted
- ClickHouse official documentation — Projections: https://clickhouse.com/docs/en/sql-reference/statements/alter/projection
- ClickHouse official documentation — `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse official documentation — `system.projection_parts`: https://clickhouse.com/docs/en/operations/system-tables/projection_parts
- ClickHouse official documentation — `EXPLAIN`: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse official documentation — Date/Time functions (`toStartOfHour`, `toDate`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
No technical issues found.

## Review Notes
- The `system.query_log` query uses valid columns (`normalized_query_hash`, `query_duration_ms`, `type`, `query`) and is a reasonable way to identify hot/slow queries.
- The `ALTER TABLE ... ADD PROJECTION ... (SELECT ... ORDER BY ...)` and aggregate `SELECT ... GROUP BY ...` projection syntax is correct. `SELECT *` is valid in reorder projections.
- `MATERIALIZE PROJECTION` is required to backfill existing parts; the post shows this correctly after each `ADD PROJECTION`.
- The advice to check `EXPLAIN` output for the projection name is accurate. For clearer projection-selection output, `EXPLAIN indexes = 1` can be used — but plain `EXPLAIN` output does include the projection name, so the post's guidance is acceptable.
- `system.projection_parts` is a valid system table for monitoring projection parts/storage.
- Recommendations around write amplification and limiting to 3–5 projections per table are reasonable operational guidance.
- No version-specific caveats were introduced; the syntax shown works on current (modern) ClickHouse versions where projections are generally available (they were promoted out of experimental in newer releases, though historically they required `allow_experimental_projection_optimization` in some older versions).
