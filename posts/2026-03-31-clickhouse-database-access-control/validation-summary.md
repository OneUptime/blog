# Validation Summary: How to Set Up Database-Level Access Control in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL-based access control)
- ClickHouse system tables (`system.users`, `system.roles`, `system.role_grants`, `system.grants`, `system.row_policies`, `system.quotas_usage`, `system.query_log`)
- ClickHouse DDL: CREATE USER, CREATE ROLE, GRANT, REVOKE, CREATE ROW POLICY, CREATE QUOTA, CREATE SETTINGS PROFILE
- XML server configuration (users.xml, `access_management` flag)

## Sources Consulted
- ClickHouse SQL Reference – CREATE USER: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse SQL Reference – CREATE ROLE: https://clickhouse.com/docs/en/sql-reference/statements/create/role
- ClickHouse SQL Reference – CREATE ROW POLICY: https://clickhouse.com/docs/en/sql-reference/statements/create/row-policy
- ClickHouse SQL Reference – CREATE QUOTA: https://clickhouse.com/docs/en/sql-reference/statements/create/quota
- ClickHouse SQL Reference – CREATE SETTINGS PROFILE: https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse system tables:
  - https://clickhouse.com/docs/en/operations/system-tables/users
  - https://clickhouse.com/docs/en/operations/system-tables/role-grants
  - https://clickhouse.com/docs/en/operations/system-tables/row_policies
  - https://clickhouse.com/docs/en/operations/system-tables/quota_usage
  - https://clickhouse.com/docs/en/operations/system-tables/quotas_usage
- ClickHouse access control docs: https://clickhouse.com/docs/en/operations/access-rights

## Issues Found

1. **`system.role_grants` query used non-informative column** — the original query selected `user_name, role_name` to show role assignments, but `role_name` in this table identifies the grantee when a role has been granted another role; the granted role is in `granted_role_name`. Changed the query to select `user_name, granted_role_name`, which matches the stated intent ("view role assignments").

2. **`system.row_policies` used a non-existent `roles` column** — the table has no `roles` column; the equivalent is `apply_to_list` (Array(String)). Replaced `roles` with `apply_to_list`.

3. **`system.quota_usage` query referenced a non-existent `user_name` column** — `system.quota_usage` exposes the current user's quota only and has no `user_name` column. To show consumption across users, the table must be `system.quotas_usage` (plural) and the per-user identifier is `quota_key`. Updated the query to select `quota_key` from `system.quotas_usage`.

## Review Notes

- The `CREATE USER ... IDENTIFIED WITH sha256_password BY ...`, `bcrypt_password`, `HOST IP`, and `HOST ANY` syntax is correct and current.
- GRANT / REVOKE / DROP syntax and `SET DEFAULT ROLE ... TO ...` are correct.
- `GRANT ACCESS MANAGEMENT ON *.*` is valid; note that in practice granular privileges such as `CREATE USER`, `ALTER USER`, `CREATE ROLE`, `GRANT`, etc. can also be granted individually for finer-grained DBA delegation.
- The `toUInt64(currentUser())` example in the `own_data_policy` row policy assumes usernames are numeric strings — it is syntactically valid but will throw at query time if usernames are non-numeric. The author's intent is illustrative; a mapping dictionary (like the first example) is typically the real-world pattern.
- The `access_management` flag in `users.xml` is accurate for on-prem installs. For ClickHouse Cloud, access management is handled via the Cloud console/API and the XML step does not apply.
- SQL-driven access control was introduced earlier than 20.4 (in experimental form around 19.12+), but it became the recommended / stable mechanism around the 20.x line; the post's phrasing is acceptable.
- Column types in `system.query_log.type` (`QueryStart`, `QueryFinish`, `ExceptionBeforeStart`, `ExceptionWhileProcessing`) are correct.
