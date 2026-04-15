# Validation Summary: How to Use Query Complexity Settings in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (query complexity settings, user profiles, quotas)
- SQL (SET statements, CREATE QUOTA, SELECT from system tables)
- ClickHouse XML configuration (profiles)

## Sources Consulted
- ClickHouse Query Complexity Settings documentation: https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse Settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse Memory Overcommit documentation: https://clickhouse.com/docs/en/operations/settings/memory-overcommit
- ClickHouse CREATE QUOTA syntax: https://clickhouse.com/docs/en/sql-reference/statements/create/quota
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found

1. **`max_distributed_query_wait_time` is not a valid ClickHouse setting.** The post included `SET max_distributed_query_wait_time = 10;` with the comment "Timeout for network-bound parts of distributed queries." This setting does not exist in ClickHouse's settings reference or query complexity documentation. Removed the line entirely since `max_execution_time` already covers execution time limits and there is no direct equivalent setting for distributed query wait time.

2. **Misleading comment on `memory_overcommit_ratio_denominator`.** The original comment said "Allow exceeding the limit temporarily before throwing," which is inaccurate. This setting is actually the denominator used to calculate each query's overcommit ratio (allocated_bytes / denominator). When ClickHouse exceeds memory limits, it terminates the query with the highest overcommit ratio. Updated the comment to accurately describe this behavior.

## Review Notes
- All other settings (`max_execution_time`, `max_memory_usage`, `max_rows_to_read`, `max_bytes_to_read`, `read_overflow_mode`, `max_result_rows`, `max_result_bytes`, `result_overflow_mode`, `max_rows_in_join`, `max_bytes_in_join`, `join_overflow_mode`) are valid and correctly described.
- The overflow_mode options (`throw` and `break`) are correct for the settings discussed. Note that `any` is also a valid overflow mode but only for `group_by_overflow_mode`, which is not covered in this post.
- The XML profile configuration format is correct for ClickHouse.
- The `system.query_log` query uses valid column names (query_id, user, query_duration_ms, read_rows, memory_usage, exception, event_date).
- The `CREATE QUOTA` syntax is correct per ClickHouse documentation.
