# How to Grant Privileges on a Specific Table in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Privilege, Security, Table

Description: Learn how to grant MySQL privileges on a single table, restricting a user's access to exactly one object within a database for fine-grained security.

---

## Table-Level Privilege Syntax

When a user should access only one table (or a small set of tables) within a database, you can scope the GRANT to the specific table:

```sql
GRANT privilege_list ON database_name.table_name TO 'user'@'host';
```

This is more restrictive than `database_name.*`, which covers all tables in the schema.

## Common Table-Level Grants

```sql
-- Read access on a single table
GRANT SELECT ON mydb.orders TO 'analyst'@'%';

-- Read and write on a specific table
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.events TO 'logger'@'localhost';

-- Allow updates but not deletes
GRANT SELECT, INSERT, UPDATE ON mydb.inventory TO 'stock_app'@'10.0.0.5';
```

## Granting on Multiple Tables

```sql
GRANT SELECT ON mydb.products  TO 'catalog_reader'@'%';
GRANT SELECT ON mydb.categories TO 'catalog_reader'@'%';
GRANT SELECT ON mydb.brands    TO 'catalog_reader'@'%';
```

Each table requires its own GRANT statement. There is no wildcard for a subset of tables.

## Verifying Table-Level Grants

```sql
SHOW GRANTS FOR 'analyst'@'%';
```

Output:

```text
+-----------------------------------------------------------+
| Grants for analyst@%                                      |
+-----------------------------------------------------------+
| GRANT USAGE ON *.* TO `analyst`@`%`                       |
| GRANT SELECT ON `mydb`.`orders` TO `analyst`@`%`          |
+-----------------------------------------------------------+
```

## Querying information_schema for Table-Level Privileges

```sql
SELECT GRANTEE, TABLE_SCHEMA, TABLE_NAME, PRIVILEGE_TYPE, IS_GRANTABLE
FROM information_schema.TABLE_PRIVILEGES
WHERE TABLE_SCHEMA = 'mydb'
  AND GRANTEE LIKE '%analyst%';
```

## Testing the Restriction

```sql
-- As analyst user
SELECT COUNT(*) FROM mydb.orders;  -- succeeds

SELECT COUNT(*) FROM mydb.customers;
-- ERROR 1142 (42000): SELECT command denied to user 'analyst'@'%' for table 'customers'
```

## Revoking a Table-Level Grant

```sql
REVOKE SELECT ON mydb.orders FROM 'analyst'@'%';
```

## Table-Level vs Database-Level Grants

| Scope | Syntax | Covers |
|-------|--------|--------|
| Global | `ON *.*` | All databases and tables |
| Database | `ON db.*` | All tables in one database |
| Table | `ON db.table` | One specific table |
| Column | `priv (col1, col2) ON db.table` | Specific columns in a table |

## Practical Example - Audit User

An auditor needs to read the `audit_log` table but nothing else:

```sql
CREATE USER 'auditor'@'10.0.0.0/255.255.255.0' IDENTIFIED BY 'AuditPass!9';
GRANT SELECT ON mydb.audit_log TO 'auditor'@'10.0.0.0/255.255.255.0';
SHOW GRANTS FOR 'auditor'@'10.0.0.0/255.255.255.0';
```

## Summary

Table-level GRANTs in MySQL provide the most precise access control short of column-level permissions. Use `GRANT privilege ON db.table TO user` to restrict a user to exactly one table. Verify with `SHOW GRANTS` and `information_schema.TABLE_PRIVILEGES`, and test that access to other tables in the same database is correctly blocked.
