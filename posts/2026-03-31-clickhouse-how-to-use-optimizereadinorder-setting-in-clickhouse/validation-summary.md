# Validation Summary: How to Use optimize_read_in_order Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ClickHouse query optimization settings (`optimize_read_in_order`, `optimize_read_in_window_order`)
- ClickHouse EXPLAIN / query plan
- ClickHouse `system.query_log`

## Sources Consulted
- ClickHouse settings reference: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse ORDER BY optimization docs: https://clickhouse.com/docs/sql-reference/statements/select/order-by#optimization-of-data-reading
- ClickHouse EXPLAIN docs: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse `system.query_log` docs: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse source: `src/Core/Settings.cpp` (default value confirmation) and `src/Processors/QueryPlan/ReadFromMergeTree.cpp` (EXPLAIN output format)

## Issues Found
- **EXPLAIN output wording.** The post originally said to look for `ReadInOrder` in EXPLAIN output. The actual plan output from ClickHouse shows a `ReadFromMergeTree` step with a `Read type: InOrder` line (the raw token `ReadInOrder` is not emitted). Updated the "Verifying the Optimization Is Applied" section to reference the correct plan-node/label pair.

## Review Notes
- `optimize_read_in_order` default = 1 (enabled) confirmed from ClickHouse source (`DECLARE(Bool, optimize_read_in_order, true, ...)`).
- Prefix-match requirement between query `ORDER BY` and table sorting key is correctly described.
- `optimize_read_in_window_order` is a real, documented setting. It is flagged in the docs as an expert-level / query-plan-level setting that may change in backward-incompatible ways; readers relying on it for production should re-verify on their ClickHouse version.
- All three columns referenced in `system.query_log` (`read_rows`, `memory_usage`, `query_duration_ms`) exist as `UInt64`.
- SQL examples (EXPLAIN, SET, CREATE TABLE MergeTree, window function syntax) are syntactically valid ClickHouse SQL.
