# How to Use IF...THEN...ELSE in MySQL Stored Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Control Flow, SQL

Description: Learn how to use IF, ELSEIF, and ELSE statements in MySQL stored procedures to implement conditional logic and branching.

---

## IF Statement Syntax in MySQL

MySQL stored procedures support two forms of conditional logic: the `IF` statement (for multi-line control flow inside procedures) and the `IF()` function (for inline expressions in queries). This guide covers the `IF` statement.

```sql
IF condition THEN
  -- statements
ELSEIF another_condition THEN
  -- statements
ELSE
  -- statements
END IF;
```

## Simple IF...THEN Example

```sql
DELIMITER //

CREATE PROCEDURE CheckStock(IN product_id INT)
BEGIN
  DECLARE qty INT;

  SELECT stock_quantity INTO qty
  FROM products
  WHERE id = product_id;

  IF qty = 0 THEN
    SELECT 'Out of stock' AS status;
  ELSEIF qty < 10 THEN
    SELECT 'Low stock' AS status;
  ELSE
    SELECT 'In stock' AS status;
  END IF;
END //

DELIMITER ;
```

```sql
CALL CheckStock(55);
```

## IF with Multiple Actions per Branch

Each branch can contain multiple SQL statements:

```sql
DELIMITER //

CREATE PROCEDURE ProcessOrder(
  IN order_id INT,
  OUT result_message VARCHAR(255)
)
BEGIN
  DECLARE order_status VARCHAR(20);
  DECLARE cust_id INT;

  SELECT status, customer_id
  INTO order_status, cust_id
  FROM orders
  WHERE id = order_id;

  IF order_status = 'pending' THEN
    UPDATE orders SET status = 'processing' WHERE id = order_id;
    INSERT INTO order_audit (order_id, action, action_time)
    VALUES (order_id, 'started_processing', NOW());
    SET result_message = 'Order moved to processing';

  ELSEIF order_status = 'processing' THEN
    UPDATE orders SET status = 'shipped' WHERE id = order_id;
    SET result_message = 'Order marked as shipped';

  ELSE
    SET result_message = CONCAT('No action for status: ', order_status);
  END IF;
END //

DELIMITER ;
```

```sql
CALL ProcessOrder(101, @msg);
SELECT @msg;
```

## Nested IF Statements

```sql
DELIMITER //

CREATE PROCEDURE ApplyPricing(
  IN p_customer_id INT,
  IN base_price DECIMAL(10, 2),
  OUT final_price DECIMAL(10, 2)
)
BEGIN
  DECLARE is_vip TINYINT;
  DECLARE order_count INT;

  SELECT is_vip_member INTO is_vip
  FROM customers WHERE id = p_customer_id;

  SELECT COUNT(*) INTO order_count
  FROM orders WHERE customer_id = p_customer_id;

  IF is_vip = 1 THEN
    IF order_count > 100 THEN
      SET final_price = base_price * 0.75;  -- 25% discount
    ELSE
      SET final_price = base_price * 0.85;  -- 15% discount
    END IF;
  ELSE
    IF order_count > 50 THEN
      SET final_price = base_price * 0.90;  -- 10% discount
    ELSE
      SET final_price = base_price;          -- no discount
    END IF;
  END IF;
END //

DELIMITER ;
```

## Using CASE Instead of Long IF...ELSEIF Chains

For many discrete values, `CASE` is cleaner:

```sql
DELIMITER //

CREATE PROCEDURE GetShippingCost(
  IN shipping_method VARCHAR(20),
  OUT cost DECIMAL(6, 2)
)
BEGIN
  CASE shipping_method
    WHEN 'standard' THEN SET cost = 5.99;
    WHEN 'express'  THEN SET cost = 12.99;
    WHEN 'overnight' THEN SET cost = 24.99;
    WHEN 'free'     THEN SET cost = 0.00;
    ELSE SET cost = 9.99;
  END CASE;
END //

DELIMITER ;
```

```sql
CALL GetShippingCost('express', @cost);
SELECT @cost;
```

## IF vs IF() Function

The `IF` statement is for control flow; `IF()` is an expression used inside queries:

```sql
-- IF() as a function in a query
SELECT
  product_name,
  IF(stock_quantity > 0, 'Available', 'Unavailable') AS availability
FROM products;
```

Do not confuse these two. The `IF` statement (with `THEN`/`END IF`) can only be used inside stored routines.

## Summary

The `IF...THEN...ELSEIF...ELSE...END IF` statement in MySQL stored procedures provides branching logic for conditional execution. Use it for multi-branch business logic, nested conditions, or when the number of conditions is small. For matching against many discrete values, the `CASE` statement is more readable. Both forms support multiple SQL statements per branch.
