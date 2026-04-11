# How to View User Privileges with SHOW GRANTS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Privilege, Security, Database Administration

Description: Learn how to use MySQL's SHOW GRANTS command to inspect user privileges at all levels, and how to query information_schema for a programmatic audit.

---

## Basic SHOW GRANTS Usage

`SHOW GRANTS` displays the GRANT statements needed to recreate a user's current privileges:

```sql
-- Show grants for a specific user
SHOW GRANTS FOR 'alice'@'localhost';

-- Show grants for the currently logged-in user
SHOW GRANTS;
SHOW GRANTS FOR CURRENT_USER();
```

## Reading the Output

```text
+------------------------------------------------------------------+
| Grants for alice@localhost                                       |
+------------------------------------------------------------------+
| GRANT USAGE ON *.* TO `alice`@`localhost`                        |
| GRANT SELECT, INSERT, UPDATE ON `mydb`.* TO `alice`@`localhost`  |
| GRANT SELECT (id, name) ON `mydb`.`employees` TO `alice`@`localhost` |
+------------------------------------------------------------------+
```

- `GRANT USAGE ON *.*` - the baseline "allowed to connect" grant; does not imply any data privileges.
- Database-level line - all tables in `mydb`.
- Column-level line - specific columns on the `employees` table.

## Checking Effective Privileges (MySQL 8.0+)

In MySQL 8.0, `SHOW GRANTS FOR 'user'@'host'` lists the roles granted to that account. Add a `USING` clause when you want the privileges inherited from one or more roles to appear in the output. Use:

```sql
SHOW GRANTS FOR 'alice'@'localhost' USING 'analyst_role';
```

This shows Alice's grants combined with those inherited from `analyst_role`.

## Querying information_schema for All Grants

For programmatic auditing across all users, query the privilege tables in `information_schema`:

```sql
-- Global privileges
SELECT GRANTEE, PRIVILEGE_TYPE, IS_GRANTABLE
FROM information_schema.USER_PRIVILEGES
ORDER BY GRANTEE;

-- Database-level privileges
SELECT GRANTEE, TABLE_SCHEMA, PRIVILEGE_TYPE
FROM information_schema.SCHEMA_PRIVILEGES
WHERE TABLE_SCHEMA = 'mydb';

-- Table-level privileges
SELECT GRANTEE, TABLE_SCHEMA, TABLE_NAME, PRIVILEGE_TYPE
FROM information_schema.TABLE_PRIVILEGES
WHERE TABLE_SCHEMA = 'mydb';

-- Column-level privileges
SELECT GRANTEE, TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, PRIVILEGE_TYPE
FROM information_schema.COLUMN_PRIVILEGES
WHERE TABLE_SCHEMA = 'mydb';
```

## Listing All User Accounts and Their Grants

```sql
-- Step 1: get all non-system users
SELECT CONCAT("SHOW GRANTS FOR '", user, "'@'", host, "';") AS cmd
FROM mysql.user
WHERE user NOT IN ('mysql.sys', 'mysql.session', 'mysql.infoschema');
```

Run each output line to see individual user grants, or use a shell loop:

```bash
mysql -u root -p -se "SELECT CONCAT(user,'@',host) FROM mysql.user WHERE user NOT IN ('mysql.sys','mysql.session','mysql.infoschema')" \
  | while read account; do
      echo "=== $account ===";
      mysql -u root -p -e "SHOW GRANTS FOR $account";
    done
```

## Checking for Overly Broad Grants

Identify any user with global ALL PRIVILEGES (potential security risk). MySQL stores each privilege as a separate row in `information_schema`, so match users whose privilege count equals the total number of distinct global privilege types:

```sql
SELECT GRANTEE, COUNT(*) AS privilege_count
FROM information_schema.USER_PRIVILEGES
GROUP BY GRANTEE
HAVING privilege_count = (
    SELECT COUNT(DISTINCT PRIVILEGE_TYPE)
    FROM information_schema.USER_PRIVILEGES
);
```

## Comparing Grants Before and After Changes

Before modifying grants, save the current state:

```sql
-- Save current grants for alice
SHOW GRANTS FOR 'alice'@'localhost';

-- Make the change
REVOKE DELETE ON mydb.* FROM 'alice'@'localhost';

-- Verify the change
SHOW GRANTS FOR 'alice'@'localhost';
```

## Summary

`SHOW GRANTS FOR 'user'@'host'` is the primary tool for inspecting MySQL user privileges. It produces re-executable GRANT statements that reflect the user's current permissions at global, database, table, and column levels. For cross-user audits, query `information_schema.USER_PRIVILEGES`, `SCHEMA_PRIVILEGES`, `TABLE_PRIVILEGES`, and `COLUMN_PRIVILEGES`. In MySQL 8.0, always include `USING role` to see effective privileges contributed by roles.
