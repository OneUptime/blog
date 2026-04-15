# Validation Summary: How to Configure ClickHouse max_memory_usage Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (query settings, server configuration, memory management)
- ClickHouse XML configuration format (users.xml / profiles)
- ClickHouse system tables (system.processes, system.query_log, system.metrics)

## Sources Consulted
- ClickHouse documentation — Restrictions on Query Complexity: https://clickhouse.com/docs/operations/settings/query-complexity
- ClickHouse documentation — Server Configuration Parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse documentation — Memory Overcommit: https://clickhouse.com/docs/operations/settings/memory-overcommit
- ClickHouse documentation — system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse documentation — system.processes: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse documentation — system.metrics: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse knowledge base — Finding Expensive Queries by Memory Usage: https://clickhouse.com/docs/knowledgebase/finding_expensive_queries_by_memory_usage
- ClickHouse source — CurrentMetrics.cpp: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/CurrentMetrics.cpp

## Issues Found

1. **Incorrect description of `memory_overcommit_ratio_denominator`**: The original post claimed this setting "allows up to 10% memory overcommit before failing," which is inaccurate. The setting is part of an experimental feature where ClickHouse computes an overcommit ratio (allocated bytes / denominator) for each query and, under global memory pressure, kills the query with the highest ratio — it does not define a fixed percentage threshold. Rewrote the section to accurately describe the mechanism and added a note that the feature is experimental.

2. **Misleading alias in system.query_log query**: The `memory_usage` column was aliased as `peak_memory`, implying it represents peak memory consumption. The ClickHouse documentation describes this column as "Memory consumption by the query" without confirming it is the peak value. Changed the alias from `peak_memory` to `memory_used` to avoid the misleading implication.

3. **Outdated system.metrics metric names**: The metric names `MemoryTrackingInBackgroundProcessingPool` and `MemoryTrackingInBackgroundMoveProcessingPool` no longer exist in current ClickHouse versions. They have been replaced by `MergesMutationsMemoryTracking`. Updated the query to use the current metric names.

## Review Notes
- All byte values in the post are mathematically correct (e.g., 4294967296 = 4 GiB, 10737418240 = 10 GiB, etc.).
- The error code 241 (`MEMORY_LIMIT_EXCEEDED`) is confirmed correct.
- The SQL syntax throughout the post is valid ClickHouse SQL.
- The XML configuration format is correct — server-level settings (`max_server_memory_usage`, `max_server_memory_usage_to_ram_ratio`) are properly shown at the top level, while per-query settings are correctly placed inside `<profiles>`.
- The default value of `max_server_memory_usage_to_ram_ratio` is 0.9 in current ClickHouse, so the post's recommended value of 0.80 is a reasonable conservative choice.
- The memory overcommit feature is experimental and may change in future ClickHouse releases; users should check the latest documentation before relying on it.
