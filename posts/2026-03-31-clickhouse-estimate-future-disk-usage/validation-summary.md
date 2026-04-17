# Validation Summary: How to Estimate Future Disk Usage in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse system tables (`system.parts`, `system.part_log`, `system.disks`)
- ClickHouse SQL (CTEs, aggregate functions, INTERVAL arithmetic)
- `clickhouse-client` CLI

## Sources Consulted
- ClickHouse `system.parts` documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `system.part_log` documentation: https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse `system.disks` documentation: https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse formatting functions (`formatReadableSize`): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse date/time functions (`today`, `now`, INTERVAL): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse CTE (WITH clause) docs: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse `clickhouse-client` reference: https://clickhouse.com/docs/en/interfaces/cli

## Issues Found
No technical issues found.

All SQL queries use valid system table references and columns:
- `system.parts`: `active`, `bytes_on_disk`, `data_uncompressed_bytes`, `data_compressed_bytes`, `rows`, `partition`, `min_time`, `database`, `table` — all correct.
- `system.part_log`: `event_type` (with valid enum value `'NewPart'`), `event_time`, `bytes_on_disk`, `rows`, `database`, `table` — all correct.
- `system.disks`: `name`, `free_space` — all correct.

Functions used (`formatReadableSize`, `sum`, `avg`, `round`, `toDate`, `today`, `now`, `min`) are all valid ClickHouse built-ins. CTE (WITH) syntax and dotted column references through CTE aliases are supported. The `INTERVAL round(...) DAY` with a non-constant expression is supported in modern ClickHouse versions.

The compression math in the "Estimating Compression Ratio for New Data" section is internally consistent: `compressed_fraction` of 0.12 applied to 1 TB raw yields 120 GB stored, as stated.

The bash/`clickhouse-client --query` snippet is correctly formatted and `FORMAT TSVWithNames` is a valid output format.

## Review Notes
- The `avg(daily_bytes)` calculation across daily groupings will omit days with no inserts, which can bias the projected growth rate upward. This is an inherent modeling choice, not an error — worth mentioning in a future revision as a caveat for users running bursty workloads.
- `bytes_on_disk / data_uncompressed_bytes` can divide by zero for empty parts; not a common case for healthy tables with data, but a production-grade query could guard this with `nullIf(data_uncompressed_bytes, 0)`.
- `min_time`/`max_time` in `system.parts` are only meaningful when the partition/ordering key includes a DateTime-type column. Tables without time-based partition columns will return default values. Worth noting in a future edit.
- The CTE-based projection query uses a cross join with a single-row `disk_free` CTE, which is valid but could equivalently be expressed with a scalar subquery (`WITH (SELECT free_space ...) AS disk_free_space`) for simpler syntax.
