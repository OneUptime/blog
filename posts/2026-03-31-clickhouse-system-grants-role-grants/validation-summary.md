# Validation Summary: How to Use system.grants and system.role_grants in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system tables, SQL-based access control)
- system.grants table
- system.role_grants table
- system.roles table

## Sources Consulted
- ClickHouse official documentation: system.grants (https://clickhouse.com/docs/en/operations/system-tables/grants)
- ClickHouse official documentation: system.role_grants (https://clickhouse.com/docs/en/operations/system-tables/role-grants)
- ClickHouse official documentation: system.roles (https://clickhouse.com/docs/en/operations/system-tables/roles)

## Issues Found
1. **system.role_grants description was incomplete**: The blog stated that `system.role_grants` "shows which roles have been assigned to users," but roles can also be granted to other roles. Updated the description to "shows which roles have been assigned to users or to other roles."
2. **Missing `role_name` column in system.role_grants**: The `role_name` column (Nullable String) was not listed in the key columns for `system.role_grants`. This column is important because it indicates when a role is granted to another role rather than to a user. Added `role_name` with description to the key columns list.

## Review Notes
- The blog intentionally lists "Key columns" rather than all columns for each table. Some columns are omitted (`access_object` in system.grants, `granted_role_id` in system.role_grants, `storage` in system.roles) but since the blog does not claim to be exhaustive, these omissions are acceptable.
- The UNION ALL query in the "Full Access Audit per User" section is syntactically valid — ClickHouse uses column names from the first SELECT for ORDER BY in UNION ALL queries.
- All SQL queries are syntactically correct and would execute properly on a ClickHouse instance with SQL-based access control enabled.
