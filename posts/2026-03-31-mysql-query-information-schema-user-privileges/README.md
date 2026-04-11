# How to Query INFORMATION_SCHEMA.USER_PRIVILEGES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Security, Privilege, Database Administration

Description: Learn how to query INFORMATION_SCHEMA.USER_PRIVILEGES in MySQL to audit global privileges granted directly to user accounts.

---

## What Is INFORMATION_SCHEMA.USER_PRIVILEGES?

The `INFORMATION_SCHEMA.USER_PRIVILEGES` table lists global privileges that have been granted to MySQL user accounts. It reflects the contents of the `mysql.user` system table but in a standard SQL-queryable format. Each row represents one privilege for one user. This view is useful for security audits and access reviews.

Note that `USER_PRIVILEGES` shows only global-level privileges. Schema-level privileges appear in `SCHEMA_PRIVILEGES`, and table-level privileges appear in `TABLE_PRIVILEGES`.

## Columns in USER_PRIVILEGES

- `GRANTEE` - the user in `'user'@'host'` format
- `TABLE_CATALOG` - always `def`
- `PRIVILEGE_TYPE` - the name of the privilege (e.g., `SELECT`, `SUPER`, `REPLICATION SLAVE`)
- `IS_GRANTABLE` - `YES` if the user can grant this privilege to others

## List All Global Privileges

```sql
SELECT
    GRANTEE,
    PRIVILEGE_TYPE,
    IS_GRANTABLE
FROM INFORMATION_SCHEMA.USER_PRIVILEGES
ORDER BY GRANTEE, PRIVILEGE_TYPE;
```

## Find Users with the SUPER Privilege

When `ALL PRIVILEGES` is granted, each privilege appears as individual rows in `USER_PRIVILEGES` rather than a single `ALL PRIVILEGES` entry. To find users with the `SUPER` privilege:

```sql
SELECT DISTINCT GRANTEE
FROM INFORMATION_SCHEMA.USER_PRIVILEGES
WHERE PRIVILEGE_TYPE = 'SUPER';
```

## Find Users Who Can Grant Privileges

```sql
SELECT GRANTEE, PRIVILEGE_TYPE
FROM INFORMATION_SCHEMA.USER_PRIVILEGES
WHERE IS_GRANTABLE = 'YES'
ORDER BY GRANTEE;
```

## Audit Sensitive Privileges

Some privileges are particularly dangerous and should be granted sparingly:

```sql
SELECT GRANTEE, PRIVILEGE_TYPE
FROM INFORMATION_SCHEMA.USER_PRIVILEGES
WHERE PRIVILEGE_TYPE IN (
    'SUPER',
    'SHUTDOWN',
    'PROCESS',
    'REPLICATION SLAVE',
    'REPLICATION CLIENT',
    'FILE',
    'CREATE USER'
)
ORDER BY GRANTEE, PRIVILEGE_TYPE;
```

## Count Privileges Per User

```sql
SELECT
    GRANTEE,
    COUNT(*) AS privilege_count
FROM INFORMATION_SCHEMA.USER_PRIVILEGES
GROUP BY GRANTEE
ORDER BY privilege_count DESC;
```

## Comparing with SHOW GRANTS

The `INFORMATION_SCHEMA` approach is preferred for scripting because the output is structured. The equivalent imperative command is:

```sql
SHOW GRANTS FOR 'someuser'@'localhost';
```

But to audit all users at once, `USER_PRIVILEGES` is far more practical.

## Joining with SCHEMA_PRIVILEGES for Full Picture

To build a comprehensive access report, join multiple privilege tables:

```sql
SELECT
    up.GRANTEE,
    'GLOBAL' AS level,
    up.PRIVILEGE_TYPE
FROM INFORMATION_SCHEMA.USER_PRIVILEGES up
UNION ALL
SELECT
    sp.GRANTEE,
    sp.TABLE_SCHEMA AS level,
    sp.PRIVILEGE_TYPE
FROM INFORMATION_SCHEMA.SCHEMA_PRIVILEGES sp
ORDER BY GRANTEE, level;
```

## Required Privileges

To see rows for other users, you need the `SELECT` privilege on the `mysql` system tables or a global `SELECT` privilege. Regular users see only their own privileges.

## Summary

`INFORMATION_SCHEMA.USER_PRIVILEGES` is the go-to table for auditing global MySQL permissions. Combine it with `SCHEMA_PRIVILEGES` and `TABLE_PRIVILEGES` for a complete access review, and use it to identify over-privileged accounts as part of any least-privilege security policy.
