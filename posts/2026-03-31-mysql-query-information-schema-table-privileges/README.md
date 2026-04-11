# How to Query INFORMATION_SCHEMA.TABLE_PRIVILEGES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Security, Privilege, Table

Description: Learn how to query INFORMATION_SCHEMA.TABLE_PRIVILEGES in MySQL to audit table-level permissions granted to specific user accounts.

---

## What Is INFORMATION_SCHEMA.TABLE_PRIVILEGES?

The `INFORMATION_SCHEMA.TABLE_PRIVILEGES` table shows privileges granted to MySQL users at the individual table level. It covers grants made with syntax like `GRANT SELECT ON mydb.mytable TO 'user'@'host'`. The data originates from the `mysql.tables_priv` system table.

Use this view when you need fine-grained visibility into which users can access specific tables, not just entire databases.

## Columns in TABLE_PRIVILEGES

- `GRANTEE` - the user in `'user'@'host'` format
- `TABLE_CATALOG` - always `def`
- `TABLE_SCHEMA` - the database containing the table
- `TABLE_NAME` - the table the privilege applies to
- `PRIVILEGE_TYPE` - the privilege (e.g., `SELECT`, `INSERT`, `UPDATE`, `DELETE`)
- `IS_GRANTABLE` - `YES` if granted with `WITH GRANT OPTION`

## List All Table-Level Privileges

```sql
SELECT
    GRANTEE,
    TABLE_SCHEMA,
    TABLE_NAME,
    PRIVILEGE_TYPE,
    IS_GRANTABLE
FROM INFORMATION_SCHEMA.TABLE_PRIVILEGES
ORDER BY TABLE_SCHEMA, TABLE_NAME, GRANTEE;
```

## Find All Tables a User Can Access

```sql
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    PRIVILEGE_TYPE
FROM INFORMATION_SCHEMA.TABLE_PRIVILEGES
WHERE GRANTEE = "'reportuser'@'localhost'"
ORDER BY TABLE_SCHEMA, TABLE_NAME;
```

## Find All Users Who Can Access a Specific Table

```sql
SELECT
    GRANTEE,
    PRIVILEGE_TYPE,
    IS_GRANTABLE
FROM INFORMATION_SCHEMA.TABLE_PRIVILEGES
WHERE TABLE_SCHEMA = 'finance_db'
  AND TABLE_NAME = 'salaries'
ORDER BY GRANTEE;
```

## Audit Modify Privileges on Sensitive Tables

```sql
SELECT
    GRANTEE,
    TABLE_SCHEMA,
    TABLE_NAME,
    PRIVILEGE_TYPE
FROM INFORMATION_SCHEMA.TABLE_PRIVILEGES
WHERE PRIVILEGE_TYPE IN ('INSERT', 'UPDATE', 'DELETE', 'DROP')
  AND TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
ORDER BY TABLE_SCHEMA, TABLE_NAME;
```

## Find Tables with Grant Option

```sql
SELECT
    GRANTEE,
    TABLE_SCHEMA,
    TABLE_NAME,
    PRIVILEGE_TYPE
FROM INFORMATION_SCHEMA.TABLE_PRIVILEGES
WHERE IS_GRANTABLE = 'YES'
ORDER BY TABLE_SCHEMA, TABLE_NAME;
```

## Count Distinct Users Per Table

```sql
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    COUNT(DISTINCT GRANTEE) AS user_count
FROM INFORMATION_SCHEMA.TABLE_PRIVILEGES
GROUP BY TABLE_SCHEMA, TABLE_NAME
ORDER BY user_count DESC;
```

## Generate REVOKE Statements for Cleanup

```sql
SELECT
    CONCAT(
        'REVOKE ', PRIVILEGE_TYPE,
        ' ON `', TABLE_SCHEMA, '`.`', TABLE_NAME, '` ',
        'FROM ', GRANTEE, ';'
    ) AS revoke_statement
FROM INFORMATION_SCHEMA.TABLE_PRIVILEGES
WHERE GRANTEE = "'tempuser'@'%'";
```

## How TABLE_PRIVILEGES Differs from SCHEMA_PRIVILEGES

When a user is granted access at the schema level (`mydb.*`), those entries appear in `SCHEMA_PRIVILEGES`. Only privileges granted to specific tables (`mydb.mytable`) appear in `TABLE_PRIVILEGES`. Both levels can coexist for the same user.

```sql
-- This goes into SCHEMA_PRIVILEGES
GRANT SELECT ON mydb.* TO 'user'@'localhost';

-- This goes into TABLE_PRIVILEGES
GRANT INSERT ON mydb.orders TO 'user'@'localhost';
```

## Summary

`INFORMATION_SCHEMA.TABLE_PRIVILEGES` enables precise auditing of per-table access rights in MySQL. Combined with `USER_PRIVILEGES` and `SCHEMA_PRIVILEGES`, it gives you a complete picture of who can do what across your entire database server - making it indispensable for security hardening and compliance reviews.
