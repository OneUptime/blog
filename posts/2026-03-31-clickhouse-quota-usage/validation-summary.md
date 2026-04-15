# Validation Summary: How to Use system.quota_usage in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (quota system, system tables)
- SQL (CREATE QUOTA DDL)
- ClickHouse XML configuration (users.xml quotas)

## Sources Consulted
- ClickHouse official docs — system.quota_usage: https://clickhouse.com/docs/en/operations/system-tables/quota_usage
- ClickHouse official docs — system.quotas_usage: https://clickhouse.com/docs/en/operations/system-tables/quotas_usage
- ClickHouse official docs — system.quotas: https://clickhouse.com/docs/en/operations/system-tables/quotas
- ClickHouse official docs — system.quota_limits: https://clickhouse.com/docs/en/operations/system-tables/quota_limits
- ClickHouse official docs — CREATE QUOTA: https://clickhouse.com/docs/en/sql-reference/statements/create/quota
- ClickHouse official docs — Quotas (XML config): https://clickhouse.com/docs/en/operations/quotas

## Issues Found

1. **XML keyed quota syntax was incorrect.** The blog used `<keyed_by_ip>true</keyed_by_ip>` but ClickHouse expects a self-closing empty element `<keyed_by_ip />`. Fixed the XML snippet.

2. **SQL `KEYED BY client_address` is not a valid key type.** The valid options are `user_name`, `ip_address`, `client_key`, `client_key,user_name`, `client_key,ip_address`, and `normalized_query_hash`. Changed to `KEYED BY ip_address`.

3. **CREATE QUOTA resource names used spaces instead of underscores.** The blog wrote `MAX READ ROWS`, `MAX READ BYTES`, `MAX EXECUTION TIME` as multi-word keywords, but ClickHouse uses underscore-separated identifiers: `read_rows`, `read_bytes`, `execution_time`. Also, the documented syntax uses a single `MAX` keyword followed by comma-separated `resource = value` pairs, not repeated `MAX` keywords. Fixed both CREATE QUOTA statements.

4. **Viewing Quota Assignments queried the wrong table.** The blog queried `system.quota_limits` for columns `apply_to_all`, `apply_to_list`, and `apply_to_except`, but those columns belong to `system.quotas`. The `system.quota_limits` table contains `quota_name`, `duration`, `is_randomized_interval`, and `max_*` limit columns. Changed the query to use `system.quotas` with the correct column name (`name AS quota_name`).

## Review Notes
- The system.quota_usage SELECT query lists a subset of available columns. The table actually has additional columns including `query_selects`, `max_query_selects`, `query_inserts`, `max_query_inserts`, `result_bytes`, `max_result_bytes`, `written_bytes`, `max_written_bytes`, `failed_sequential_authentications`, `max_failed_sequential_authentications`, `queries_per_normalized_hash`, and `max_queries_per_normalized_hash`. The subset shown is reasonable for a tutorial but readers should consult the docs for the full schema.
- The "Monitoring Quota Approaching Limits" query filters `WHERE max_queries > 0` which prevents division by zero for the `queries_pct` column, but `read_rows_pct` and `time_pct` could produce NULL if `max_read_rows` or `max_execution_time` are NULL/zero. Using `nullIf()` (as done in the "Practical Alert" section) would be more robust.
- The `system.quotas_usage` table has an additional `is_current` column (UInt8) not present in `system.quota_usage`, which indicates whether a row corresponds to the current user.
- The `system.quotas` table has more columns than shown in the "Listing All Defined Quotas" query (including `id`, `keys`, `durations`), but the subset shown is adequate for the tutorial context.
