# Validation Summary: How to Use system.role_grants in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system tables, RBAC, SQL)
- ClickHouse Access Control (roles, grants, revokes)
- ClickHouse system.role_grants table
- ClickHouse system.query_log table

## Sources Consulted
- ClickHouse system.role_grants documentation: https://clickhouse.com/docs/operations/system-tables/role_grants
- ClickHouse GRANT statement documentation: https://clickhouse.com/docs/sql-reference/statements/grant
- ClickHouse REVOKE statement documentation: https://clickhouse.com/docs/sql-reference/statements/revoke
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.current_roles documentation: https://clickhouse.com/docs/operations/system-tables/current_roles
- ClickHouse system.enabled_roles documentation: https://clickhouse.com/docs/operations/system-tables/enabled_roles
- ClickHouse CREATE ROLE documentation: https://clickhouse.com/docs/sql-reference/statements/create/role

## Issues Found
No technical issues found.

## Review Notes
- The `system.role_grants` table also has a `granted_role_id` (UUID) column not mentioned in the post. This is a minor omission, not an error — the post covers the most relevant columns for auditing purposes.
- The claim that "ClickHouse does not provide a built-in recursive role resolution query" is reasonable and not contradicted by official documentation, though it is not explicitly stated in the docs either. The two-level JOIN workaround shown in the post is a valid approach.
- All SQL syntax (CREATE ROLE, GRANT, REVOKE, SELECT queries) is correct and uses current ClickHouse conventions.
- All referenced system tables (system.grants, system.roles, system.users, system.current_roles, system.enabled_roles) exist in ClickHouse.
- The system.query_log query for auditing role changes correctly uses `type = 'QueryFinish'`, `event_time`, `user`, `query`, and `event_date` columns.
