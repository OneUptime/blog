# Validation Summary: How to Create Users and Roles in ClickHouse with SQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL-based access control)
- SQL (DDL/DCL statements: CREATE USER, CREATE ROLE, GRANT, REVOKE, ALTER USER, SET ROLE, DROP USER, DROP ROLE)
- ClickHouse system tables (system.users, system.roles, system.role_grants, system.grants)

## Sources Consulted
- ClickHouse CREATE USER documentation — https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse CREATE ROLE documentation — https://clickhouse.com/docs/en/sql-reference/statements/create/role
- ClickHouse GRANT documentation — https://clickhouse.com/docs/en/sql-reference/statements/grant
- ClickHouse ALTER USER documentation — https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse SET ROLE documentation — https://clickhouse.com/docs/en/sql-reference/statements/set-role
- ClickHouse REVOKE documentation — https://clickhouse.com/docs/en/sql-reference/statements/revoke
- ClickHouse DROP statements documentation — https://clickhouse.com/docs/en/sql-reference/statements/drop
- ClickHouse system.users table — https://clickhouse.com/docs/en/operations/system-tables/users
- ClickHouse system.roles table — https://clickhouse.com/docs/en/operations/system-tables/roles
- ClickHouse system.role_grants table — https://clickhouse.com/docs/en/operations/system-tables/role-grants
- ClickHouse system.grants table — https://clickhouse.com/docs/en/operations/system-tables/grants
- ClickHouse Access Control documentation — https://clickhouse.com/docs/operations/access-rights

## Issues Found
No technical issues found.

## Review Notes
- All authentication types (`sha256_password`, `bcrypt_password`, `double_sha1_password`, `no_password`) are valid and correctly documented.
- All HOST clause variants (`HOST IP`, `HOST NAME`, `HOST LOCAL`, `HOST ANY`) are correct. ClickHouse also supports `HOST REGEXP` and `HOST LIKE` which the post does not cover, but omission of optional features is not an error.
- The `DEFAULT DATABASE` clause in CREATE USER is correctly used.
- All GRANT/REVOKE syntax including `WITH ADMIN OPTION` is correct.
- `ALTER USER ... DEFAULT ROLE` syntax is correct.
- `SET ROLE` variants (`SET ROLE rolename`, `SET ROLE ALL`, `SET ROLE NONE`) are all valid.
- The `currentRoles()` function exists and returns `Array(String)` as expected.
- All system table columns referenced (`system.users`, `system.roles`, `system.role_grants`, `system.grants`) are verified to exist.
- The `ACCESS MANAGEMENT` privilege mentioned in prerequisites is the correct privilege for user/role management.
- The `GRANT ALL ON db.*` syntax note: `ALL` is not supported on ClickHouse Cloud where the default user has limited permissions. This is a minor caveat not mentioned in the post but not an error for self-hosted deployments.
