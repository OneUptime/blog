# How to Drop a Stored Procedure in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, SQL, Database, DDL

Description: Learn how to safely drop a stored procedure in MySQL using DROP PROCEDURE, check for existence, and manage dependencies.

---

## Overview

Dropping a stored procedure in MySQL removes its definition permanently from the database. The `DROP PROCEDURE` statement is straightforward, but you should understand how to check for existence, handle dependent objects, and manage privileges before removing a procedure in production.

## Basic DROP PROCEDURE Syntax

```sql
DROP PROCEDURE procedure_name;
```

If the procedure does not exist, MySQL raises an error. To suppress the error when the procedure may or may not exist, use `IF EXISTS`:

```sql
DROP PROCEDURE IF EXISTS procedure_name;
```

This is the preferred form in scripts and migrations because it is idempotent.

## Example: Creating and Dropping a Procedure

```sql
-- Create a sample procedure
DELIMITER $$
CREATE PROCEDURE get_active_users()
BEGIN
    SELECT id, email, created_at
    FROM users
    WHERE active = 1;
END$$
DELIMITER ;

-- Drop it safely
DROP PROCEDURE IF EXISTS get_active_users;
```

## Checking Whether a Procedure Exists Before Dropping

Query `information_schema.ROUTINES` to check for a procedure before acting on it:

```sql
SELECT ROUTINE_NAME, ROUTINE_SCHEMA, DEFINER, CREATED, LAST_ALTERED
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'shop'
  AND ROUTINE_TYPE   = 'PROCEDURE'
  AND ROUTINE_NAME   = 'get_active_users';
```

If the query returns no rows, the procedure does not exist.

## Listing All Stored Procedures in a Database

```sql
SHOW PROCEDURE STATUS WHERE Db = 'shop';
```

Or using `information_schema`:

```sql
SELECT ROUTINE_NAME
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'shop'
  AND ROUTINE_TYPE   = 'PROCEDURE'
ORDER BY ROUTINE_NAME;
```

## Dropping and Recreating a Procedure (Replace Pattern)

MySQL does not support `CREATE OR REPLACE PROCEDURE`. The standard pattern for updating a procedure is to drop it first, then recreate it:

```sql
DROP PROCEDURE IF EXISTS calculate_discount;

DELIMITER $$
CREATE PROCEDURE calculate_discount(IN p_price DECIMAL(10,2), OUT p_discounted DECIMAL(10,2))
BEGIN
    SET p_discounted = p_price * 0.90;
END$$
DELIMITER ;
```

MySQL does not support `CREATE OR REPLACE PROCEDURE` (that syntax is available in MariaDB but not in MySQL). `ALTER PROCEDURE` in MySQL can only change procedure characteristics (such as the SQL security context or comment), not the procedure body. The drop-and-recreate pattern shown above is the standard approach.

## Permissions Required to Drop a Procedure

The user must have the `ALTER ROUTINE` privilege on the procedure, or be the procedure's `DEFINER`:

```sql
GRANT ALTER ROUTINE ON PROCEDURE shop.get_active_users TO 'dev_user'@'localhost';
```

To check current privileges:

```sql
SHOW GRANTS FOR 'dev_user'@'localhost';
```

## Considerations Before Dropping

- Check whether any other stored procedures, triggers, or events call the procedure you intend to drop.
- Use `SHOW CREATE PROCEDURE procedure_name;` to back up the definition before dropping.
- In production, wrap the drop in a transaction-aware migration tool (such as Flyway or Liquibase) so the change is tracked.

## Backing Up a Procedure Before Dropping

```bash
mysqldump --routines --no-data --no-create-info \
  -u root -p shop > shop_procedures.sql
```

This exports all stored procedures and functions from the `shop` database so you can restore them if needed.

## Summary

Use `DROP PROCEDURE IF EXISTS procedure_name` to safely remove a stored procedure in MySQL. Always back up the procedure definition with `SHOW CREATE PROCEDURE` or `mysqldump --routines` before dropping it in production. Verify dependencies and permissions before executing the statement.
