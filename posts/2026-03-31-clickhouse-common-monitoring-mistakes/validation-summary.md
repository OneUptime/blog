# Validation Summary: Common ClickHouse Monitoring Mistakes

## Status
validated

## Post Type
Guide / Best-practices list

## Technologies Covered
- ClickHouse
- ClickHouse system tables (`system.metrics`, `system.parts`, `system.merges`, `system.query_log`, `system.disks`, `system.replication_queue`)
- Prometheus (mentioned as a metrics backend)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse system tables documentation: https://clickhouse.com/docs/en/operations/system-tables
- `system.metrics`: https://clickhouse.com/docs/en/operations/system-tables/metrics
- `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- `system.merges`: https://clickhouse.com/docs/en/operations/system-tables/merges
- `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- `system.disks`: https://clickhouse.com/docs/en/operations/system-tables/disks
- `system.replication_queue`: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse quantile aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile

## Issues Found
No technical issues found.

- All referenced system tables and their columns (`database`, `table`, `active`, `rows`, `query_duration_ms`, `event_date`, `type`, `name`, `path`, `free_space`, `total_space`, `last_exception`) exist and are correctly used.
- The metric names (`BackgroundMergesAndMutationsPoolTask`, `ReplicatedChecks`, `Query`, `DelayedInserts`) are valid entries in `system.metrics`.
- The `quantile(level)(column)` parametric syntax is correct ClickHouse SQL.
- The `QueryFinish` value for the `type` column in `system.query_log` is correct.
- Alert thresholds quoted (300 active parts, 100 pending merges, 85% disk usage) align with commonly recommended operational guidance.

## Review Notes
- The `parts_to_throw_insert` default in modern ClickHouse is 3000 (with `parts_to_delay_insert` at 1000), so the 300-parts alert threshold in Mistake 2 is a reasonable early-warning heuristic rather than a hard limit — the post correctly positions it as an alert level rather than a breaking threshold.
- `DelayedInserts > 0` is a useful leading indicator; operators may also want to track `RejectedInserts` as a complementary signal.
- `system.replication_queue` also exposes `num_postponed` and `num_tries` columns that can add useful context beyond `last_exception`, but the current query is correct as written.
