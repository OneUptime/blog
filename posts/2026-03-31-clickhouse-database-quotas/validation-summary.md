# Validation Summary: How to Set Up Database-Level Quotas in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL DDL for access control: CREATE QUOTA, ALTER QUOTA, DROP QUOTA)
- ClickHouse system tables: `system.quotas`, `system.quota_limits`, `system.quota_usage`, `system.quotas_usage`, `system.query_log`
- Role-based access control (CREATE ROLE, GRANT)

## Sources Consulted
- ClickHouse CREATE QUOTA reference: https://clickhouse.com/docs/sql-reference/statements/create/quota
- ClickHouse ALTER QUOTA reference: https://clickhouse.com/docs/sql-reference/statements/alter/quota
- ClickHouse quotas operations guide: https://clickhouse.com/docs/operations/quotas
- `system.quota_usage` docs: https://clickhouse.com/docs/operations/system-tables/quota_usage
- `system.quotas_usage` docs: https://clickhouse.com/docs/operations/system-tables/quotas_usage
- `system.quotas` docs: https://clickhouse.com/docs/operations/system-tables/quotas
- `system.quota_limits` docs: https://clickhouse.com/docs/operations/system-tables/quota_limits
- ClickHouse source: `src/Common/ErrorCodes.cpp` (for QUOTA_EXCEEDED error code)
- ClickHouse source: `src/Parsers/Access/ParserCreateQuotaQuery.cpp` (for valid ALTER QUOTA grammar)
- ClickHouse source: `src/Parsers/Access/ParserRolesOrUsersSet.cpp` (for TO NONE validity)

## Issues Found

1. **Wrong QUOTA_EXCEEDED error code.** The post used `exception_code = 73` in the `system.query_log` query. Error code 73 is `UNKNOWN_FORMAT`; the correct code for `QUOTA_EXCEEDED` is `201`. Fixed to `201`.

2. **Non-existent `intervals` column in `system.quotas`.** The post queried `SELECT name, keys, intervals FROM system.quotas`. The actual column is `durations` (Array(UInt32)). Changed `intervals` to `durations`.

3. **Non-existent `user_name` column in `system.quota_usage`.** The post selected and ordered by a `user_name` column from `system.quota_usage`, but neither `system.quota_usage` nor `system.quotas_usage` have a `user_name` column — per-user identity is captured in `quota_key` (when the quota is `KEYED BY user_name`). Also, `system.quota_usage` only shows usage for the current user, so listing per-user rows requires `system.quotas_usage` (plural). Changed the monitoring query and the final verification query to use `system.quotas_usage`, removed `user_name`, and ordered by `quota_key`.

4. **Invalid `ADD FOR INTERVAL` syntax in ALTER QUOTA.** The post used `ALTER QUOTA ... ADD FOR INTERVAL 1 WEEK ...`. The ClickHouse parser does not support an `ADD` keyword here; adding a new interval is done with a plain `FOR INTERVAL` clause (a non-matching duration adds, a matching duration updates). Removed the `ADD` keyword.

5. **Invalid `DROP TO` syntax in ALTER QUOTA.** The post used `ALTER QUOTA analyst_quota DROP TO analyst`. The parser does not support `DROP TO`; the supported form is `TO {role [,...] | ALL | ALL EXCEPT role [,...] | NONE}`. Changed to `ALTER QUOTA analyst_quota TO NONE` (which clears the quota's applies-to set).

## Review Notes

- The post lists eight quota limit types (queries, errors, result_rows, result_bytes, read_rows, read_bytes, execution_time, failed_sequential_authentications). ClickHouse actually supports additional ones — `query_selects`, `query_inserts`, `written_bytes`, and `queries_per_normalized_hash`. The post's list is a reasonable subset, not incorrect.
- `KEYED BY` options shown (`user_name`, `ip_address`, `client_key`) are valid. ClickHouse also supports `client_key, user_name`, `client_key, ip_address`, and `normalized_query_hash`; omitting these is a stylistic choice, not a correctness issue.
- `execution_time` user input is in seconds (wall time), which matches the post's comments (e.g., "1 hour of total CPU per hour" for `= 3600`). Note the `system.quota_limits` docs page describes `max_execution_time` as nanoseconds — that appears to be a docs inconsistency; user-facing `MAX execution_time = N` is seconds.
- `CREATE QUOTA` without an explicit `ON CLUSTER` clause will only create the quota on the node it runs on; in a cluster deployment, `ON CLUSTER cluster_name` would typically be used. Not incorrect for a single-node example but worth knowing for production use.
