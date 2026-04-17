# Validation Summary: How to Debug Distributed Query Performance in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse distributed tables and `clusterAllReplicas` table function
- ClickHouse system tables (`system.query_log`, `system.parts`)
- ClickHouse `EXPLAIN` variants
- ClickHouse ProfileEvents

## Sources Consulted
- ClickHouse `system.query_log` docs: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse `system.parts` docs: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `EXPLAIN` docs: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse `cluster`/`clusterAllReplicas` table function docs: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- ClickHouse other functions (hostName): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse ProfileEvents (source `src/Common/ProfileEvents.cpp`) and https://clickhouse.com/docs/en/operations/system-tables/events

## Issues Found
1. **Wrong `EXPLAIN` variant.** The post originally used `EXPLAIN PIPELINE` while telling readers to look for `ReadFromRemote` nodes. `ReadFromRemote` is a query-plan step that appears in `EXPLAIN PLAN` (plain `EXPLAIN`) output. `EXPLAIN PIPELINE` shows lower-level processors (e.g., `AggregatingTransform`, `ExpressionTransform`) and does not surface `ReadFromRemote` the way the surrounding text described. Changed `EXPLAIN PIPELINE` to `EXPLAIN PLAN` so the example matches the "logical plan" description and the nodes the reader is told to look for.
2. **Non-existent columns in `system.parts`.** The "Identify Missing Index Usage" section selected `read_rows` and `read_bytes` from `system.parts`. Those columns only exist in `system.query_log`; `system.parts` exposes part-size information via `rows` and `bytes_on_disk`. Replaced the column list with `rows`, `bytes_on_disk`, `primary_key_bytes_in_memory`, and updated the `ORDER BY` to `bytes_on_disk DESC` so the query actually executes.

## Review Notes
- `hostname()` on line 53 and `hostName()` on line 87 are both accepted — ClickHouse function names are case-insensitive and `hostname` is a registered alias — so this was left as-is, though the canonical spelling is `hostName()`.
- `NetworkSendBytes` / `NetworkReceiveBytes` ProfileEvent names are correct.
- `clusterAllReplicas('my_cluster', system.query_log)` and `clusterAllReplicas('my_cluster', default.events)` usages are valid.
- `initial_query_id`, `query_duration_ms`, `read_rows`, `result_rows`, `memory_usage`, `ProfileEvents`, and `type` are all valid columns in `system.query_log`.
- The "Identify Missing Index Usage" section heading is slightly mismatched with what the (corrected) query actually shows — large parts by disk size, not index effectiveness. Left as-is because the task scope is technical correctness, not restructuring. Readers who need true index-usage diagnostics should consider `EXPLAIN indexes = 1` in a future revision.
