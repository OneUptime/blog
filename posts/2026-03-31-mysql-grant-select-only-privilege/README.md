# How to Grant SELECT Only Privilege in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Privilege, Security, Database Administration

Description: Learn how to grant read-only SELECT access to a MySQL user at the global, database, table, or column level, and verify the resulting permissions.

---

## Why Grant SELECT Only?

Granting only SELECT privilege creates a read-only database user - ideal for reporting tools, BI dashboards, data analysts, monitoring agents, and backup scripts that only need to read data without any risk of modification.

## Granting SELECT on an Entire Database

```sql
-- Allow reads on all tables in mydb (current and future)
GRANT SELECT ON mydb.* TO 'reporter'@'%' IDENTIFIED BY 'ReadOnly!Pass1';
```

In MySQL 8.0+, create the user first then grant:

```sql
CREATE USER 'reporter'@'%' IDENTIFIED BY 'ReadOnly!Pass1';
GRANT SELECT ON mydb.* TO 'reporter'@'%';
```

## Granting SELECT on a Specific Table

```sql
GRANT SELECT ON mydb.orders TO 'analyst'@'192.168.1.10';
```

The analyst can read the `orders` table but cannot read any other table in `mydb`, and cannot modify data.

## Granting SELECT on Multiple Tables

```sql
GRANT SELECT ON mydb.orders TO 'analyst'@'%';
GRANT SELECT ON mydb.customers TO 'analyst'@'%';
GRANT SELECT ON mydb.products TO 'analyst'@'%';
```

## Granting SELECT Globally Across All Databases

```sql
GRANT SELECT ON *.* TO 'monitoring'@'localhost';
```

This gives read access to all databases on the server - useful for monitoring agents that inspect multiple schemas.

## Verifying SELECT-Only Privileges

```sql
SHOW GRANTS FOR 'reporter'@'%';
```

Output:

```text
+--------------------------------------------------+
| Grants for reporter@%                            |
+--------------------------------------------------+
| GRANT USAGE ON *.* TO `reporter`@`%`             |
| GRANT SELECT ON `mydb`.* TO `reporter`@`%`       |
+--------------------------------------------------+
```

`GRANT USAGE ON *.*` is the baseline that allows connection; SELECT on `mydb.*` is the only data privilege.

## Testing the Restriction

Connect as the reporter user and verify that writes are blocked:

```sql
-- Connect as reporter
mysql -u reporter -p mydb

-- Read succeeds
SELECT * FROM orders LIMIT 5;

-- Write is blocked
INSERT INTO orders (customer_id, amount) VALUES (1, 100.00);
-- ERROR 1142 (42000): INSERT command denied to user 'reporter'@'%' for table 'orders'
```

## Revoking SELECT Privilege

```sql
REVOKE SELECT ON mydb.* FROM 'reporter'@'%';
```

After revoking, the user can still connect (USAGE is retained) but cannot read any data.

## Granting SELECT and SHOW VIEW

SELECT privilege alone is sufficient to query data from views. However, if the read-only user also needs to inspect view definitions with `SHOW CREATE VIEW`, grant `SHOW VIEW` too:

```sql
GRANT SELECT, SHOW VIEW ON mydb.* TO 'reporter'@'%';
```

## Summary

`GRANT SELECT ON db.* TO 'user'@'host'` creates a read-only MySQL account scoped to a specific database. For tighter control, grant SELECT on individual tables. Always verify with `SHOW GRANTS`, test that writes fail, and use named accounts rather than sharing credentials to maintain an audit trail of who accessed what data.
