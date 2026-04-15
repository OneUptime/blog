# Validation Summary: How to Monitor ClickHouse CPU Usage Per Query

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system.query_log, system.processes, ProfileEvents)
- SQL (ClickHouse dialect)
- ClickHouse Access Control (Settings Profiles, ALTER USER)

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.processes documentation: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse ProfileEvents source code: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp
- ClickHouse SQL syntax (aliases): https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse CREATE SETTINGS PROFILE: https://clickhouse.com/docs/sql-reference/statements/create/settings-profile
- ClickHouse ALTER USER: https://clickhouse.com/docs/sql-reference/statements/alter/user
- ClickHouse Settings (max_execution_time, max_threads): https://clickhouse.com/docs/operations/settings/settings-profiles

## Issues Found

1. **Incorrect description of OSCPUVirtualTimeMicroseconds scope (line 34)**: The post said "CPU time consumed by the query thread" (singular). In `system.query_log`, ProfileEvents are aggregated across all threads participating in the query, not a single thread. Changed "the query thread" to "all query threads".

2. **Incorrect CPU efficiency explanation (line 56)**: The post claimed that a `cpu_efficiency` value (ratio of `OSCPUVirtualTimeMicroseconds` to `RealTimeMicroseconds`) above 1.0 indicates multi-core parallelism. This is incorrect because both `OSCPUVirtualTimeMicroseconds` and `RealTimeMicroseconds` are sums across all threads in `system.query_log`. The `RealTimeMicroseconds` description in ClickHouse source explicitly states "note that this is a sum." Since both are sums across threads, the ratio represents average per-thread CPU utilization and is always between 0 and 1. Fixed the explanation to clarify the correct interpretation and noted that comparing `OSCPUVirtualTimeMicroseconds` to `query_duration_ms * 1000` is the correct way to detect parallelism.

## Review Notes
- All ProfileEvents keys (`OSCPUVirtualTimeMicroseconds`, `OSCPUWaitMicroseconds`, `RealTimeMicroseconds`) are valid and correctly named.
- All `system.query_log` and `system.processes` column names are correct.
- ClickHouse's non-standard SQL feature of referencing column aliases within the same SELECT clause is correctly used throughout.
- The `CREATE SETTINGS PROFILE` and `ALTER USER ... SETTINGS PROFILE` syntax are both valid ClickHouse SQL.
- The `max_execution_time` and `max_threads` settings are valid for use in settings profiles.
