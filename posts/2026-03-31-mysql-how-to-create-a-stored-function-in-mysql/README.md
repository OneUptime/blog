# How to Create a Stored Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Function, SQL, Database Programming

Description: Learn how to create and use stored functions in MySQL, including scalar functions that return a single value and can be called inside SQL queries.

---

## Stored Functions vs. Stored Procedures

Both stored functions and stored procedures encapsulate reusable SQL logic, but they differ in how they are called and what they return:

| Feature | Stored Function | Stored Procedure |
|---|---|---|
| Called with | `SELECT`, expressions | `CALL` statement |
| Returns | Single scalar value | 0 or more result sets, OUT params |
| Use in SQL | Yes - inside queries | No |
| DML allowed | Yes (cannot return result sets) | Yes |

## Basic Syntax

```sql
DELIMITER //

CREATE FUNCTION function_name(parameters)
RETURNS return_type
[DETERMINISTIC | NOT DETERMINISTIC]
[READS SQL DATA | MODIFIES SQL DATA | NO SQL | CONTAINS SQL]
BEGIN
  -- statements
  RETURN value;
END //

DELIMITER ;
```

The `RETURNS` clause specifies the return data type. The `RETURN` statement (without S) exits the function and returns the value.

## Creating a Simple Scalar Function

```sql
DELIMITER //

CREATE FUNCTION FullName(
  first_name VARCHAR(50),
  last_name VARCHAR(50)
)
RETURNS VARCHAR(100)
DETERMINISTIC
NO SQL
BEGIN
  RETURN CONCAT(first_name, ' ', last_name);
END //

DELIMITER ;
```

Use it directly in a query:

```sql
SELECT FullName(first_name, last_name) AS full_name
FROM employees
WHERE department_id = 5;
```

## Function with SQL Reads

```sql
DELIMITER //

CREATE FUNCTION GetCustomerTotalOrders(p_customer_id INT)
RETURNS INT
READS SQL DATA
NOT DETERMINISTIC
BEGIN
  DECLARE total INT;

  SELECT COUNT(*)
  INTO total
  FROM orders
  WHERE customer_id = p_customer_id;

  RETURN total;
END //

DELIMITER ;
```

```sql
SELECT
  id,
  name,
  GetCustomerTotalOrders(id) AS order_count
FROM customers
ORDER BY order_count DESC
LIMIT 10;
```

## DETERMINISTIC vs NOT DETERMINISTIC

| Attribute | Meaning |
|---|---|
| `DETERMINISTIC` | Same inputs always produce same output (safe for replication and query cache) |
| `NOT DETERMINISTIC` | Output may vary for same inputs (uses randomness, current time, etc.) |

```sql
DELIMITER //

CREATE FUNCTION DaysUntilExpiry(expiry_date DATE)
RETURNS INT
NOT DETERMINISTIC
NO SQL
BEGIN
  RETURN DATEDIFF(expiry_date, CURDATE());
END //

DELIMITER ;
```

This function is `NOT DETERMINISTIC` because `CURDATE()` changes over time.

## Using Conditional Logic in a Function

```sql
DELIMITER //

CREATE FUNCTION GetDiscountPct(p_customer_id INT)
RETURNS DECIMAL(5, 2)
READS SQL DATA
NOT DETERMINISTIC
BEGIN
  DECLARE order_count INT;

  SELECT COUNT(*) INTO order_count
  FROM orders WHERE customer_id = p_customer_id;

  IF order_count >= 100 THEN
    RETURN 20.00;
  ELSEIF order_count >= 50 THEN
    RETURN 10.00;
  ELSEIF order_count >= 10 THEN
    RETURN 5.00;
  ELSE
    RETURN 0.00;
  END IF;
END //

DELIMITER ;
```

```sql
SELECT
  c.name,
  GetDiscountPct(c.id) AS discount_pct,
  p.price * (1 - GetDiscountPct(c.id) / 100) AS discounted_price
FROM customers c
CROSS JOIN products p
WHERE p.id = 99;
```

## Viewing and Dropping Functions

```sql
-- List all functions in a database
SHOW FUNCTION STATUS WHERE Db = 'your_database';

-- View function definition
SHOW CREATE FUNCTION GetCustomerTotalOrders;

-- Drop a function
DROP FUNCTION IF EXISTS GetCustomerTotalOrders;
```

## Granting Execute Permission

```sql
GRANT EXECUTE ON FUNCTION your_database.GetDiscountPct TO 'app_user'@'%';
```

## Enabling Binary Log Safety

If binary logging is enabled, MySQL may require the function to be declared as either `DETERMINISTIC` or `NO SQL` / `READS SQL DATA` to allow creation. If not:

```sql
SET GLOBAL log_bin_trust_function_creators = ON;
```

Or in `my.cnf`:

```text
[mysqld]
log_bin_trust_function_creators = ON
```

## Summary

MySQL stored functions return a single scalar value and can be embedded directly in SQL queries, making them ideal for computed columns, transformations, and lookup helpers. Always declare the appropriate determinism and SQL security characteristics. Use `READS SQL DATA` for functions that query the database and `DETERMINISTIC` when the same inputs always produce the same output.
