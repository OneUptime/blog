# Validation Summary: How to Drop and Rebuild Projections in ClickHouse

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- ClickHouse
- ClickHouse Projections (MergeTree)
- ClickHouse ALTER TABLE DDL
- `system.mutations` and `system.projections` system tables

## Sources Consulted
- [ClickHouse ALTER PROJECTION docs](https://clickhouse.com/docs/en/sql-reference/statements/alter/projection)
- [ClickHouse system.mutations docs](https://clickhouse.com/docs/en/operations/system-tables/mutations)
- [ClickHouse system.projections docs](https://clickhouse.com/docs/en/operations/system-tables/projections)
- [ClickHouse Avoid Mutations docs](https://clickhouse.com/docs/optimize/avoid-mutations)

## Issues Found
- **`parts_done` column does not exist in `system.mutations`.** The post referenced a `parts_done` column twice (in the drop-progress monitoring query and in the materialization monitoring query, including a percent-complete calculation derived from it). The actual schema exposes `parts_to_do` (remaining) and `is_done`, plus `parts_to_do_names` / `parts_in_progress_names`, but no `parts_done`. Fixed by removing `parts_done` from the DROP PROJECTION monitoring query, and by rewriting the MATERIALIZE PROJECTION monitoring query to use `parts_to_do`, `is_done`, and `create_time` instead of the invalid `parts_done`-based percentage expression.

## Review Notes
- `ALTER TABLE ... ADD PROJECTION ... (SELECT ... GROUP BY ...)`, `DROP PROJECTION`, and `MATERIALIZE PROJECTION` syntaxes all match the official ClickHouse grammar.
- `system.projections` is confirmed to expose `database`, `table`, and `name` columns, so the verification and bulk-cleanup queries are valid.
- Per the docs, `ADD` and `DROP` projection operations are described as "lightweight" (metadata/file-level). In practice, DROP PROJECTION is processed via a background mutation and surfaces in `system.mutations`, so the post's framing is consistent with observed behavior. Readers on newer versions may also want to know that `mutations_sync` can make these operations synchronous, but that is outside the scope of this post.
- The post does not specify a ClickHouse version; the syntax shown is valid on modern releases (22.x+).
