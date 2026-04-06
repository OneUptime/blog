# How to Drop a Stored Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Function, DDL, Database Management

Description: Learn how to drop a stored function in MySQL using DROP FUNCTION, check if it exists first, and handle dependencies before removal.

---

Dropping a stored function in MySQL removes its definition from the database permanently. The syntax is straightforward, but there are important considerations around privileges, dependencies, and safe removal patterns.

## Basic DROP FUNCTION Syntax

```sql
DROP FUNCTION function_name;
```

To drop a function in a specific database, qualify the name:

```sql
DROP FUNCTION mydb.calculate_tax;
```

If the function does not exist, MySQL raises an error. Use `IF EXISTS` to suppress it:

```sql
DROP FUNCTION IF EXISTS calculate_tax;
```

## Checking Whether a Function Exists

Before dropping, you can verify a function exists by querying the `information_schema`:

```sql
SELECT ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_SCHEMA
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'FUNCTION'
  AND ROUTINE_SCHEMA = 'mydb'
  AND ROUTINE_NAME = 'calculate_tax';
```

An empty result means the function does not exist and there is nothing to drop.

## Required Privileges

To drop a stored function you need either:
- The `ALTER ROUTINE` privilege on the specific function, or
- The global `ALTER ROUTINE` or `SUPER` privilege.

Check current grants:

```sql
SHOW GRANTS FOR CURRENT_USER();
```

To grant the necessary privilege to another user:

```sql
GRANT ALTER ROUTINE ON mydb.* TO 'developer'@'localhost';
```

## Dropping and Recreating a Function

A common pattern during development is to drop and recreate a function in the same script. Use `DROP FUNCTION IF EXISTS` before the `CREATE FUNCTION` statement:

```sql
DROP FUNCTION IF EXISTS format_phone;

DELIMITER //

CREATE FUNCTION format_phone(p_raw VARCHAR(20))
RETURNS VARCHAR(15)
DETERMINISTIC
BEGIN
    RETURN CONCAT(
        '(',
        SUBSTRING(p_raw, 1, 3),
        ') ',
        SUBSTRING(p_raw, 4, 3),
        '-',
        SUBSTRING(p_raw, 7)
    );
END //

DELIMITER ;
```

The `DROP FUNCTION IF EXISTS` followed by `CREATE FUNCTION` pattern is the standard approach in MySQL, since MySQL does not support `CREATE OR REPLACE FUNCTION` (that syntax is available in MariaDB but not in MySQL).

## Handling Dependencies

Stored functions can be referenced inside:
- Other stored procedures and functions
- Views
- Generated columns
- Check constraints (MySQL 8.0.16+)

Before dropping, search for dependents:

```sql
SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_DEFINITION
FROM information_schema.ROUTINES
WHERE ROUTINE_DEFINITION LIKE '%calculate_tax%';
```

Also check views:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, VIEW_DEFINITION
FROM information_schema.VIEWS
WHERE VIEW_DEFINITION LIKE '%calculate_tax%';
```

Update or drop any dependents before removing the function to avoid broken references.

## Summary

Use `DROP FUNCTION IF EXISTS` to safely remove a stored function without raising errors when it does not exist. Always check `information_schema.ROUTINES` for dependents - views, procedures, or generated columns that call the function - before dropping it to prevent runtime errors in dependent objects.
