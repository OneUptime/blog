# Validation Summary: How to Monitor Disk Space Usage Per Table in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference (SQL queries for ClickHouse disk space monitoring)

## Technologies Covered
- ClickHouse
- ClickHouse system tables: `system.parts`, `system.part_log`, `system.disks`
- SQL (ClickHouse dialect)
- Grafana / Prometheus (mentioned for alerting context)

## Sources Consulted
- ClickHouse `system.part_log` documentation: https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse `system.parts` documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `system.disks` documentation (column names: `name`, `free_space`, `total_space`)
- ClickHouse functions: `formatReadableSize`, `toStartOfDay`, `toDate`, `sumIf`, `countIf`

## Issues Found

1. **Incorrect column name in `system.part_log` queries.** The post's "Tracking Growth Rate" and "Projecting Future Disk Usage" sections referenced `bytes_on_disk` from `system.part_log`. That column does not exist in `system.part_log` — the equivalent column is `size_in_bytes`. (`bytes_on_disk` exists in `system.parts`, but not in `system.part_log`.) Both queries would have failed at execution. Replaced `bytes_on_disk` with `size_in_bytes` in both queries.

## Review Notes
- All `system.parts` column references (`bytes_on_disk`, `data_compressed_bytes`, `data_uncompressed_bytes`, `rows`, `active`, `disk_name`, `partition`, `database`, `table`) are correct.
- All `system.disks` column references (`name`, `free_space`, `total_space`) are correct.
- The `event_type = 'NewPart'` filter is correct — `NewPart` is a valid PartLogElement value in ClickHouse.
- The alert query uses an alias (`used_percent`) in its `WHERE` clause; ClickHouse supports SELECT-clause aliases in `WHERE` via alias substitution, so this is valid ClickHouse SQL (not standard SQL, but correct here).
- The CTE-based "Projecting Future Disk Usage" query uses `WITH ... AS (subquery)` and a comma cross-join, both supported by modern ClickHouse.
- The alert query reuses the column name `free_space` as an alias for `formatReadableSize(free_space)`. This is technically valid because the `WHERE` clause filters on `used_percent` rather than `free_space`, but a reader extending the query to filter on `free_space` could trip on the shadowing — minor stylistic note, not a correctness bug.
