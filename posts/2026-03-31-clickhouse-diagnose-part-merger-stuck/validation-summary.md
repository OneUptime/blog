# Validation Summary: How to Diagnose ClickHouse Part Merger Stuck

## Status
validated

## Post Type
Tutorial / Diagnostic Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse system tables: `system.merges`, `system.metrics`, `system.disks`, `system.parts`
- ClickHouse SQL DDL/DML: `ALTER TABLE ... DROP PARTITION`, `OPTIMIZE TABLE ... FINAL`, `SYSTEM RELOAD CONFIG`
- Linux shell utilities (`grep`, `df`)

## Sources Consulted
- [ClickHouse system.merges documentation](https://clickhouse.com/docs/en/operations/system-tables/merges)
- [ClickHouse system.metrics documentation](https://clickhouse.com/docs/en/operations/system-tables/metrics)
- [ClickHouse server configuration parameters — background_pool_size](https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#background_pool_size)
- [ClickHouse system.parts documentation](https://clickhouse.com/docs/en/operations/system-tables/parts)
- [ClickHouse system.disks documentation](https://clickhouse.com/docs/en/operations/system-tables/disks)
- [GitHub issue #32336 — BackgroundPoolTask metric removal](https://github.com/ClickHouse/ClickHouse/issues/32336)

## Issues Found

1. **Removed `BackgroundPoolTask` from the Step 2 metrics query.** This metric existed in older ClickHouse versions (≤21.3) but was removed/renamed when the background pools were split into more granular ones (merges/mutations, fetches, moves, etc.). Querying it on a modern ClickHouse server returns no rows, which is misleading in a diagnostic guide. The remaining `BackgroundMergesAndMutationsPoolTask` and `BackgroundMergesAndMutationsPoolSize` metrics are the correct, current names for monitoring merge pool saturation.

2. **Replaced the invalid `SYSTEM SET background_pool_size = 32;` statement.** ClickHouse has no `SYSTEM SET` SQL command. `background_pool_size` is a server-level setting defined in `config.xml`, not a session/profile setting changeable via `SET` or any `SYSTEM` query. Per official docs, the only way to change it at runtime is to edit the config file and run `SYSTEM RELOAD CONFIG`, and even then only increases take effect without a restart. Updated the snippet to show the XML config entry plus the `SYSTEM RELOAD CONFIG` command, with a note about the increase-only-at-runtime constraint.

## Review Notes
- All `system.merges` columns referenced (`table`, `progress`, `elapsed`, `is_mutation`, `total_size_bytes_compressed`, `result_part_name`, `source_part_names`) are valid per current ClickHouse documentation.
- All `system.parts` columns referenced (`table`, `name`, `active`, `level`, `rows`, `bytes_on_disk`, `modification_time`) are valid.
- `system.disks` columns (`name`, `free_space`, `total_space`) are correct.
- `OPTIMIZE TABLE ... PARTITION ... FINAL` and `ALTER TABLE ... DROP PARTITION` syntax is correct.
- The free-space-equal-to-merge-size guidance is a reasonable practical heuristic; technically ClickHouse needs space for the result part (slightly less than the sum of source parts after compression), but the post's framing is conservative and safe.
