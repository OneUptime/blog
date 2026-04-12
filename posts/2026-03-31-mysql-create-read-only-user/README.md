# How to Create a Read-Only User in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Security, Privilege, Database Administration

Description: Learn how to create a MySQL read-only user account with SELECT-only privileges, suitable for reporting tools, BI dashboards, and monitoring agents.

---

## Why Create a Read-Only User?

A read-only MySQL account grants SELECT access but no ability to INSERT, UPDATE, DELETE, or modify the schema. This is the right account type for:

- BI and reporting tools (Grafana, Metabase, Tableau)
- Database monitoring agents
- Application users that only need to read data
- Developers who should not modify production data

## Step 1 - Create the User Account

```sql
CREATE USER 'readonly_user'@'%' IDENTIFIED BY 'ReadOnly!Pass2024';
```

Use a specific host for tighter security:

```sql
CREATE USER 'readonly_user'@'192.168.1.50' IDENTIFIED BY 'ReadOnly!Pass2024';
```

## Step 2 - Grant SELECT on the Target Database

```sql
GRANT SELECT ON mydb.* TO 'readonly_user'@'%';
```

This covers all existing and future tables in `mydb`. The user cannot INSERT, UPDATE, DELETE, or modify the schema.

## Step 3 - Grant SHOW VIEW (Optional)

If the read-only user needs to see view definitions (via `SHOW CREATE VIEW`), also grant `SHOW VIEW`:

```sql
GRANT SELECT, SHOW VIEW ON mydb.* TO 'readonly_user'@'%';
```

Note: `SELECT` alone is sufficient to query views. `SHOW VIEW` is only needed to inspect view definitions.

## Step 4 - Verify the Grants

```sql
SHOW GRANTS FOR 'readonly_user'@'%';
```

Expected output:

```text
+---------------------------------------------------------+
| Grants for readonly_user@%                              |
+---------------------------------------------------------+
| GRANT USAGE ON *.* TO `readonly_user`@`%`               |
| GRANT SELECT ON `mydb`.* TO `readonly_user`@`%`         |
+---------------------------------------------------------+
```

## Step 5 - Test That Writes Are Blocked

```bash
mysql -u readonly_user -p mydb
```

```sql
-- This should succeed
SELECT COUNT(*) FROM orders;

-- This should fail
DELETE FROM orders WHERE id = 1;
-- ERROR 1142 (42000): DELETE command denied to user 'readonly_user'@'%' for table 'orders'

-- This should also fail
INSERT INTO orders (customer_id, amount) VALUES (1, 99.99);
-- ERROR 1142 (42000): INSERT command denied
```

## Granting Read-Only Access Across Multiple Databases

```sql
GRANT SELECT ON db1.* TO 'readonly_user'@'%';
GRANT SELECT ON db2.* TO 'readonly_user'@'%';
```

Each database requires a separate GRANT statement.

## Read-Only Global Grant (Not Recommended for Production)

```sql
-- Allows reading all databases on the server
GRANT SELECT ON *.* TO 'monitoring'@'localhost';
```

Use this sparingly - global SELECT still exposes all databases including system schemas.

## Revoking Read Access

```sql
REVOKE SELECT ON mydb.* FROM 'readonly_user'@'%';
DROP USER 'readonly_user'@'%';
```

## Automating with a Shell Script

```bash
#!/bin/bash
DB="mydb"
USER="readonly_user"
PASS="ReadOnly!Pass2024"
HOST="%"

mysql -u root -p"${MYSQL_ROOT_PASS}" <<SQL
CREATE USER IF NOT EXISTS '${USER}'@'${HOST}' IDENTIFIED BY '${PASS}';
GRANT SELECT ON ${DB}.* TO '${USER}'@'${HOST}';
SQL
echo "Read-only user created."
```

## Summary

Creating a MySQL read-only user involves three steps: `CREATE USER`, `GRANT SELECT ON db.*`, and verifying with `SHOW GRANTS`. Always use a specific host instead of `%` in production to limit connection origins. Test that write operations fail before handing the credentials to the reporting tool or team.
