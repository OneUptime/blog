# What Is a Stored Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Function, Routine, SQL, Database Programming

Description: A stored function in MySQL is a named database routine that accepts parameters, executes SQL logic, and returns a single scalar value usable in SQL expressions.

---

## Overview

A stored function is a named database object in MySQL that encapsulates SQL logic and returns a single value. (Note: stored functions are distinct from loadable functions, sometimes called UDFs, which are compiled from external code like C/C++.) Unlike stored procedures, functions can be used directly inside SQL expressions -- in `SELECT` columns, `WHERE` clauses, and `ORDER BY` -- making them more composable. Functions must return a value and cannot use `OUT` parameters or return result sets.

## Creating a Stored Function

```sql
DELIMITER $$

CREATE FUNCTION calculate_tax(
  p_amount DECIMAL(10,2),
  p_rate DECIMAL(5,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
NO SQL
BEGIN
  RETURN ROUND(p_amount * p_rate / 100, 2);
END$$

DELIMITER ;
```

Use it in a query:

```sql
SELECT
  product_name,
  price,
  calculate_tax(price, 8.5) AS tax,
  price + calculate_tax(price, 8.5) AS total_with_tax
FROM products;
```

## DETERMINISTIC vs NOT DETERMINISTIC

MySQL requires you to declare whether a function always returns the same result for the same inputs:

- `DETERMINISTIC`: Same inputs always produce the same output (e.g., mathematical calculations). When binary logging is enabled with statement-based format, functions must be declared `DETERMINISTIC` (or `NO SQL`/`READS SQL DATA`) to be created and executed, unless `log_bin_trust_function_creators` is enabled.
- `NOT DETERMINISTIC`: Output may vary (e.g., functions that call `NOW()` or read from tables).

```sql
DELIMITER $$

CREATE FUNCTION get_customer_tier(p_customer_id INT)
RETURNS VARCHAR(20)
READS SQL DATA
NOT DETERMINISTIC
BEGIN
  DECLARE v_total DECIMAL(10,2);
  SELECT SUM(total) INTO v_total
  FROM orders
  WHERE customer_id = p_customer_id;

  RETURN CASE
    WHEN v_total >= 10000 THEN 'platinum'
    WHEN v_total >= 1000 THEN 'gold'
    ELSE 'standard'
  END;
END$$

DELIMITER ;
```

## Data Access Characteristics

Declare what data the function accesses:

- `NO SQL`: Contains no SQL statements.
- `READS SQL DATA`: Reads tables but does not modify them.
- `MODIFIES SQL DATA`: Modifies tables (unusual for functions).
- `CONTAINS SQL`: Contains SQL but neither reads nor writes (default).

## Stored Functions vs Stored Procedures

| Feature | Function | Procedure |
|---|---|---|
| Returns value | Yes (scalar) | Via OUT params or result sets |
| Usable in SELECT | Yes | No |
| Can return result set | No | Yes |
| Can modify data | Yes (with restrictions) | Yes |
| Transaction control | No | Yes |

## Using Functions in WHERE and ORDER BY

```sql
-- Filter using a stored function
SELECT * FROM orders
WHERE calculate_tax(total, 8.5) > 50;

-- Sort using a stored function
SELECT product_name, price
FROM products
ORDER BY calculate_tax(price, 8.5) DESC;
```

## Viewing and Dropping Functions

```sql
-- List all stored functions in current database
SHOW FUNCTION STATUS WHERE Db = DATABASE();

-- View function definition
SHOW CREATE FUNCTION calculate_tax;

-- Drop a function
DROP FUNCTION IF EXISTS calculate_tax;
```

## Summary

Stored functions in MySQL encapsulate reusable logic that returns a single scalar value and can be used anywhere a scalar expression is valid in SQL. They are more composable than stored procedures because they integrate directly into queries. Functions are ideal for calculations, lookups, and transformations that need to be consistent across many queries. They require explicit declaration of whether they are deterministic and what data they access.
