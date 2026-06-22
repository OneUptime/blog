# Validation Summary: How to Profile ClickHouse Query Memory Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse system tables
- ClickHouse SQL
- ClickHouse query profiling
- ClickHouse memory settings
- ClickHouse XML configuration

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse knowledge base: identifying expensive queries with system.query_log: https://clickhouse.com/docs/knowledgebase/find-expensive-queries
- ClickHouse system.processes documentation: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse EXPLAIN statement documentation: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse session settings documentation: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse query complexity restrictions documentation: https://clickhouse.com/docs/operations/settings/query-complexity
- ClickHouse server settings documentation: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse allocation profiling documentation: https://clickhouse.com/docs/operations/allocation-profiling
- ClickHouse cluster deployment configuration documentation: https://clickhouse.com/docs/architecture/cluster-deployment

## Issues Found
- The `system.query_log` examples selected and ordered by `peak_memory_usage`, but current ClickHouse documentation lists `memory_usage` for query memory consumption in `system.query_log`; `peak_memory_usage` is available in other tables such as `system.processes` and `system.query_metric_log`. Removed `peak_memory_usage` from the query-log examples and ordered by `memory_usage`.
- The post described `EXPLAIN ESTIMATE` as memory estimation. ClickHouse documents it as estimating rows, marks, and parts read from MergeTree-family tables. Updated the section title and comments to describe query-plan and read-estimate analysis instead of memory estimation.
- The `GROUP BY ... LIMIT` example implied that `LIMIT` reduces aggregation cardinality and memory usage. In ClickHouse, `LIMIT` is applied after aggregation, so it does not prevent building the high-cardinality aggregation state. Replaced it with an example that groups by a lower-cardinality expression.
- The "Streaming Aggregation" section described `max_bytes_before_external_group_by` and `max_bytes_before_external_sort` as partial aggregation settings. These settings enable external aggregation and external sorting, spilling to disk after thresholds are reached. Renamed the section and adjusted comments.
- The subquery optimization section stated that replacing a large `IN` subquery with an `INNER JOIN` is always better. This is not generally true and can change semantics when the joined table has duplicate keys. Changed the wording to present `ANY INNER JOIN` as an alternative when JOIN semantics are needed.
- The XML snippet labeled all settings as `config.xml` settings, but ClickHouse user profiles are normally placed in `users.xml` or files under `users.d`, while server-level settings belong in server configuration. Updated the comment accordingly.

## Review Notes
The post remains a high-level guide rather than a full allocation-profiler walkthrough. For deeper per-allocation stack analysis, ClickHouse 25.9+ documents jemalloc allocation profiling with `system.trace_log`, `system.jemalloc_profile_text`, and related profiler settings.
