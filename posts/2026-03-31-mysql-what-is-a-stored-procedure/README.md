# What Is a Stored Procedure in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, PL/SQL, Routine, Database Programming

Description: A stored procedure in MySQL is a named, reusable block of SQL code stored in the database that can accept parameters, contain control flow, and be called by name.

---

## Overview

A stored procedure is a precompiled collection of SQL statements stored as a named object in the MySQL database. Once created, it can be called repeatedly by name, accepting input parameters and returning output parameters or result sets. Stored procedures run on the server side, reducing network round trips and allowing complex business logic to live in the database layer.

## Creating a Basic Stored Procedure

```sql
DELIMITER $$

CREATE PROCEDURE get_customer_orders(IN p_customer_id INT)
BEGIN
  SELECT
    o.id AS order_id,
    o.total,
    o.status,
    o.created_at
  FROM orders o
  WHERE o.customer_id = p_customer_id
  ORDER BY o.created_at DESC;
END$$

DELIMITER ;
```

Call it:

```sql
CALL get_customer_orders(42);
```

## Parameters: IN, OUT, and INOUT

Stored procedures support three parameter modes:

```sql
DELIMITER $$

CREATE PROCEDURE calculate_discount(
  IN p_original_price DECIMAL(10,2),
  IN p_discount_pct INT,
  OUT p_final_price DECIMAL(10,2)
)
BEGIN
  SET p_final_price = p_original_price * (1 - p_discount_pct / 100.0);
END$$

DELIMITER ;

-- Call with OUT parameter
CALL calculate_discount(100.00, 15, @result);
SELECT @result;
-- Returns 85.00
```

## Variables and Control Flow

Stored procedures support local variables, IF/ELSE, WHILE, REPEAT, and LOOP:

```sql
DELIMITER $$

CREATE PROCEDURE categorize_order(IN p_order_id INT)
BEGIN
  DECLARE v_total DECIMAL(10,2);
  DECLARE v_category VARCHAR(20);

  SELECT total INTO v_total FROM orders WHERE id = p_order_id;

  IF v_total >= 1000 THEN
    SET v_category = 'premium';
  ELSEIF v_total >= 100 THEN
    SET v_category = 'standard';
  ELSE
    SET v_category = 'small';
  END IF;

  UPDATE orders SET category = v_category WHERE id = p_order_id;
END$$

DELIMITER ;
```

## Error Handling with DECLARE HANDLER

```sql
DELIMITER $$

CREATE PROCEDURE safe_transfer(
  IN p_from_id INT,
  IN p_to_id INT,
  IN p_amount DECIMAL(10,2)
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from_id;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to_id;
  COMMIT;
END$$

DELIMITER ;
```

## Viewing and Dropping Procedures

```sql
-- List all stored procedures in current database
SHOW PROCEDURE STATUS WHERE Db = DATABASE();

-- View the definition of a procedure
SHOW CREATE PROCEDURE get_customer_orders;

-- Drop a procedure
DROP PROCEDURE IF EXISTS get_customer_orders;
```

## When to Use Stored Procedures

Stored procedures are useful when:
- The same multi-step logic is called from multiple applications.
- You want to enforce business rules at the database level.
- You need to reduce network traffic by keeping data processing server-side.
- Security requires that applications call procedures rather than access tables directly (principle of least privilege).

## Summary

Stored procedures encapsulate SQL logic in named, reusable database objects that accept parameters and support variables, control flow, and error handling. They reduce code duplication, enforce business rules in the database, and minimize client-server round trips. Understanding when to use stored procedures versus application-layer logic is a key design decision that depends on team skills, portability requirements, and the complexity of the logic involved.
