# Validation Summary: How to Debug ClickHouse Disk IO Bottlenecks

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- ClickHouse (MergeTree engine, system tables, storage policies)
- Linux system utilities (`iostat`, `top`)
- SQL (ClickHouse dialect)
- ClickHouse XML configuration

## Sources Consulted
- ClickHouse EXPLAIN statement: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse system.metrics: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse system.asynchronous_metrics: https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics
- ClickHouse system.merges: https://clickhouse.com/docs/operations/system-tables/merges
- ClickHouse system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse MergeTree / storage policies: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- `iostat` man page (sysstat)

## Issues Found

1. **Deprecated metric name `BackgroundPoolTask`.** Current ClickHouse versions split this metric into per-pool variants (e.g. `BackgroundMergesAndMutationsPoolTask`, `BackgroundFetchesPoolTask`, `BackgroundMovePoolTask`). Replaced `BackgroundPoolTask` with `BackgroundFetchesPoolTask` and `BackgroundMovePoolTask` so the query actually returns rows.

2. **Wrong metric prefix in `system.asynchronous_metrics`.** No metrics match `%DiskRead%` / `%DiskWrite%`. The actual host-level block-device metrics are named `BlockReadBytes_<device>`, `BlockWriteBytes_<device>`, etc. Updated the `LIKE` patterns accordingly. Also fixed the column name from `name` to `metric` (the correct column in `system.asynchronous_metrics`).

3. **EXPLAIN without `indexes = 1` does not show index usage.** Default `EXPLAIN` only prints the pipeline; partition/MinMax index pruning information only appears when `EXPLAIN indexes = 1` is specified. Updated the example to use `EXPLAIN indexes = 1`.

4. **"VirtualRow" is not a ClickHouse term.** The actual EXPLAIN output label for partition pruning is `Partition` / `MinMax` with `Parts` and `Granules` filtered counts. Updated the annotation to reference "Partition" / "MinMax" and the filtered Parts/Granules that actually appear in the output.

## Review Notes

- The `iostat` commands, `%iowait` guidance, and `top` advice are all correct.
- `system.query_log` and `system.merges` column names used in the post are all valid.
- The `storage_configuration` XML schema is structurally correct. Note that in production configs this block normally lives inside a top-level `<clickhouse>` (or legacy `<yandex>`) wrapper, and a `<move_factor>` is often added to the policy to trigger automatic moves between volumes — both are optional and omitted here for brevity.
- The `BlockRead*` / `BlockWrite*` metrics are host-wide (read from `/sys/block`), not ClickHouse-process-specific; a brief caveat to that effect was added.
