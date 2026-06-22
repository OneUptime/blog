# Validation Summary: How to Implement Row-Level Security in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse row policies
- ClickHouse SQL access control
- ClickHouse custom settings

## Sources Consulted
- ClickHouse Docs: CREATE ROW POLICY - https://clickhouse.com/docs/sql-reference/statements/create/row-policy
- ClickHouse Docs: ALTER ROW POLICY - https://clickhouse.com/docs/sql-reference/statements/alter/row-policy
- ClickHouse Docs: SHOW Statements / SHOW POLICIES - https://clickhouse.com/docs/sql-reference/statements/show
- ClickHouse Docs: Access control and account management - https://clickhouse.com/docs/operations/access-rights
- ClickHouse Docs: Query-level Session Settings / Custom settings - https://clickhouse.com/docs/operations/settings/query-level
- ClickHouse Docs: Other functions / currentUser and getSetting - https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse Docs: Type conversion functions / toUInt32 and toUInt64 - https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions

## Issues Found
- Replaced `currentUserId()` with `toUInt32(getSetting('SQL_current_tenant_id'))` and `toUInt64(getSetting('SQL_employee_id'))`. ClickHouse documents `currentUser()` for the current username and `getSetting()` for settings, but not a `currentUserId()` function.
- Changed custom setting names from `current_tenant_id` to `SQL_current_tenant_id`. ClickHouse custom settings must use an allowed prefix, and ClickHouse Cloud requires the `SQL_` prefix.
- Removed the duplicate `CREATE ROW POLICY tenant_policy` example and kept a single working tenant policy definition. Creating the same policy name twice on the same table would fail unless `OR REPLACE` or a different policy name is used.
- Added `GRANT SELECT ON tenant_data TO tenant_100, tenant_200;` so the tenant users can actually query the protected table under SQL-driven access control.

## Review Notes
Self-managed ClickHouse installations may need `custom_settings_prefixes` configured before using `SQL_` custom settings. Row policies are most effective for read-only users, as ClickHouse's official documentation notes that users who can modify tables can defeat row-policy restrictions.
