# Validation Summary: How to Build a ClickHouse Insert Performance Dashboard

## Status
validated

## Post Type
Tutorial / Reference (operational dashboard recipes)

## Technologies Covered
- ClickHouse (system tables: `query_log`, `part_log`, `parts`, `tables`, `metrics`, `events`)
- ClickHouse Buffer table engine
- ClickHouse async inserts
- ClickHouse MergeTree merge/throttle settings (`parts_to_delay_insert`, `parts_to_throw_insert`)

## Sources Consulted
- ClickHouse system tables overview: https://clickhouse.com/docs/operations/system-tables/overview
- `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- `system.part_log`: https://clickhouse.com/docs/en/operations/system-tables/part_log
- `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- `system.metrics`: https://clickhouse.com/docs/en/operations/system-tables/metrics
- `system.events`: https://clickhouse.com/docs/en/operations/system-tables/events
- MergeTree settings: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- Buffer engine: https://clickhouse.com/docs/en/engines/table-engines/special/buffer
- ClickHouse source: `src/Storages/System/attachSystemTables.cpp`

## Issues Found

1. **Non-existent `system.buffers` table.** The original post queried `FROM system.buffers` with columns `min_time`, `max_time`, `flush_count`, `flush_bytes`. This system table does not exist in ClickHouse (verified against `attachSystemTables.cpp` and the system-tables index). Replaced the query with a correct one against `system.tables WHERE engine = 'Buffer'` (which exposes `total_bytes` and `total_rows` for Buffer engine tables) and added a companion query against `system.events` for real Buffer-engine flush counters (`StorageBufferFlush`, `StorageBufferErrorOnFlush`, `StorageBufferPassedAllMinThresholds`, etc.).

2. **Imprecise parts threshold claim.** The original text said "Tables approaching 3000 parts will experience insert delays as ClickHouse throttles writes." In reality, 3000 is the default for `parts_to_throw_insert` (hard rejection with "Too many parts"), while *delays* are governed by the separate `parts_to_delay_insert` setting (default 1000). Reworded to distinguish the two thresholds and name the settings.

## Review Notes
- All other SQL queries verified against official docs: `query_kind = 'Insert'` (PascalCase) is correct, `event_type` values `'NewPart'` and `'MergeParts'` are valid for `system.part_log`, async insert metrics (`AsyncInsertCacheSize`, `PendingAsyncInsert`) and events (`AsyncInsertQuery`, `AsyncInsertBytes`, `FailedAsyncInsertQuery`) all exist.
- `parts_to_throw_insert` default was raised from 300 to 3000 in ClickHouse 23.6 — the post's threshold guidance is accurate for currently-supported versions but would be wrong on older 22.x deployments.
- The "fewer than 1 part per second per table" rule of thumb is heuristic, not from official docs, but is a widely cited operational guideline and not technically incorrect.
