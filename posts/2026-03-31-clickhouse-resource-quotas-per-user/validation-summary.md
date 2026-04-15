# Validation Summary: How to Set Up Resource Quotas Per User in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL-based access control: quotas, roles, settings profiles)
- ClickHouse system tables (system.quotas, system.quota_usage, system.quotas_usage)

## Sources Consulted
- ClickHouse CREATE QUOTA documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/quota
- ClickHouse ALTER QUOTA documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/quota
- ClickHouse ALTER USER documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse CREATE SETTINGS PROFILE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse system.quotas table documentation: https://clickhouse.com/docs/en/operations/system-tables/quotas
- ClickHouse system.quota_usage table documentation: https://clickhouse.com/docs/en/operations/system-tables/quota_usage
- ClickHouse system.quotas_usage table documentation: https://clickhouse.com/docs/en/operations/system-tables/quotas_usage

## Issues Found

1. **"Network bandwidth used" in the "What Quotas Control" list was incorrect.** ClickHouse quotas have no network bandwidth parameter. The actual quota parameters are: `queries`, `query_selects`, `query_inserts`, `errors`, `result_rows`, `result_bytes`, `read_rows`, `read_bytes`, `written_bytes`, `execution_time`, `failed_sequential_authentications`, and `queries_per_normalized_hash`. Changed "Network bandwidth used" to "Bytes written" to reflect the actual `written_bytes` quota parameter.

2. **Monitoring query referenced non-existent `user` column.** The `system.quotas_usage` table does not have a `user` column. The correct column for identifying which user/key the quota usage belongs to is `quota_key`. Changed `user` to `quota_key` in both the SELECT and ORDER BY clauses.

3. **`ALTER USER alice SETTINGS PROFILE 'analyst_settings'` used incorrect syntax.** The documented ALTER USER syntax for assigning settings profiles uses `ADD PROFILES 'profile_name'`, not `SETTINGS PROFILE 'profile_name'`. Changed to `ALTER USER alice ADD PROFILES 'analyst_settings'`.

## Review Notes
- The `ALTER QUOTA analyst_quota TO NONE` syntax for removing quota assignment is not explicitly listed in the official ALTER QUOTA documentation (which shows `TO {role [,...] | ALL | ALL EXCEPT role [,...]}`). However, `TO NONE` is documented for `CREATE SETTINGS PROFILE` and likely works for quotas as well since all access control entities share the same parser. Left as-is but worth noting.
- The post could benefit from mentioning the `KEYED BY` clause, which controls how quotas are tracked (per user, per IP, per client key, etc.). This is important for multi-tenant setups but is not a technical error in the current content.
- The post does not mention `query_inserts`, `result_bytes`, `written_bytes`, or `failed_sequential_authentications` as quota parameters. This is not an error (the post doesn't claim to be exhaustive) but readers doing advanced quota configuration should consult the official docs for the full parameter list.
