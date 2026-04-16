# Validation Summary: How to Use index_granularity Setting in MergeTree in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ClickHouse SQL (DDL/DML, EXPLAIN)
- ClickHouse system tables (`system.parts`, `system.tables`, `system.merge_tree_settings`)
- Adaptive index granularity (`index_granularity_bytes`)

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse sparse primary indexes guide: https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes
- ClickHouse EXPLAIN reference: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse `system.parts` documentation
- ClickHouse `system.merge_tree_settings` documentation

## Issues Found
- **Incorrect constraint on `index_granularity` values.** The post originally claimed: "You can use any power of 2 from 1 to 8192, but standard values are 1024, 4096, 8192." This is incorrect — ClickHouse does not restrict `index_granularity` to powers of 2 or cap it at 8192. The setting accepts any positive integer, and the post itself later references a `65536+` granularity in the tradeoffs table, contradicting the original claim. Replaced with: "`index_granularity` accepts any positive integer. Common choices are powers of 2 such as 1024, 4096, 8192, and 16384, but the value is not restricted to powers of 2 or capped at 8192."

## Review Notes
- The default value `index_granularity = 8192` and `index_granularity_bytes = 10485760` (10 MB) are correctly stated.
- The mark size estimate of "approximately 8 bytes (compressed)" is a rough generalization — actual size in `primary.idx` depends on the primary key column widths (e.g., the example schema's `(DateTime, UInt64)` would be ~12 bytes uncompressed). The arithmetic shown for memory usage is internally consistent given the 8-byte assumption.
- The `EXPLAIN indexes = 1` output containing `Granules: X/Y` matches current ClickHouse behavior.
- Adaptive granularity (`index_granularity_bytes`) was indeed introduced in the ClickHouse 19.x line; "19.11+" is approximately correct (the feature was active by 19.6 and widely adopted by 19.11).
- The `RENAME TABLE ... TO ..., ... TO ...` atomic-swap syntax is valid.
- All `system.parts`, `system.tables`, and `system.merge_tree_settings` queries reference real columns and tables.
