# Validation Summary: Fixing Orphaned SQL Server Users and SID Mismatches After a Restore

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Microsoft SQL Server
- Transact-SQL (T-SQL)
- SQL Server authentication and Windows authentication
- Database users, server logins, and security identifiers (SIDs)
- Database backup and restore
- Always On availability groups
- Contained databases
- Azure SQL Database
- Microsoft Entra authentication

## Sources Consulted
- Microsoft Learn — Troubleshoot orphaned users: https://learn.microsoft.com/en-us/sql/sql-server/failover-clusters/troubleshoot-orphaned-users-sql-server?view=sql-server-ver17
- Microsoft Learn — ALTER USER (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-user-transact-sql?view=sql-server-ver17
- Microsoft Learn — CREATE LOGIN (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/create-login-transact-sql?view=sql-server-ver17
- Microsoft Learn — Transfer logins and passwords between instances of SQL Server: https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/security/transfer-logins-passwords-between-instances
- Microsoft Learn — sp_change_users_login (Transact-SQL): https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-change-users-login-transact-sql?view=sql-server-ver17
- Microsoft Learn — sys.database_principals (Transact-SQL): https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-principals-transact-sql?view=sql-server-ver17
- Microsoft Learn — sys.server_principals (Transact-SQL): https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-server-principals-transact-sql?view=sql-server-ver17
- Microsoft Learn — MSSQLSERVER_18456: https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/mssqlserver-18456-database-engine-error?view=sql-server-ver17
- Microsoft Learn — MSSQLSERVER_4064: https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/mssqlserver-4064-database-engine-error?view=sql-server-ver17
- Microsoft Learn — Manage logins for jobs using databases in an Always On availability group: https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/logins-and-jobs-for-availability-group-databases?view=sql-server-ver17
- Microsoft Learn — Make your database portable by using contained databases: https://learn.microsoft.com/en-us/sql/relational-databases/security/contained-database-users-making-your-database-portable?view=sql-server-ver17
- Microsoft Learn — Cumulative update 12 for SQL Server 2022 (KB5033663): https://learn.microsoft.com/en-us/troubleshoot/sql/releases/sqlserver-2022/cumulativeupdate12

## Issues Found
- The “Make a database portable by using contained databases” link pointed to Microsoft Learn's separate “Security Best Practices with Contained Databases” page. Updated the URL to the official portability page that matches the link text and the post's portability guidance.

## Review Notes
- The orphan-detection query matches Microsoft's current SQL Server guidance, and the post correctly distinguishes instance-authenticated users from intentional loginless, contained, certificate-based, asymmetric-key-based, system, and external principals.
- The `ALTER USER ... WITH LOGIN` and `CREATE LOGIN ... SID` examples use current supported syntax. The guidance to preserve the existing database user also correctly avoids discarding its role memberships and direct permissions.
- The warning against `sp_change_users_login` is current: Microsoft marks it for future removal and recommends `ALTER USER`.
- SQL Server 2025 uses PBKDF-based password hashes. When transferring password hashes to an older SQL Server target, verify that the target release and patch level support the source hash format; SQL Server 2022 added support for iterated and salted password verifiers in CU12.
