# Validation Summary: How to Configure access_management in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL-driven access management)
- ClickHouse users.xml configuration
- ClickHouse DDL (CREATE USER, CREATE ROLE, GRANT, REVOKE, CREATE QUOTA, CREATE ROW POLICY, CREATE SETTINGS PROFILE)
- ClickHouse system tables (system.users)

## Sources Consulted
- ClickHouse Access Control and Account Management: https://clickhouse.com/docs/operations/access-rights
- CREATE USER: https://clickhouse.com/docs/sql-reference/statements/create/user
- CREATE ROLE: https://clickhouse.com/docs/sql-reference/statements/create/role
- CREATE QUOTA: https://clickhouse.com/docs/sql-reference/statements/create/quota
- CREATE ROW POLICY: https://clickhouse.com/docs/sql-reference/statements/create/row-policy
- GRANT: https://clickhouse.com/docs/sql-reference/statements/grant
- ALTER USER: https://clickhouse.com/docs/sql-reference/statements/alter/user
- SHOW statements: https://clickhouse.com/docs/sql-reference/statements/show
- DROP statements: https://clickhouse.com/docs/sql-reference/statements/drop
- system.users: https://clickhouse.com/docs/operations/system-tables/users
- Query Cache: https://clickhouse.com/docs/operations/query-cache

## Issues Found

1. **Storage layout claim was incorrect.** The original post showed `ls /var/lib/clickhouse/access/` producing typed subdirectories (`roles/`, `users/`, `quotas/`, `row_policies/`, `settings_profiles/`). ClickHouse's `local_directory` access storage actually stores each object as a flat UUID-named `.sql` file alongside `*.list` index files (e.g., `users.list`, `roles.list`). Updated the example to show the correct on-disk layout.

2. **`CREATE USER ... SETTINGS profile = 'analytics'` used the wrong form.** The documented DDL grammar for CREATE USER is `SETTINGS variable [= value] ... | PROFILE 'profile_name'`, so `PROFILE` is a distinct keyword, not a variable name. Changed to `SETTINGS PROFILE 'analytics'` to match the canonical syntax used later in the post for `ALTER USER ... SETTINGS PROFILE 'analytics_profile'`.

3. **Quota example used non-standard key names and a mismatched name.** The original used `MAX QUERIES = 1000, MAX READ ROWS = 10000000000, MAX EXECUTION TIME = 3600` with each limit prefixed by `MAX`. Per the documented grammar, a single `MAX` keyword precedes a comma-separated list of `key = value` pairs, and the documented keys are lowercase-underscored (`queries`, `read_rows`, `execution_time`). Also, the quota was named `daily_quota` but defined over `1 HOUR`. Fixed to: single `MAX queries = 1000, read_rows = 10000000000, execution_time = 3600` and renamed to `hourly_quota` (also updated the corresponding `DROP QUOTA` statement).

## Review Notes

- The row policy example uses `USING tenant_id = currentUser()`. This is valid SQL and the comment "Users can only see their own tenant's data" is consistent with the intent, but it only works correctly if tenant IDs literally equal ClickHouse usernames. In real deployments, you would typically compare against a mapping table or a user-level attribute rather than the username directly. This is a design caveat, not a syntax error.
- The `ALTER USER ... SETTINGS PROFILE 'name'` form used in the post is still accepted by ClickHouse, though newer releases also expose `ADD PROFILES` / `DROP PROFILES` modifiers on `ALTER USER` for additive changes. Kept the existing form as it remains valid and matches the tutorial's simpler assignment semantics.
- The migration checklist (section "Migrating from users.xml to SQL Access Management") is correct in spirit; note that XML-defined users and SQL-defined users can coexist, and ClickHouse will serve both from their respective storages.
- The post does not mention that when both a SQL-managed user and an XML-defined user share the same name, ClickHouse will refuse to start or error on conflict — worth a future caveat.
