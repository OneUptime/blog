# Validation Summary: How to Fix Memory Limit Exceeded Errors in ClickHouse

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL
- ClickHouse system tables
- ClickHouse server and user profile XML configuration

## Sources Consulted
- ClickHouse Session Settings: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse Server Settings: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse Restrictions on Query Complexity: https://clickhouse.com/docs/operations/settings/query-complexity
- ClickHouse Memory Limit Exceeded Knowledge Base: https://clickhouse.com/docs/knowledgebase/memory-limit-exceeded-for-query
- ClickHouse GROUP BY Clause: https://clickhouse.com/docs/sql-reference/statements/select/group-by
- ClickHouse JOIN Clause: https://clickhouse.com/docs/sql-reference/statements/select/join
- ClickHouse CREATE QUOTA: https://clickhouse.com/docs/sql-reference/statements/create/quota
- ClickHouse system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.metrics: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse system.metric_log: https://clickhouse.com/docs/operations/system-tables/metric_log
- ClickHouse system.asynchronous_metric_log: https://clickhouse.com/docs/operations/system-tables/asynchronous_metric_log
- ClickHouse KILL statements: https://clickhouse.com/docs/sql-reference/statements/kill
- ClickHouse 2020 Changelog note for max_memory_usage_for_all_queries: https://clickhouse.com/docs/whats-new/changelog/2020

## Issues Found
- Removed `max_memory_usage_for_all_queries` from the memory hierarchy and server configuration because ClickHouse documentation notes that this setting is obsolete and does nothing.
- Replaced `peak_memory_usage` references in `system.query_log` examples with `memory_usage`, matching the current documented `system.query_log` columns.
- Clarified that external aggregation spills when `max_bytes_before_external_group_by` is reached, not only when the overall memory limit is reached.
- Added a sampling caveat that `SAMPLE` applies to tables configured with `SAMPLE BY`.
- Corrected the multi-disk temporary storage example to use a storage policy plus `tmp_policy`, and removed the conflicting `tmp_path`.
- Corrected the historical memory monitoring query to use `system.metric_log` and `CurrentMetric_MemoryTracking` instead of `system.asynchronous_metric_log` with `metric = 'MemoryTracking'`.
- Fixed the `CREATE QUOTA` example syntax so multiple limits are listed under one `MAX` clause.

## Review Notes
The examples are general-purpose and assume tables such as `events` and `users` exist with compatible schemas. Some operational settings and system tables vary by ClickHouse deployment and Cloud versus self-managed environments, but the corrected examples now align with current official documentation.
