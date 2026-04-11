# How to Use User Variables with Prepared Statements in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Prepared Statement, Variable, Dynamic SQL, Query

Description: Learn how MySQL user variables serve as the bridge for passing parameters to prepared statements and how to use them effectively.

---

## Why User Variables Are Required

MySQL's `EXECUTE ... USING` clause accepts only user variables (prefixed with `@`) as parameter values - not literals, local procedure variables, or expressions. This means user variables are the essential bridge between your data and prepared statement parameters.

```sql
-- WRONG: literal in USING clause
SET @stmt = 'SELECT * FROM orders WHERE id = ?';
PREPARE get_order FROM @stmt;
EXECUTE get_order USING 42; -- ERROR

-- CORRECT: user variable in USING clause
SET @id = 42;
EXECUTE get_order USING @id; -- OK
```

## Basic Pattern

```sql
-- Prepare once
PREPARE get_user FROM 'SELECT name, email FROM users WHERE id = ?';

-- Set parameter, execute
SET @uid = 100;
EXECUTE get_user USING @uid;

-- Change parameter, execute again
SET @uid = 200;
EXECUTE get_user USING @uid;

-- Clean up
DEALLOCATE PREPARE get_user;
```

## Multiple Parameter Variables

```sql
PREPARE search FROM
  'SELECT * FROM products WHERE category = ? AND price < ?';

SET @category = 'electronics';
SET @max_price = 500.00;

EXECUTE search USING @category, @max_price;
```

## Using Query Results as Parameters

User variables can capture query results and pass them to subsequent prepared statements:

```sql
-- Get the latest order ID
SELECT MAX(id) INTO @latest_id FROM orders;

-- Use it as a parameter
PREPARE get_order_items FROM
  'SELECT * FROM order_items WHERE order_id = ?';

EXECUTE get_order_items USING @latest_id;
DEALLOCATE PREPARE get_order_items;
```

## User Variables in Stored Procedures

Inside stored procedures, local variables (declared with `DECLARE`) cannot be used directly in `USING`. Assign them to user variables first:

```sql
DELIMITER //
CREATE PROCEDURE find_orders(IN customer_id INT, IN status_filter VARCHAR(20))
BEGIN
  PREPARE stmt FROM
    'SELECT id, total FROM orders WHERE customer_id = ? AND status = ?';

  -- Bridge local parameters to user variables
  SET @cid = customer_id;
  SET @st = status_filter;

  EXECUTE stmt USING @cid, @st;
  DEALLOCATE PREPARE stmt;
END//
DELIMITER ;

CALL find_orders(15, 'completed');
```

## Reusing Variables Across Statements

User variables persist for the duration of the session, so you can reuse them across multiple prepared statements:

```sql
PREPARE count_by_status FROM
  'SELECT COUNT(*) FROM orders WHERE status = ?';

PREPARE total_by_status FROM
  'SELECT SUM(total) FROM orders WHERE status = ?';

SET @s = 'pending';
EXECUTE count_by_status USING @s;
EXECUTE total_by_status USING @s;

SET @s = 'completed';
EXECUTE count_by_status USING @s;
EXECUTE total_by_status USING @s;

DEALLOCATE PREPARE count_by_status;
DEALLOCATE PREPARE total_by_status;
```

## Checking Variable Type

User variables are weakly typed. Verify a variable holds the right type before using it as a parameter:

```sql
SET @amount = '100'; -- String
SET @amount = 100;   -- Integer
SET @amount = 100.0; -- Float

-- MySQL has no built-in typeof(); use CAST to control types
SET @amount = CAST(100 AS DECIMAL(10,2));
```

## Summary

User variables (`@var`) are the only type of value accepted in the `USING` clause of `EXECUTE`. They serve as the parameter-passing mechanism for prepared statements in MySQL. Assign values to user variables with `SET`, capture query results with `SELECT ... INTO @var`, and use them across multiple prepared statements within the same session. Always be aware that user variables persist for the life of the session.
