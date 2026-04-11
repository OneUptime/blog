# How to Use SHOW FUNCTION STATUS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Function, Schema

Description: Learn how to use SHOW FUNCTION STATUS in MySQL to list stored functions, filter by name or database, and inspect creation and security metadata.

---

## What Is SHOW FUNCTION STATUS

`SHOW FUNCTION STATUS` lists all stored functions visible to the current user, along with metadata including the database, definer, timestamps, security type, and comment. It works similarly to `SHOW PROCEDURE STATUS` but returns only `FUNCTION` type routines. This is useful for auditing what callable functions exist on your MySQL server.

```sql
SHOW FUNCTION STATUS;
SHOW FUNCTION STATUS LIKE 'pattern';
SHOW FUNCTION STATUS WHERE condition;
```

## Basic Usage

```sql
SHOW FUNCTION STATUS\G
```

```text
*************************** 1. row ***************************
                  Db: myapp_db
                Name: format_currency
                Type: FUNCTION
             Definer: app_user@localhost
           Modified: 2024-02-20 11:15:30
            Created: 2024-01-05 08:45:00
      Security_type: DEFINER
             Comment: Formats a decimal value as a currency string
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
  Database Collation: utf8mb4_0900_ai_ci
```

## Filtering by Name Pattern

```sql
-- Find functions with 'format' in their name
SHOW FUNCTION STATUS LIKE '%format%';

-- Find functions starting with 'fn_'
SHOW FUNCTION STATUS LIKE 'fn\_%';

-- Find functions ending with '_calc'
SHOW FUNCTION STATUS LIKE '%_calc';
```

## Filtering by Database

```sql
-- Show only functions in myapp_db
SHOW FUNCTION STATUS WHERE Db = 'myapp_db';

-- Show functions modified recently
SHOW FUNCTION STATUS WHERE Modified > '2024-06-01';
```

## Key Output Columns

- **Db**: The database containing the function
- **Name**: Function name
- **Type**: Always `FUNCTION` for this command
- **Definer**: The user account that created the function
- **Modified**: Last alteration timestamp
- **Created**: Creation timestamp
- **Security_type**: `DEFINER` (executes with creator's privileges) or `INVOKER` (executes with caller's privileges)
- **Comment**: Optional documentation comment

## Using information_schema for Function Queries

For richer filtering and programmatic use:

```sql
SELECT
  ROUTINE_NAME,
  DATA_TYPE AS return_type,
  DEFINER,
  CREATED,
  LAST_ALTERED,
  SECURITY_TYPE,
  ROUTINE_COMMENT
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'myapp_db'
  AND ROUTINE_TYPE = 'FUNCTION'
ORDER BY ROUTINE_NAME;
```

## Viewing the Full Function Definition

To see the actual function code:

```sql
SHOW CREATE FUNCTION function_name\G
```

```sql
SHOW CREATE FUNCTION format_currency\G
```

```text
Function: format_currency
Create Function: CREATE DEFINER=`app_user`@`localhost` FUNCTION `format_currency`(amount DECIMAL(10,2))
RETURNS varchar(20) CHARSET utf8mb4
    DETERMINISTIC
BEGIN
  RETURN CONCAT('$', FORMAT(amount, 2));
END
```

## Finding DETERMINISTIC vs Non-Deterministic Functions

Deterministic functions always return the same output for the same inputs, which enables better query caching. Check this from `information_schema`:

```sql
SELECT ROUTINE_NAME, IS_DETERMINISTIC
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'myapp_db'
  AND ROUTINE_TYPE = 'FUNCTION';
```

## Comparing Functions vs Procedures

The key differences between MySQL functions and procedures:

```sql
-- Functions return a value and can be used in expressions
SELECT format_currency(total) FROM orders;

-- Procedures do not return values directly (use OUT parameters)
CALL calculate_order_total(order_id, @result);
SELECT @result;
```

## Summary

`SHOW FUNCTION STATUS` lists stored functions in MySQL with their metadata including definer, creation time, and security type. Use `WHERE Db = 'db_name'` to scope to a specific database, `SHOW CREATE FUNCTION` to view the function body, and `information_schema.ROUTINES` for programmatic or cross-database function auditing. Review `SECURITY_TYPE` settings to ensure functions do not grant unintended privilege escalation paths.
