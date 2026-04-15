# Validation Summary: How to Model ClickHouse Growth Projections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system tables: `system.part_log`, `system.parts`)
- SQL (ClickHouse SQL dialect)
- Grafana (mentioned for dashboarding)
- OneUptime (mentioned for alerting)

## Sources Consulted
- ClickHouse official documentation for `system.part_log`: https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse official documentation for `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse SQL function reference for `formatReadableSize`, `toDate`, `today`, `numbers`: https://clickhouse.com/docs/en/sql-reference/functions

## Issues Found

### Issue 1: Incorrect column names in `system.part_log` queries
- **What was wrong:** The first query used `written_rows` and `written_bytes` as column names in `system.part_log`. These columns do not exist in that table. They exist in `system.query_log` but not `system.part_log`.
- **What was changed:** Replaced `written_rows` with `rows` and `written_bytes` with `size_in_bytes`, which are the correct column names in `system.part_log`.
- **Affected queries:** The "Historical Ingestion Rate" query (first SQL block) and the "Projecting with a Simple Query" CTE subquery (third SQL block).

### Issue 2: Math error in storage growth model
- **What was wrong:** The formula `(10,000 - 2,000) * 0.8 / 50 = 128 days` computes 80% of the *remaining* capacity, not the days until reaching 80% of *total* capacity. The description says "Days until 80% of 10 TB capacity," which means the target is 8 TB (80% of 10 TB).
- **What was changed:** Corrected the formula to `(10,000 * 0.8 - 2,000) / 50 = 120 days`. This correctly calculates: target threshold (8,000 GB) minus current usage (2,000 GB), divided by daily growth rate (50 GB/day) = 120 days.

## Review Notes
- The `system.parts WHERE active` query is correct. The `active` column is a valid filter for currently active (non-merged, non-removed) parts.
- The projection query's cross join with `numbers(90)` and use of `today() + number` for date arithmetic is valid ClickHouse syntax.
- The seasonal adjustment math is correct: the "extra storage" of 300 GB represents the additional storage above normal ingestion (150 - 50 = 100 GB extra per day * 3 days = 300 GB).
- Note that `system.part_log` must be explicitly enabled in ClickHouse configuration (`part_log` section in config.xml). This is enabled by default in recent versions but could be a gotcha for older installations. The post doesn't mention this, but it's a minor omission rather than an error.
