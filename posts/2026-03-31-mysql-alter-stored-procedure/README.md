# How to Alter a Stored Procedure in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, DDL, Administration, SQL

Description: Learn how to modify stored procedures in MySQL using DROP and recreate patterns, ALTER PROCEDURE for metadata changes, and safe deployment strategies.

---

MySQL's `ALTER PROCEDURE` statement can only modify metadata attributes of a stored procedure - it cannot change the procedure body or parameters. To update the actual logic, you must drop and recreate the procedure. Understanding this limitation is essential for building reliable database deployment workflows.

## What ALTER PROCEDURE Can Change

`ALTER PROCEDURE` modifies non-body attributes:

```sql
-- Change security type
ALTER PROCEDURE calculate_order_stats
    SQL SECURITY INVOKER;

-- Change SQL mode characteristics
ALTER PROCEDURE calculate_order_stats
    CONTAINS SQL;

-- Change comment
ALTER PROCEDURE calculate_order_stats
    COMMENT 'Calculates per-customer order statistics';

-- Combine multiple changes
ALTER PROCEDURE calculate_order_stats
    SQL SECURITY DEFINER
    COMMENT 'Updated: now uses DEFINER security';
```

Available characteristics: `CONTAINS SQL`, `NO SQL`, `READS SQL DATA`, `MODIFIES SQL DATA`, `SQL SECURITY {DEFINER|INVOKER}`, and `COMMENT`.

## Updating Procedure Logic: Drop and Recreate

To change the body or parameter list, use `DROP PROCEDURE` followed by `CREATE PROCEDURE`:

```sql
-- Step 1: View the current definition before making changes
SHOW CREATE PROCEDURE mydb.calculate_order_stats\G

-- Step 2: Drop the existing procedure
DROP PROCEDURE IF EXISTS calculate_order_stats;

-- Step 3: Recreate with updated logic
DELIMITER //

CREATE PROCEDURE calculate_order_stats(IN p_customer_id INT)
BEGIN
    -- Updated version: now includes recent 12 months only
    DECLARE v_order_count INT;
    DECLARE v_total_amount DECIMAL(10,2);

    SELECT COUNT(*), SUM(total)
    INTO v_order_count, v_total_amount
    FROM orders
    WHERE customer_id = p_customer_id
      AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH);

    SELECT
        v_order_count AS orders_last_12_months,
        v_total_amount AS revenue_last_12_months,
        ROUND(v_total_amount / NULLIF(v_order_count, 0), 2) AS avg_order;
END //

DELIMITER ;
```

## Why CREATE OR REPLACE Does Not Work in MySQL

Unlike MariaDB and Oracle, MySQL does **not** support `CREATE OR REPLACE PROCEDURE`. Attempting to use it will produce a syntax error. The correct approach in all MySQL versions is to use `DROP PROCEDURE IF EXISTS` followed by `CREATE PROCEDURE`:

```sql
DROP PROCEDURE IF EXISTS calculate_order_stats;

DELIMITER //

CREATE PROCEDURE calculate_order_stats(IN p_customer_id INT)
BEGIN
    DECLARE v_count INT;

    SELECT COUNT(*) INTO v_count
    FROM orders WHERE customer_id = p_customer_id;

    SELECT v_count AS total_orders;
END //

DELIMITER ;
```

This two-step pattern is the standard way to replace a stored procedure in MySQL.

**Note:** Some online resources incorrectly claim that MySQL 8.0 added `CREATE OR REPLACE PROCEDURE`. This is not true. Only MariaDB supports this syntax. Always use the `DROP` + `CREATE` pattern in MySQL.

## Safe Deployment with Transactions

Since `DROP PROCEDURE` and `CREATE PROCEDURE` are DDL statements, they cause an implicit commit. Wrap updates in a scripted sequence to minimize disruption:

```sql
-- Save current definition first (outside transaction)
SELECT ROUTINE_DEFINITION
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'mydb'
  AND ROUTINE_NAME = 'calculate_order_stats';

-- Then update
DROP PROCEDURE IF EXISTS calculate_order_stats;

DELIMITER //

CREATE PROCEDURE calculate_order_stats(IN p_customer_id INT)
BEGIN
    -- new body here
END //

DELIMITER ;

-- Verify the update
SHOW CREATE PROCEDURE calculate_order_stats\G
```

## Checking Procedure Metadata

Before and after alteration, check procedure details:

```sql
-- Check current metadata
SELECT
    ROUTINE_NAME,
    SECURITY_TYPE,
    SQL_DATA_ACCESS,
    ROUTINE_COMMENT,
    LAST_ALTERED
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'mydb'
  AND ROUTINE_NAME = 'calculate_order_stats';
```

## Version Control for Stored Procedures

Because MySQL does not natively version procedures, maintain them in source control:

```bash
# Export all procedures to a file for version control
mysqldump \
    --no-data \
    --no-create-info \
    --routines \
    mydb > procedures/procedures_$(date +%Y%m%d).sql
```

Store procedure files in Git alongside application code so changes are tracked and peer-reviewed.

## Granting Execute Permissions After Recreate

When you drop a procedure, MySQL revokes the associated `EXECUTE` and `ALTER ROUTINE` privileges. After recreating the procedure, you must re-grant permissions to any users that need access:

```sql
-- Verify grants after recreation
SHOW GRANTS FOR 'app_user'@'%';

-- Re-grant execute permission
GRANT EXECUTE ON PROCEDURE mydb.calculate_order_stats TO 'app_user'@'%';
```

## Summary

`ALTER PROCEDURE` only modifies metadata like `SQL SECURITY` and `COMMENT`, not the procedure body. To change logic, use `DROP PROCEDURE IF EXISTS` followed by `CREATE PROCEDURE`, since MySQL does not support `CREATE OR REPLACE PROCEDURE` (that syntax is available in MariaDB and Oracle, not MySQL). Store procedure definitions in version control and export them with `mysqldump --routines`. Always re-grant permissions after recreating procedures, as MySQL revokes routine-level privileges when a procedure is dropped.
