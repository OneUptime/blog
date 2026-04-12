# How to Use CREATE PROCEDURE Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, SQL, Database Programming

Description: Learn how to create and call stored procedures in MySQL using CREATE PROCEDURE, with examples for input/output parameters, loops, and error handling.

---

## What Is a Stored Procedure in MySQL

A stored procedure is a named, reusable block of SQL code stored in the database. Procedures can accept input parameters, return output parameters, and execute complex logic including conditional statements, loops, and error handling. They reduce network round-trips by running logic server-side and can enforce consistent business rules across multiple applications.

## Basic Syntax

```sql
DELIMITER $$

CREATE PROCEDURE procedure_name ([parameter_list])
BEGIN
    -- SQL statements
END$$

DELIMITER ;
```

You must change the delimiter because the procedure body contains semicolons. The `DELIMITER` command tells the MySQL client to treat `$$` as the statement terminator.

## Creating a Simple Procedure

```sql
DELIMITER $$

CREATE PROCEDURE get_active_users()
BEGIN
    SELECT id, username, email
    FROM users
    WHERE status = 'active';
END$$

DELIMITER ;
```

Call it with:

```sql
CALL get_active_users();
```

## IN, OUT, and INOUT Parameters

MySQL supports three parameter modes:

- `IN` - input only (default)
- `OUT` - output only, returns a value to the caller
- `INOUT` - both input and output

```sql
DELIMITER $$

CREATE PROCEDURE get_order_total(
    IN p_order_id INT,
    OUT p_total DECIMAL(10,2)
)
BEGIN
    SELECT SUM(price * quantity)
    INTO p_total
    FROM order_items
    WHERE order_id = p_order_id;
END$$

DELIMITER ;
```

Call with an OUT parameter:

```sql
CALL get_order_total(42, @total);
SELECT @total;
```

## Conditional Logic in Procedures

```sql
DELIMITER $$

CREATE PROCEDURE apply_discount(
    IN p_customer_id INT,
    IN p_order_total DECIMAL(10,2),
    OUT p_discount DECIMAL(10,2)
)
BEGIN
    DECLARE v_order_count INT;

    SELECT COUNT(*) INTO v_order_count
    FROM orders
    WHERE customer_id = p_customer_id;

    IF v_order_count > 10 THEN
        SET p_discount = p_order_total * 0.10;
    ELSEIF v_order_count > 5 THEN
        SET p_discount = p_order_total * 0.05;
    ELSE
        SET p_discount = 0;
    END IF;
END$$

DELIMITER ;
```

## Loops in Procedures

Use `WHILE`, `REPEAT`, or `LOOP` for iteration. A cursor-based loop to process rows:

```sql
DELIMITER $$

CREATE PROCEDURE update_all_prices(IN p_factor DECIMAL(5,2))
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE v_id INT;
    DECLARE v_price DECIMAL(10,2);

    DECLARE cur CURSOR FOR SELECT id, price FROM products;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_id, v_price;
        IF done THEN
            LEAVE read_loop;
        END IF;
        UPDATE products SET price = v_price * p_factor WHERE id = v_id;
    END LOOP;

    CLOSE cur;
END$$

DELIMITER ;
```

## Error Handling with DECLARE HANDLER

```sql
DELIMITER $$

CREATE PROCEDURE safe_insert_user(
    IN p_username VARCHAR(100),
    IN p_email VARCHAR(200)
)
BEGIN
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        SELECT 'Duplicate entry - user already exists' AS error_message;
    END;

    INSERT INTO users (username, email) VALUES (p_username, p_email);
    SELECT 'User created successfully' AS message;
END$$

DELIMITER ;
```

The handler for error `1062` (duplicate key) exits the procedure and returns a friendly message.

## Viewing and Managing Procedures

```sql
-- List all procedures in the current database
SHOW PROCEDURE STATUS WHERE Db = 'mydb'\G

-- Show procedure definition
SHOW CREATE PROCEDURE get_order_total\G

-- Drop a procedure
DROP PROCEDURE IF EXISTS get_order_total;
```

## Calling Procedures from Application Code

```python
import mysql.connector

conn = mysql.connector.connect(host='localhost', database='mydb',
                               user='root', password='secret')
cursor = conn.cursor()

result_args = cursor.callproc('get_order_total', [42, 0])
print(result_args[1])  # prints the value of the OUT parameter p_total

conn.close()
```

## Summary

The `CREATE PROCEDURE` statement lets you encapsulate reusable server-side logic in MySQL. Procedures support IN/OUT parameters, conditional logic, loops, cursors, and error handlers, making them suitable for complex business workflows. Use them to reduce application-database round-trips and centralize data processing logic.
