# MySQL Stored Procedures vs Functions: When to Use Each

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Function, Database Programming, SQL

Description: Compare MySQL stored procedures and functions - their syntax, return values, and when to use each for database logic encapsulation.

---

## What Is a Stored Procedure

A stored procedure is a named block of SQL code stored in the database that can accept input and output parameters. Procedures are executed with `CALL` and can return multiple result sets. They can also modify database state.

```sql
CREATE PROCEDURE GetOrdersByStatus(IN order_status VARCHAR(50))
BEGIN
  SELECT id, customer_id, total, created_at
  FROM orders
  WHERE status = order_status;
END;

-- Call the procedure
CALL GetOrdersByStatus('pending');
```

## What Is a Stored Function

A stored function is a named block of SQL code that always returns a single scalar value. Functions are used inside SQL expressions like built-in functions. They cannot modify database state (no DML inside a function by default).

```sql
CREATE FUNCTION GetCustomerOrderCount(cust_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE order_count INT;
  SELECT COUNT(*) INTO order_count
  FROM orders
  WHERE customer_id = cust_id;
  RETURN order_count;
END;

-- Use the function in a query
SELECT name, GetCustomerOrderCount(id) AS order_count
FROM customers;
```

## Key Differences

```text
Feature                 Stored Procedure    Stored Function
---------               ----------------    ---------------
Called with             CALL statement      SQL expression
Returns                 OUT params / result sets  Single scalar value
Return keyword          Not used            RETURN required
Can modify data         Yes                 No (by default)
Used in SELECT          No                 Yes
Multiple result sets    Yes                 No
Can call procedures     Yes                 No
```

## Procedure with IN, OUT, and INOUT Parameters

Procedures support three parameter modes:

```sql
CREATE PROCEDURE TransferFunds(
  IN from_account INT,
  IN to_account INT,
  IN amount DECIMAL(10,2),
  OUT transfer_id INT,
  OUT error_message VARCHAR(200)
)
BEGIN
  DECLARE available_balance DECIMAL(10,2);

  SELECT balance INTO available_balance
  FROM accounts WHERE id = from_account FOR UPDATE;

  IF available_balance < amount THEN
    SET error_message = 'Insufficient funds';
    SET transfer_id = -1;
  ELSE
    UPDATE accounts SET balance = balance - amount WHERE id = from_account;
    UPDATE accounts SET balance = balance + amount WHERE id = to_account;
    INSERT INTO transfers (from_account, to_account, amount, created_at)
      VALUES (from_account, to_account, amount, NOW());
    SET transfer_id = LAST_INSERT_ID();
    SET error_message = NULL;
  END IF;
END;

-- Call with OUT parameters
CALL TransferFunds(1, 2, 500.00, @tid, @err);
SELECT @tid, @err;
```

## Function Example with Business Logic

```sql
CREATE FUNCTION CalculateDiscount(
  original_price DECIMAL(10,2),
  customer_tier VARCHAR(20)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
NO SQL
BEGIN
  DECLARE discount_rate DECIMAL(5,4);

  CASE customer_tier
    WHEN 'gold'     THEN SET discount_rate = 0.15;
    WHEN 'silver'   THEN SET discount_rate = 0.10;
    WHEN 'bronze'   THEN SET discount_rate = 0.05;
    ELSE                 SET discount_rate = 0.00;
  END CASE;

  RETURN ROUND(original_price * (1 - discount_rate), 2);
END;

-- Use in a query
SELECT
  product_id,
  name,
  price,
  CalculateDiscount(price, c.tier) AS discounted_price
FROM cart_items ci
JOIN customers c ON ci.customer_id = c.id;
```

## When to Use a Stored Procedure

Use procedures when:
- You need to execute multiple SQL statements as a unit
- You need to return multiple result sets
- You need to perform DML operations (INSERT, UPDATE, DELETE)
- You are implementing complex business logic that modifies data
- You need output parameters to communicate results back to the caller

```sql
-- Example: batch archiving old records
CREATE PROCEDURE ArchiveOldOrders(IN cutoff_date DATE, OUT archived_count INT)
BEGIN
  INSERT INTO orders_archive SELECT * FROM orders WHERE created_at < cutoff_date;
  DELETE FROM orders WHERE created_at < cutoff_date;
  SET archived_count = ROW_COUNT();
END;
```

## When to Use a Stored Function

Use functions when:
- You need to compute and return a single value
- You want to use the logic inline in SELECT, WHERE, or ORDER BY
- The logic is deterministic and does not modify data
- You need to encapsulate reusable calculation logic

```sql
-- Example: using a function in WHERE clause
SELECT * FROM orders
JOIN customers c ON orders.customer_id = c.id
WHERE CalculateDiscount(total, c.tier) > 50.00;
```

## Managing Procedures and Functions

List all stored procedures in a database:

```sql
SHOW PROCEDURE STATUS WHERE Db = 'myapp';
```

List all functions:

```sql
SHOW FUNCTION STATUS WHERE Db = 'myapp';
```

View the definition of a procedure:

```sql
SHOW CREATE PROCEDURE GetOrdersByStatus\G
```

Drop a procedure or function:

```sql
DROP PROCEDURE IF EXISTS GetOrdersByStatus;
DROP FUNCTION IF EXISTS CalculateDiscount;
```

## Summary

MySQL stored procedures and functions both encapsulate reusable database logic, but serve different purposes. Stored procedures are called with `CALL`, can return multiple result sets and OUT parameters, and can modify data. Stored functions return a single scalar value and are used inline in SQL expressions. Use procedures for complex multi-statement business logic and data modification workflows, and use functions for reusable calculations that need to participate in queries.
