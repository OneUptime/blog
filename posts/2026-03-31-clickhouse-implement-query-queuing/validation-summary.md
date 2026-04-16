# Validation Summary: How to Implement Query Queuing in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse server configuration (config.xml, users.xml profiles)
- ClickHouse system tables (`system.processes`, `system.metrics`)
- ClickHouse query complexity and concurrency settings

## Sources Consulted
- ClickHouse server settings: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse query-complexity settings: https://clickhouse.com/docs/operations/settings/query-complexity
- ClickHouse general settings: https://clickhouse.com/docs/operations/settings/settings
- `system.processes` docs: https://clickhouse.com/docs/operations/system-tables/processes
- `system.metrics` docs: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse `queue_max_wait_ms` (knowledge base + GitHub issue #48840)
- GitHub issue #9405 on per-user concurrency settings

## Issues Found
1. **Per-user `max_concurrent_queries` in profile** — The post placed `<max_concurrent_queries>` inside a `<profiles>` block. `max_concurrent_queries` is a server-global setting; the correct per-user setting is `max_concurrent_queries_for_user`. Updated the XML snippet and surrounding prose.
2. **Waiting Timeout used `max_execution_time`** — The post claimed `SET max_execution_time = 30` rejects a query when "queued + executing exceeds 30 seconds". `max_execution_time` only covers execution time, not queue wait. Replaced with `queue_max_wait_ms` (default 5000 ms), which is the actual setting for how long a client waits for a free concurrency slot.
3. **`system.processes` showing queued queries** — The post stated `system.processes` shows both executing and queued queries. It only shows currently executing queries. Rewrote the sentence to recommend `system.metrics` (`Query`) and `system.events` for queueing visibility.

## Review Notes
- `max_waiting_queries` is a server-level setting (introduced in ClickHouse 24.3); setting it in a profile will not take effect. The post keeps it server-level, which is correct.
- `max_threads` as a priority workaround is a reasonable approximation but not a true scheduler; ClickHouse 24.4+ introduced workload scheduling (`CREATE WORKLOAD`) which is a more robust approach for priority queuing — consider referencing in future revisions.
- The `system.metrics` query filters on `DelayedInserts`, which is specific to MergeTree INSERT throttling rather than general query queuing — left as-is since it is technically valid, but readers may misinterpret it as queue depth.
