# Validation Summary: How to Create Custom Performance Benchmarks for ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, system tables, data skipping indexes)
- `clickhouse-benchmark` CLI utility
- `clickhouse-client` CLI
- Bash scripting for benchmark orchestration

## Sources Consulted
- ClickHouse CLI docs: https://clickhouse.com/docs/interfaces/cli
- `clickhouse-benchmark` docs: https://clickhouse.com/docs/operations/utilities/clickhouse-benchmark
- `system.metrics` docs: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse data skipping indexes: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse table functions (`generateRandom`, `numbers`): https://clickhouse.com/docs/sql-reference/table-functions
- ClickHouse source: `src/Client/ClientBase.cpp` (verified `--time, -t` option) and `src/Common/CurrentMetrics.cpp` (verified background pool metric names)

## Issues Found
- **`system.metrics` metric `BackgroundPoolTask` does not exist** in current ClickHouse. The single shared background pool was split into pool-specific metrics (e.g., `BackgroundMergesAndMutationsPoolTask`, `BackgroundFetchesPoolTask`, `BackgroundCommonPoolTask`, `BackgroundMovePoolTask`, `BackgroundSchedulePoolTask`). Replaced `BackgroundPoolTask` with `BackgroundMergesAndMutationsPoolTask` in the example query in the "Capturing System Metrics During Benchmark" section — this is the closest analogue to what the original metric represented.

Verified-correct items that initially looked suspect:
- `clickhouse-client --time` flag is valid — confirmed in `src/Client/ClientBase.cpp` (`"time,t", "Print query execution time to stderr in non-interactive mode (for benchmarks)"`). It only prints in batch/non-interactive mode, which matches the post's usage.

## Review Notes
- Array indexing example `['Electronics', ...][rand() % 4 + 1]` correctly accounts for ClickHouse's 1-based array indexing.
- `round(rand() % 1000 + 10, 2)` rounds an integer expression to 2 decimal places, which is effectively a no-op. Functionally fine, just slightly redundant.
- `--format Null` is the right choice for benchmarking since it discards results without serialization overhead.
- Bloom filter skip index syntax (`ADD INDEX ... TYPE bloom_filter GRANULARITY 1` followed by `MATERIALIZE INDEX`) is the standard pattern.
- Future improvement: the post could mention that `--time` only takes effect in non-interactive (batch) mode, which the script's `< queries.sql` redirection satisfies.
