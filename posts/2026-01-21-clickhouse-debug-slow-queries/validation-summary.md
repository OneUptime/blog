# Validation Summary: How to Debug Slow Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse system tables (`system.query_log`, `system.processes`, `system.query_thread_log`, `system.trace_log`, `system.data_skipping_indices`)
- ClickHouse `EXPLAIN`
- Query profiling and flamegraph generation
- MergeTree pruning, primary keys, skip indexes, text indexes, dictionaries, joins, sampling, and PREWHERE

## Sources Consulted
- ClickHouse documentation: `EXPLAIN` statement: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse documentation: `system.query_log`: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse documentation: `system.processes`: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse documentation: `system.query_thread_log`: https://clickhouse.com/docs/operations/system-tables/query_thread_log
- ClickHouse documentation: sampling query profiler and flamegraphs: https://clickhouse.com/docs/operations/optimizing-performance/sampling-query-profiler
- ClickHouse documentation: `system.trace_log`: https://clickhouse.com/docs/operations/system-tables/trace_log
- ClickHouse documentation: data skipping index examples: https://clickhouse.com/docs/optimize/skipping-indexes/examples
- ClickHouse documentation: Map type and map access: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse documentation: map functions (`mapKeys`, `mapValues`): https://clickhouse.com/docs/sql-reference/functions/tuple-map-functions
- ClickHouse documentation: session settings (`log_profile_events`, `log_queries`, `log_query_threads`): https://clickhouse.com/docs/operations/settings/settings

## Issues Found
- `system.query_log` was queried with `peak_memory_usage`, but the documented `system.query_log` schema exposes `memory_usage`, not `peak_memory_usage`. Changed the high-memory query to select and order by `memory_usage`.
- `ProfileEvents.Names` / `ProfileEvents.Values` with `ARRAY JOIN ProfileEvents` was outdated/incorrect for the current `Map(LowCardinality(String), UInt64)` column shape. Replaced it with `ARRAY JOIN mapKeys(ProfileEvents) AS metric` and `ProfileEvents[metric]`.
- The partition-pruning example claimed that `toYYYYMM(event_time)` prevents pruning. Current ClickHouse can prune in more cases involving deterministic function chains, and tables may also be partitioned by expressions. Reworded the example to prefer explicit date ranges because they are easier to verify rather than claiming functions always prevent pruning.
- The GROUP BY "limit cardinality" example used `HAVING events > 10`, which filters after aggregation and does not reduce aggregation memory. Replaced it with a lower-cardinality aggregation key example.
- The text-search skip index example used `tokenbf_v1`, which ClickHouse documentation marks deprecated for full-text search in ClickHouse 26.2+ in favor of `text` indexes. Updated the example to use a `text` index and materialize it.
- The skip-index verification query used `LIKE '%error%'`, which is a substring predicate and does not match the updated full-text index example. Changed it to `hasAllTokens(message, 'error')`.
- The trace-log stack query attempted to concatenate an array of `UInt64` values directly. Added `toString` conversion before `arrayStringConcat`.
- The symbolized trace export used introspection functions without enabling them. Added `--allow_introspection_functions=1` and filtered the export to `trace_type = 'CPU'`.

## Review Notes
Some examples remain schema-dependent placeholders (`events`, `logs`, dictionaries, and sampling keys) and require matching table definitions in a real deployment. In ClickHouse Cloud or distributed deployments, some system tables are local to a node, so cluster-wide analysis may require querying across replicas.
