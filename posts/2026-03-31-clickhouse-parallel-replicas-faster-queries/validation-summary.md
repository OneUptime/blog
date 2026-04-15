# Validation Summary: How to Use Parallel Replicas for Faster Queries in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (parallel replicas feature)
- ClickHouse Keeper / ZooKeeper (cluster coordination)
- ClickHouse cluster configuration (remote_servers XML)
- ClickHouse system tables (system.query_log)

## Sources Consulted
- [ClickHouse Parallel Replicas Documentation](https://clickhouse.com/docs/deployment-guides/parallel-replicas)
- [Rework parallel replicas settings PR #63151](https://github.com/ClickHouse/ClickHouse/pull/63151) — merged September 2024, introduced `enable_parallel_replicas` and `parallel_replicas_mode` settings
- [CLI does not suggest newer names for settings — Issue #92190](https://github.com/ClickHouse/ClickHouse/issues/92190) — confirms `enable_parallel_replicas` is the current setting name
- [Set max_parallel_replicas default to 1000 — PR #74504](https://github.com/ClickHouse/ClickHouse/pull/74504)

## Issues Found

1. **Deprecated setting name used throughout the post**: The post used `allow_experimental_parallel_reading_from_replicas` which was renamed to `enable_parallel_replicas` in ClickHouse 24.10 (PR #63151, merged September 2024). Replaced all five occurrences with the current setting name.

2. **Overstatement about linear query time reduction**: The original text claimed parallel replicas reduce "query time linearly with the number of replicas used." This is an oversimplification — actual speedup depends on query type, data distribution, and coordination overhead. Changed to "can significantly reduce query time as more replicas are used."

3. **Outdated "experimental" limitation**: The original limitations section stated "Feature is experimental — test thoroughly before production use." The feature graduated from experimental status when the setting was renamed from `allow_experimental_*` to `enable_parallel_replicas`. Removed this limitation.

4. **Inaccurate claim about replica availability**: The original stated "Requires all replicas to be online and in sync." Per the official documentation, parallel replicas work with available replicas up to `max_parallel_replicas`; if fewer replicas are available, the query proceeds with fewer. Removed this misleading limitation.

5. **Missing known limitations**: Added two documented limitations that were absent: no support with the FINAL clause or projections, and the requirement for `enable_analyzer` to be enabled.

## Review Notes
- The `parallel_replicas_for_non_replicated_merge_tree` setting in the "Enabling" section is a valid setting, though it is not prominently featured in the current official documentation.
- The `system.query_log` query is correct — all referenced columns (`query`, `query_duration_ms`, `read_rows`, `read_bytes`) exist in that system table.
- The XML cluster configuration format is correct for ClickHouse `remote_servers` configuration.
- The `EXPLAIN PIPELINE` syntax and the guidance to look for `MergeTreeThread` or `RemoteSource` stages is accurate.
- The `cluster_for_parallel_replicas` setting name is correct per current documentation.
