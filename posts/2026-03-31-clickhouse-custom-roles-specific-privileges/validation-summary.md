# Validation Summary: How to Create Custom Roles with Specific Privileges in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse RBAC (Role-Based Access Control)
- SQL GRANT/REVOKE statements
- ClickHouse system tables (`system.grants`, `system.role_grants`)

## Sources Consulted
- ClickHouse GRANT documentation: https://clickhouse.com/docs/en/sql-reference/statements/grant
- ClickHouse Access Rights and Account Management: https://clickhouse.com/docs/en/operations/access-rights
- ClickHouse CREATE USER documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse CREATE ROLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/role
- ClickHouse ALTER USER documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse SHOW GRANTS / SHOW ROLES documentation
- ClickHouse system tables reference (`system.grants`, `system.role_grants`)

## Issues Found
- **Invalid standalone `DELETE` and `UPDATE` privileges**: The "Privilege Categories" section listed `GRANT SELECT, INSERT, DELETE, UPDATE ON db.table TO role_name;`. ClickHouse does not have standalone `DELETE` or `UPDATE` privileges — they are only available as sub-privileges of `ALTER` (i.e., `ALTER DELETE` and `ALTER UPDATE`). Fixed by replacing with `GRANT SELECT, INSERT, ALTER DELETE, ALTER UPDATE ON db.table TO role_name;`.

## Review Notes
- All other SQL statements verified as valid ClickHouse syntax:
  - `CREATE ROLE`, `GRANT ... TO role`, role-to-role grants (hierarchy), and `GRANT ALL ... WITH GRANT OPTION` are correct.
  - `CREATE USER ... IDENTIFIED WITH sha256_password BY '...'` uses a valid authentication type.
  - `ALTER USER ... DEFAULT ROLE ...` is correct syntax.
  - Access-management privileges (`CREATE USER`, `ALTER USER`, `DROP USER`, `CREATE ROLE`, `ALTER ROLE`, `DROP ROLE`) are valid and granted with `ON *.*`.
  - `SYSTEM FLUSH LOGS` and `SYSTEM RELOAD CONFIG` are valid SYSTEM sub-privileges.
  - `system.role_grants` columns (`user_name`, `granted_role_name`) and `system.grants` columns (`user_name`, `role_name`, `access_type`, `database`, `table`) are correct.
  - `SHOW ROLES` and `SHOW GRANTS FOR <role>` are valid.
- `ALTER TABLE` as granted at database scope is valid and aggregates sub-privileges like `ALTER UPDATE`, `ALTER DELETE`, `ALTER COLUMN`, etc.
- Recommending `sha256_password` is reasonable, though modern ClickHouse also supports `bcrypt_password` which authors may prefer to mention in future revisions. No change required.
