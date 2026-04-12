# How to Use DUAL Table in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DUAL Table, SQL, Expression

Description: Learn how to use the MySQL DUAL table to evaluate expressions, call functions, and test values without needing a real table, and understand when it is and is not needed.

---

## What Is the DUAL Table

`DUAL` is a special dummy table available in MySQL for SQL compatibility. It exists as a single-row, single-column virtual table that allows you to write a `SELECT` statement with a `FROM` clause when you only want to evaluate an expression or call a function without reading any real table data.

MySQL actually makes `FROM` optional in `SELECT` statements, but `DUAL` is provided for compatibility with Oracle SQL and older code that requires a `FROM` clause.

## Basic Usage

```sql
-- Evaluate a mathematical expression
SELECT 2 * 21 AS answer FROM DUAL;
-- Result: 42

-- Call a built-in function
SELECT NOW() AS current_time FROM DUAL;

-- Evaluate a string function
SELECT UPPER('hello world') AS greeting FROM DUAL;
-- Result: HELLO WORLD
```

## MySQL Does Not Require DUAL

In MySQL 5.0+, the `FROM DUAL` clause is entirely optional. Both of these are equivalent:

```sql
-- With DUAL
SELECT 1 + 1 FROM DUAL;

-- Without DUAL (preferred in MySQL)
SELECT 1 + 1;
```

Use `FROM DUAL` only when you need Oracle or ANSI SQL compatibility.

## Testing Expressions and Conditions

DUAL is useful for quickly testing a complex expression or conditional logic in isolation:

```sql
-- Test CASE expression
SELECT
  CASE
    WHEN 95 >= 90 THEN 'A'
    WHEN 95 >= 80 THEN 'B'
    ELSE 'C'
  END AS grade
FROM DUAL;

-- Test IF function
SELECT IF(5 > 3, 'five is greater', 'three is greater') AS result FROM DUAL;

-- Test NULL handling
SELECT COALESCE(NULL, NULL, 'fallback') AS value FROM DUAL;
```

## Using DUAL in Subqueries

`DUAL` is useful for injecting a constant row into a query using `UNION`:

```sql
-- Add a default row to an existing result set
SELECT id, name, 'real' AS source FROM customers
UNION ALL
SELECT 0, 'Unknown', 'default' FROM DUAL;
```

## Checking Variables and Settings

```sql
-- Check current session variable
SELECT @@sql_mode FROM DUAL;

-- Check global variable
SELECT @@GLOBAL.max_connections FROM DUAL;

-- Check multiple system variables
SELECT
  @@version           AS mysql_version,
  @@innodb_buffer_pool_size AS buffer_pool,
  @@max_connections   AS max_conn
FROM DUAL;
```

## Testing Date and Time Calculations

```sql
-- Calculate days between two dates
SELECT DATEDIFF('2025-12-31', '2025-01-01') AS days_in_year FROM DUAL;

-- Check the day of week for a specific date
SELECT DAYNAME('2025-07-04') AS day_name FROM DUAL;

-- Test date arithmetic
SELECT DATE_ADD(NOW(), INTERVAL 30 DAY) AS thirty_days_from_now FROM DUAL;
```

## Using DUAL in Stored Procedures

DUAL can be useful in stored procedures when you need to SELECT a value into a variable without referencing any table:

```sql
DELIMITER $$
CREATE PROCEDURE get_config_value(OUT p_version VARCHAR(50))
BEGIN
  SELECT @@version INTO p_version FROM DUAL;
END$$
DELIMITER ;

CALL get_config_value(@ver);
SELECT @ver;
```

## DUAL in Oracle Compatibility

In Oracle SQL, `FROM DUAL` is mandatory for `SELECT` statements that do not reference a table. MySQL's DUAL table exists specifically for compatibility with Oracle SQL, making it easier to port queries between the two databases:

```sql
-- Works in both MySQL and Oracle
SELECT 1 FROM DUAL WHERE 1 = 1;

-- SYSDATE requires parentheses in MySQL, unlike Oracle
SELECT SYSDATE() FROM DUAL;
```

Note that MariaDB 10.3+ (not MySQL) offers a comprehensive `sql_mode=ORACLE` setting that provides broader Oracle SQL compatibility, including support for Oracle-style `SYSDATE` without parentheses.

## Summary

The DUAL table in MySQL is a compatibility construct that allows `SELECT` expressions to include a `FROM` clause. In standard MySQL queries, `FROM DUAL` is optional and can be omitted. It is most useful for testing expressions in isolation, injecting constant rows with `UNION ALL`, checking system variables, and maintaining compatibility with Oracle SQL code that always requires a `FROM` clause.
