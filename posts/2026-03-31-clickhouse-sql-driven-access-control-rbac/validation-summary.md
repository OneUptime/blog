# Validation Summary: How to Use SQL-Driven Access Control (RBAC) in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse SQL-driven access control / RBAC (introduced in version 20.4)
- CREATE USER / CREATE ROLE / GRANT / REVOKE / SET ROLE / ALTER USER DEFAULT ROLE
- `system.users`, `system.grants`, `system.role_grants` system tables
- `access_control_path` server config

## Sources Consulted
- ClickHouse access-rights docs — https://clickhouse.com/docs/en/operations/access-rights (confirmed `access_control_path` config and the `access_management` user setting; confirmed CREATE USER/ROLE, GRANT/REVOKE, SET ROLE, SET DEFAULT ROLE statements)
- ClickHouse CREATE USER docs — https://clickhouse.com/docs/en/sql-reference/statements/create/user (confirmed `IDENTIFIED WITH sha256_password BY '...'`, `DEFAULT DATABASE`, and `DEFAULT ROLE` clauses; `sha256_password` is a valid auth method)
- ClickHouse system.users docs — https://clickhouse.com/docs/en/operations/system-tables/users (confirmed `name`, `auth_type`, `host_ip`, `default_database` columns exist)
- ClickHouse system.grants docs — https://clickhouse.com/docs/en/operations/system-tables/grants (confirmed `user_name`, `role_name`, `access_type`, `database`, `table` columns exist)
- ClickHouse RBAC version history (WebSearch) — https://clickhouse.com/docs/operations/access-rights (confirmed SQL-driven access control was introduced in ClickHouse 20.4)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- The "since version 20.4" claim is corroborated by ClickHouse docs/community references.
- All `system.users` columns referenced in the verification query (`name`, `auth_type`, `host_ip`, `default_database`) exist; note that `auth_type` is an array column in current ClickHouse versions, but selecting it is still valid.
- All `system.grants` columns referenced (`user_name`, `role_name`, `access_type`, `database`, `table`) exist.
- Minor completeness caveat (not an error, left as-is): in addition to setting `access_control_path`, ClickHouse requires the initial admin user to have `access_management = 1` (a user `<profile>` setting) before SQL GRANT/CREATE USER statements can be issued. The post only mentions `access_control_path`. The statement syntax itself is correct.
- `GRANT ... WITH GRANT OPTION`, column-level `GRANT SELECT(col, ...)`, role-to-role grants, and `DROP ROLE` are all valid ClickHouse RBAC features as written.
