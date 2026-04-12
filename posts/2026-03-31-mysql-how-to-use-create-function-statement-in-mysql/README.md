# How to Use CREATE FUNCTION Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User-Defined Function, SQL, Database Programming

Description: Learn how to create user-defined functions (UDFs) in MySQL using CREATE FUNCTION to encapsulate reusable calculations and transformations.

---

## What Is a MySQL User-Defined Function

A user-defined function (UDF) in MySQL is a stored routine that accepts parameters, performs a calculation or transformation, and returns a single scalar value. Unlike stored procedures, functions can be called directly inside SELECT, WHERE, or other SQL expressions, making them ideal for reusable computations.

## Basic Syntax

```sql
DELIMITER $$

CREATE FUNCTION function_name ([parameter_list])
RETURNS return_type
[DETERMINISTIC | NOT DETERMINISTIC]
[READS SQL DATA | NO SQL | MODIFIES SQL DATA | CONTAINS SQL]
BEGIN
    -- function body
    RETURN value;
END$$

DELIMITER ;
```

The `DETERMINISTIC` keyword tells MySQL the function always returns the same result for the same inputs, which allows query optimization and binary log safety.

## Creating a Simple Scalar Function

```sql
DELIMITER $$

CREATE FUNCTION calc_tax(p_amount DECIMAL(10,2), p_rate DECIMAL(5,4))
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    RETURN ROUND(p_amount * p_rate, 2);
END$$

DELIMITER ;
```

Use it directly in a query:

```sql
SELECT product_name, price, calc_tax(price, 0.0875) AS tax
FROM products;
```

## String Manipulation Function

```sql
DELIMITER $$

CREATE FUNCTION slugify(p_text VARCHAR(500))
RETURNS VARCHAR(500)
DETERMINISTIC
BEGIN
    DECLARE v_slug VARCHAR(500);
    SET v_slug = LOWER(TRIM(p_text));
    SET v_slug = REPLACE(v_slug, ' ', '-');
    RETURN v_slug;
END$$

DELIMITER ;
```

```sql
SELECT slugify('My Product Name');
-- Returns: my-product-name
```

## Function with Conditional Logic

```sql
DELIMITER $$

CREATE FUNCTION get_discount_rate(p_customer_tier VARCHAR(20))
RETURNS DECIMAL(5,4)
DETERMINISTIC
BEGIN
    DECLARE v_rate DECIMAL(5,4);

    CASE p_customer_tier
        WHEN 'gold'     THEN SET v_rate = 0.15;
        WHEN 'silver'   THEN SET v_rate = 0.10;
        WHEN 'bronze'   THEN SET v_rate = 0.05;
        ELSE                 SET v_rate = 0.00;
    END CASE;

    RETURN v_rate;
END$$

DELIMITER ;
```

```sql
SELECT
    customer_id,
    tier,
    order_total,
    order_total * get_discount_rate(tier) AS discount
FROM customer_orders;
```

## Function That Reads from a Table

```sql
DELIMITER $$

CREATE FUNCTION get_customer_order_count(p_customer_id INT)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_count INT;

    SELECT COUNT(*) INTO v_count
    FROM orders
    WHERE customer_id = p_customer_id;

    RETURN v_count;
END$$

DELIMITER ;
```

```sql
SELECT
    id,
    username,
    get_customer_order_count(id) AS total_orders
FROM users
WHERE status = 'active';
```

## Difference Between Functions and Procedures

| Feature | Function | Procedure |
|---|---|---|
| Returns value | Yes (scalar) | Via OUT params |
| Usable in SQL expressions | Yes | No |
| Can return result sets | No | Yes |
| Transaction control | No | Yes |
| Called with | SELECT/WHERE | CALL |

## Viewing and Dropping Functions

```sql
-- List functions in the current database
SHOW FUNCTION STATUS WHERE Db = 'mydb'\G

-- Show function definition
SHOW CREATE FUNCTION calc_tax\G

-- Drop a function
DROP FUNCTION IF EXISTS calc_tax;
```

## Binary Logging Requirement

If `log_bin` is enabled and `log_bin_trust_function_creators` is `0` (the default), MySQL requires functions to be marked as `DETERMINISTIC`, `NO SQL`, or `READS SQL DATA`. Otherwise the creation fails:

```text
ERROR 1418: This function has none of DETERMINISTIC, NO SQL, or READS SQL DATA
```

To bypass this (not recommended for production):

```sql
SET GLOBAL log_bin_trust_function_creators = 1;
```

The proper fix is to mark your function with the correct characteristic.

## Summary

The `CREATE FUNCTION` statement lets you define reusable scalar computations in MySQL that can be called directly within SQL expressions. Functions are ideal for business calculations, string transformations, and derived value lookups. Always declare the appropriate SQL characteristic (`DETERMINISTIC`, `READS SQL DATA`, etc.) for binary log compatibility and query optimization.
