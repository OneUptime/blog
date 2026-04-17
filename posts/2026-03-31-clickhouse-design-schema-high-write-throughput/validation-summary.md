# Validation Summary: How to Design a ClickHouse Schema for High Write Throughput

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree / ReplicatedMergeTree table engines
- ClickHouse Async Inserts
- LowCardinality data type
- ClickHouse Map data type
- clickhouse-benchmark CLI

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse ReplicatedMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse Async Inserts documentation: https://clickhouse.com/docs/en/optimize/asynchronous-inserts
- ClickHouse MergeTree settings reference: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse LowCardinality documentation: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse date/time functions (toYYYYMM, toMonday): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- clickhouse-benchmark documentation: https://clickhouse.com/docs/en/operations/utilities/clickhouse-benchmark
- ClickHouse Map type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/map

## Issues Found
- **Benchmark INSERT column mismatch**: The `clickhouse-benchmark` INSERT statement provided only 4 values (`now(), rand(), 'click', map('k','v')`) while the preceding minimal-columns table schema defines 5 columns (`event_date`, `event_time`, `user_id`, `event_type`, `attrs`). This would fail at runtime with a column count mismatch. Fixed by prepending `today()` to produce 5 values matching the schema order: `today(), now(), rand(), 'click', map('k','v')`.

## Review Notes
- The defaults for `parts_to_delay_insert` (1000) and `parts_to_throw_insert` (3000) in recent ClickHouse versions are higher than the post's recommended values (300 / 600). The post's values are valid tuning overrides for backpressure-sensitive ingestion setups but readers should be aware these are stricter than modern defaults.
- The claim that `LowCardinality(String)` yields "4x less storage and faster reads/writes" is a rough heuristic; actual compression ratios depend on column cardinality and can be significantly better or only marginal. Writes can see a slight overhead due to dictionary maintenance, though this is usually negligible.
- The `<profiles><ingestion>` block defines a user profile named `ingestion`; the profile must be explicitly selected (e.g., `SETTINGS profile = 'ingestion'` or user-level assignment) for the async_insert settings to apply. This is a configuration subtlety worth mentioning in a follow-up.
- `max_parts_in_total` default is 100000 in recent versions; the post's 10000 is a tighter guard which is acceptable as a tuning recommendation.
