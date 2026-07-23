# Validation Summary: Designing Least-Privilege SQL Server Roles for Applications and Administrators

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server
- Transact-SQL (T-SQL)
- SQL Server logins, database users, and user-defined roles
- Schema- and object-scoped permissions
- Ownership chaining, `EXECUTE AS`, and certificate-signed modules
- SQL Server Agent security
- SQL Server backup permissions
- Dynamic management views and SQL Server 2022 monitoring permissions
- SQL Server security catalog views and SQL Server Audit
- Always On availability group identity provisioning

## Sources Consulted

- [Get started with Database Engine permissions](https://learn.microsoft.com/en-us/sql/relational-databases/security/authentication-access/getting-started-with-database-engine-permissions?view=sql-server-ver17)
- [SQL Server security best practices](https://learn.microsoft.com/en-us/sql/relational-databases/security/sql-server-security-best-practices?view=sql-server-ver17)
- [Permissions (Database Engine)](https://learn.microsoft.com/en-us/sql/relational-databases/security/permissions-database-engine?view=sql-server-ver17)
- [CREATE LOGIN (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-login-transact-sql?view=sql-server-ver17)
- [CREATE USER (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql?view=sql-server-ver17)
- [CREATE ROLE (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-role-transact-sql?view=sql-server-ver17)
- [ALTER ROLE (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-role-transact-sql?view=sql-server-ver17)
- [GRANT schema permissions (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/grant-schema-permissions-transact-sql?view=sql-server-ver17)
- [GRANT object permissions (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/grant-object-permissions-transact-sql?view=sql-server-ver17)
- [GRANT database permissions (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/grant-database-permissions-transact-sql?view=sql-server-ver17)
- [BACKUP (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17)
- [System dynamic management views](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/system-dynamic-management-views?view=sql-server-ver17)
- [CREATE SERVER ROLE (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-server-role-transact-sql?view=sql-server-ver17)
- [ALTER SERVER ROLE (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-server-role-transact-sql?view=sql-server-ver17)
- [Server-level roles](https://learn.microsoft.com/en-us/sql/relational-databases/security/authentication-access/server-level-roles?view=sql-server-ver17)
- [EXECUTE AS (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/execute-as-transact-sql?view=sql-server-ver17)
- [Tutorial: Signing stored procedures with a certificate](https://learn.microsoft.com/en-us/sql/relational-databases/tutorial-signing-stored-procedures-with-a-certificate?view=sql-server-ver17)
- [TRUSTWORTHY database property](https://learn.microsoft.com/en-us/sql/relational-databases/security/trustworthy-database-property?view=sql-server-ver17)
- [sys.database_role_members (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-role-members-transact-sql?view=sql-server-ver17)
- [sys.database_permissions (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-permissions-transact-sql?view=sql-server-ver17)
- [Failover and failover modes for Always On availability groups](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/failover-and-failover-modes-always-on-availability-groups?view=sql-server-ver17)
- [SQL Server Agent overview](https://learn.microsoft.com/en-us/ssms/agent/sql-server-agent)

## Issues Found

- The principal chain was stated as though every SQL Server connection authenticates a server login. SQL Server also supports contained database users that authenticate at the database level. The sentence now scopes the login-to-user chain to login-based authentication.
- The deployment guidance referred to `CONTROL DATABASE` as though it were a permission name. The database permission is `CONTROL`; the text now says "`CONTROL` on the database."
- The deployment example did not identify an important security consequence of combining `ALTER` on a schema, permission to create modules, and permission to execute or select from those modules. When schemas share an owner, a deployment principal can use ownership chaining to reach objects in another same-owned schema. A concise warning to review schema ownership and the principal's other grants was added.
- The catalog query was introduced as listing explicit database permissions even though its `class_desc = 'SCHEMA'` filter returns only schema-class permissions. The label now says "explicit schema permissions."
- The catalog-query section did not warn that metadata visibility can restrict rows returned by `sys.database_role_members`, `sys.database_principals`, and `sys.database_permissions`. A warning to run the queries with sufficient metadata visibility was added.

## Review Notes

- The login, user, role, schema grant, object grant, backup grant, and server-role statements use documented, non-deprecated syntax. The snippets assume the named database, schemas, objects, Windows principals, and monitoring login exist where they are not created in the same example.
- The SQL Server 2022-or-later `VIEW SERVER PERFORMANCE STATE` example is correct for relevant performance DMVs. Exact DMV requirements still need to be checked because security-related server DMVs can require `VIEW SERVER SECURITY STATE`, and database-scoped DMVs use database-scoped state permissions.
- `BACKUP DATABASE` and `BACKUP LOG` are valid granular database permissions. A successful backup also depends on the database recovery model, backup target, and the SQL Server service account's access to that target.
- The post correctly notes that fixed-role permissions, Windows group expansion, ownership, impersonation, and signed-module identities are not fully represented by a single explicit-permissions query.
