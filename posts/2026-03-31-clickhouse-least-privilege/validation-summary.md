# Validation Summary: How to Implement Principle of Least Privilege in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (SQL-based access control / RBAC)
- ClickHouse Row Policies
- ClickHouse Settings Profiles
- ClickHouse Column-Level Grants

## Sources Consulted
- ClickHouse documentation: CREATE ROLE — https://clickhouse.com/docs/en/sql-reference/statements/create/role
- ClickHouse documentation: GRANT — https://clickhouse.com/docs/en/sql-reference/statements/grant
- ClickHouse documentation: CREATE USER — https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse documentation: CREATE ROW POLICY — https://clickhouse.com/docs/en/sql-reference/statements/create/row-policy
- ClickHouse documentation: CREATE SETTINGS PROFILE — https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse documentation: system.users table — https://clickhouse.com/docs/en/operations/system-tables/users
- ClickHouse documentation: system.role_grants table — https://clickhouse.com/docs/en/operations/system-tables/role-grants
- Cross-referenced with existing validated blog posts on ClickHouse RBAC, row policies, and access control in this repository

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and current for ClickHouse's SQL-driven access control system.
- `CREATE ROLE`, `GRANT`, `REVOKE`, `DROP ROLE`, `CREATE ROW POLICY`, `CREATE SETTINGS PROFILE`, and `ALTER USER` statements all use valid syntax.
- The `system.users` columns (`name`, `storage`, `default_roles_all`, `default_roles_list`) and `system.role_grants` columns (`user_name`, `granted_role_name`, `with_admin_option`) are accurate.
- Column-level `GRANT SELECT(col1, col2, ...) ON db.table TO role` syntax is correct.
- The `CREATE SETTINGS PROFILE` with `MAX` constraint syntax is valid for enforcing upper bounds on settings.
- The `currentUser()` function used in the row policy example is a valid ClickHouse function that returns the current user's name. The example assumes tenant_id values match user names, which is a reasonable illustration pattern.
- The quarterly access review query correctly uses `LEFT JOIN` between `system.users` and `system.role_grants` with `groupArray()` aggregation.
