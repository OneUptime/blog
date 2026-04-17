# Validation Summary: How to Create a Role in ClickHouse for Access Control

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (RBAC, SQL DDL/DCL)
- SQL (CREATE ROLE, GRANT, REVOKE, SET ROLE, ALTER USER, CREATE USER, SHOW GRANTS, DROP ROLE)
- ClickHouse system tables (`system.roles`, `system.role_grants`, `system.grants`)

## Sources Consulted
- ClickHouse CREATE ROLE docs: https://clickhouse.com/docs/en/sql-reference/statements/create/role
- ClickHouse GRANT docs: https://clickhouse.com/docs/en/sql-reference/statements/grant
- ClickHouse SET ROLE docs: https://clickhouse.com/docs/en/sql-reference/statements/set-role
- ClickHouse CREATE USER docs: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse ALTER USER docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse SHOW docs: https://clickhouse.com/docs/en/sql-reference/statements/show
- ClickHouse system.role_grants docs: https://clickhouse.com/docs/en/operations/system-tables/role-grants
- ClickHouse system.grants docs: https://clickhouse.com/docs/en/operations/system-tables/grants

## Issues Found
- **Incorrect column name in `system.role_grants` query**: The post referenced `is_default`, but the actual column is `granted_role_is_default`. Fixed the `SELECT` to use the correct column name, and added `granted_role_name` so the query returns meaningful role-membership information (the granted role is represented by `granted_role_name`, not `role_name`).

## Review Notes
- The `CREATE ROLE` syntax block simplifies the `SETTINGS` constraint keywords to `[READONLY | WRITABLE]`; the full set in the official docs is `[CONST | READONLY | WRITABLE | CHANGEABLE_IN_READONLY]`. This is a common simplification and not incorrect, so it was left as-is.
- The post correctly uses `WITH ADMIN OPTION` (for role grants) rather than `WITH GRANT OPTION` (for privilege grants), which is the right ClickHouse distinction.
- `SHOW GRANTS FOR analyst` is valid — ClickHouse accepts both users and roles in the `SHOW GRANTS FOR` clause, even though the official docs phrase it as "for users."
- `ALTER USER ... DEFAULT ROLE NONE` is accepted by ClickHouse in practice, matching the grammar shared with `SET DEFAULT ROLE`, even though the `ALTER USER` docs page focuses on `role`, `ALL`, and `ALL EXCEPT` variants.
- All GRANT/REVOKE examples, privilege names (`SELECT`, `INSERT`, `CREATE TABLE`, `DROP TABLE`, `CREATE VIEW`, `DROP VIEW`, `ALL`, `SYSTEM RELOAD DICTIONARY`, `SYSTEM FLUSH LOGS`, `KILL QUERY`), and system-table queries against `system.roles` and `system.grants` are accurate.
