# Validation Summary: How to Use system.quotas and system.quota_usage in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- system.quotas system table
- system.quota_usage system table
- system.quotas_usage system table
- system.quota_limits system table
- ClickHouse Access Control (CREATE QUOTA, ALTER QUOTA)

## Sources Consulted
- ClickHouse official documentation: system.quotas table (https://clickhouse.com/docs/en/operations/system-tables/quotas)
- ClickHouse official documentation: system.quota_usage table (https://clickhouse.com/docs/en/operations/system-tables/quota_usage)
- ClickHouse official documentation: system.quota_limits table (https://clickhouse.com/docs/en/operations/system-tables/quota_limits)
- ClickHouse official documentation: system.quotas_usage table (https://clickhouse.com/docs/en/operations/system-tables/quotas_usage)
- ClickHouse official documentation: CREATE QUOTA statement (https://clickhouse.com/docs/en/sql-reference/statements/create/quota)
- ClickHouse official documentation: ALTER QUOTA statement (https://clickhouse.com/docs/en/sql-reference/statements/alter/quota)

## Issues Found

1. **Wrong columns in system.quotas query**: The original query selected `max_queries`, `max_errors`, `max_result_rows`, `max_read_rows`, and `max_execution_time` from `system.quotas`. These columns do not exist in that table — they belong to `system.quota_limits`. The actual columns in `system.quotas` are `name`, `id`, `storage`, `keys`, `durations`, `apply_to_all`, `apply_to_list`, and `apply_to_except`. Fixed the query and key fields list, and added a note that limits are stored in `system.quota_limits`.

2. **Wrong column names in system.quota_usage query**: The columns `quota_start_time` and `quota_end_time` do not exist. The correct column names are `start_time` and `end_time`. Fixed both column references.

3. **Wrong table in "Monitoring All Users" section**: The text referenced `system.quota_limits` and `system.quotas_usage` but the query used `system.quota_limits`. The `system.quota_limits` table only stores configured limit definitions, not usage data. Changed the query to use `system.quotas_usage` (with 's'), which contains both usage counters and limits for all users. Updated the explanatory text accordingly.

4. **Wrong table in "Finding Users Near Their Limit" section**: Same issue — used `system.quota_limits` which lacks usage columns like `queries` and `quota_key`. Changed to `system.quotas_usage`.

5. **Invalid ALTER USER syntax for quota assignment**: `ALTER USER analyst DEFAULT QUOTA analyst_quota` is not valid ClickHouse syntax. Quotas are assigned via the `TO` clause of `CREATE QUOTA` or `ALTER QUOTA`, not through `ALTER USER`. Changed to `ALTER QUOTA analyst_quota TO analyst`.

6. **Invalid ALTER ROLE syntax for quota assignment**: `ALTER ROLE data_analyst SETTINGS PROFILE 'restricted'` does not apply a quota — it attempts to apply a settings profile, which is a different access control entity. Changed to `ALTER QUOTA analyst_quota TO data_analyst`.

7. **Nonsensical quota-to-user mapping query**: The query joined `system.user_directories` with `system.quotas` using `ON true`, which produces a useless cross join. `system.user_directories` only describes access storage backends and has no user or quota identifiers. Replaced with a query on `system.quotas` selecting `apply_to_list`, `apply_to_except`, and `apply_to_all`, which is the correct way to view quota assignments. Also added `SHOW CREATE QUOTA` as an alternative.

## Review Notes
- The `system.quotas_usage` table (with 's') is distinct from `system.quota_usage` (without 's'). The former shows usage for all users; the latter only for the current user. The post now correctly uses each where appropriate.
- The `execution_time` column in system tables is stored as Float64 in nanoseconds, but in SQL statements (CREATE QUOTA / ALTER QUOTA), it is specified in seconds.
- The CREATE QUOTA syntax in the post is acceptable — ClickHouse allows both `MAX queries = 1000, MAX read_rows = 100000000` and `MAX queries = 1000, read_rows = 100000000` forms.
