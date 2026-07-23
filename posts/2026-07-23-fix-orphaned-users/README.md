# Fixing Orphaned SQL Server Users and SID Mismatches After a Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Security, Login, Database Restore, Access Control

Description: Detect database users whose login SIDs are missing or mismatched after restore and remap them without discarding existing permissions.

---

SQL Server authenticates a login at the instance level and authorizes a mapped user inside each database. The mapping is the security identifier (SID), not the shared display name.

A database restore moves database users and their SIDs, but it does not create the matching instance logins. Re-creating `AppLogin` by name on the destination normally gives a SQL-authenticated login a new SID, so the database user can remain orphaned even though both names look identical.

## Confirm the Problem Before Changing It

Run Microsoft's instance-authentication check in the restored user database:

```sql
USE Sales;
GO

SELECT
    dp.type_desc,
    dp.sid,
    dp.name AS user_name
FROM sys.database_principals AS dp
LEFT JOIN sys.server_principals AS sp
  ON dp.sid = sp.sid
WHERE sp.sid IS NULL
  AND dp.authentication_type_desc = 'INSTANCE';
```

This targets instance-authenticated users whose SID has no server-principal match. Catalog visibility depends on the caller's permissions, so run the diagnostic under an authorized security-administration context.

Compare names and SIDs explicitly:

```sql
SELECT
    dp.name AS database_user,
    sys.fn_varbintohexstr(dp.sid) AS user_sid,
    sp.name AS matching_login,
    sp.type_desc AS login_type
FROM sys.database_principals AS dp
LEFT JOIN sys.server_principals AS sp
  ON sp.sid = dp.sid
WHERE dp.principal_id > 4
ORDER BY dp.name;
```

An error 18456 or 4064 can have other causes, including a disabled login, wrong password, unavailable default database, denied connect permission, or network/authentication failure. Confirm the SID mismatch before remapping.

## Do Not “Fix” Intentional Principals

The database legitimately contains principals that do not map to instance logins:

- users created `WITHOUT LOGIN`;
- certificate- or asymmetric-key-based users;
- contained database users;
- system principals and roles;
- external principals whose mapping rules differ by platform.

Do not run a mass name-matching script across every row in `sys.database_principals`. Review the authentication type, user type, owner, role memberships, and application purpose.

## Case 1: The Correct Destination Login Already Exists

If the intended login exists with a different SID, remap the database user:

```sql
USE Sales;
GO
ALTER USER [AppUser] WITH LOGIN = [AppLogin];
```

`ALTER USER ... WITH LOGIN` changes the user's SID to match the login. It preserves the user principal and its database role memberships and direct permissions. It cannot be used to convert arbitrary principal types-for example, a certificate user into a SQL login.

Verify the mapping:

```sql
SELECT
    dp.name AS database_user,
    sp.name AS server_login,
    sys.fn_varbintohexstr(dp.sid) AS mapped_sid
FROM sys.database_principals AS dp
JOIN sys.server_principals AS sp
  ON sp.sid = dp.sid
WHERE dp.name = N'AppUser';
```

If one login is intended to map to a differently named user, retaining different names is valid. Avoid renaming a principal merely for visual symmetry when code or ownership depends on its current name.

## Case 2: The Login Is Missing but the Original SID Must Be Preserved

The best migration approach is to transfer SQL logins from the source with their SIDs and password hashes using Microsoft's documented login-transfer method. That prevents orphaning across all restored databases and avoids forcing password resets.

When the source is unavailable, you can create a SQL login with the database user's original SID, but a new secure password and policy decision are required:

```sql
-- Retrieve the exact SID from the restored database first.
USE Sales;
SELECT name, sys.fn_varbintohexstr(sid) AS sid_hex
FROM sys.database_principals
WHERE name = N'AppUser';
GO

USE master;
CREATE LOGIN [AppLogin]
WITH PASSWORD = N'<set-through-an-approved-secret-process>',
     SID = 0x0123456789ABCDEF0123456789ABCDEF,
     CHECK_POLICY = ON;
```

The hexadecimal SID is illustrative; use the exact reviewed value. Never place a real password in a shared migration script or shell history. Set default database, language, server permissions, and server-role membership deliberately-those are instance properties and were not restored with the user database.

For Windows logins, create the approved domain login or group. A domain principal normally carries its domain SID across servers in the same trusted identity system. A similarly named local Windows account on another host is a different principal.

## Case 3: The Destination Uses a Deliberately New Login

Create the new approved login, then remap the old user:

```sql
USE master;
CREATE LOGIN [SalesAppV2]
WITH PASSWORD = N'<set-through-an-approved-secret-process>',
     CHECK_POLICY = ON;
GO

USE Sales;
ALTER USER [AppUser] WITH LOGIN = [SalesAppV2];
```

Review whether the old user name should remain and whether application connection strings, auditing, ownership, or `EXECUTE AS` expectations require changes. Do not drop and recreate the database user unless necessary; doing so can discard direct grants and memberships that the existing user already holds.

## Avoid the Deprecated Procedure

Older runbooks use `sp_change_users_login` and its `Auto_Fix` action. Microsoft has deprecated this procedure and directs new work to `ALTER USER`. `Auto_Fix` also encourages name-based bulk action when the correct login and security intent should be reviewed explicitly.

Replace patterns such as:

```sql
EXEC sys.sp_change_users_login 'Update_One', 'AppUser', 'AppLogin';
```

with:

```sql
ALTER USER [AppUser] WITH LOGIN = [AppLogin];
```

## Validate Effective Access

After mapping:

1. connect through the actual application authentication path;
2. verify the login's default database is online and accessible;
3. inspect database roles and direct grants/denies;
4. test only the required read, write, and execute operations;
5. confirm ownership of schemas, jobs, and objects is intentional;
6. capture audit evidence without logging credentials.

Do not add the login to `sysadmin` or `db_owner` to make a test pass. That hides the missing permission and expands the impact of a compromised credential.

## Prevent the Next Restore Failure

Treat login transfer as part of backup, migration, and high-availability design. Keep a protected, current process for recreating logins with stable SIDs and password hashes, plus server roles and permissions. Availability groups replicate database users but do not automatically replicate instance logins or Agent jobs; provision the same login SID on every possible primary before failover.

Contained database users can improve portability in suitable designs, but they change authentication and have platform/configuration considerations. Evaluate them intentionally rather than converting production principals during an access incident.

Azure SQL Database and Microsoft Entra principals have different catalog and authentication behavior. Use the platform-specific detection procedure in Microsoft's orphaned-user guidance instead of assuming the instance query applies unchanged.

## Official Documentation

- [Troubleshoot orphaned users](https://learn.microsoft.com/en-us/sql/sql-server/failover-clusters/troubleshoot-orphaned-users-sql-server?view=sql-server-ver17)
- [ALTER USER](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-user-transact-sql?view=sql-server-ver17)
- [Transfer logins and passwords between SQL Server instances](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/security/transfer-logins-passwords-between-instances)
- [CREATE LOGIN](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-login-transact-sql?view=sql-server-ver17)
- [Make a database portable by using contained databases](https://learn.microsoft.com/en-us/sql/relational-databases/security/contained-database-users-making-your-database-portable?view=sql-server-ver17)
