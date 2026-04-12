# How to Use DETERMINISTIC and NOT DETERMINISTIC in MySQL Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Function, Deterministic, Replication, Optimization

Description: Learn what DETERMINISTIC and NOT DETERMINISTIC mean in MySQL functions, when to use each, and how they affect replication and query optimization.

---

When you create a stored function in MySQL, you must declare one of several data-access and determinism characteristics. The `DETERMINISTIC` and `NOT DETERMINISTIC` keywords tell MySQL whether the function always returns the same result for the same input values.

## What DETERMINISTIC Means

A function is `DETERMINISTIC` if it always produces the same output for the same input, regardless of when or how many times it is called:

```sql
DELIMITER //

CREATE FUNCTION circle_area(p_radius DOUBLE)
RETURNS DOUBLE
DETERMINISTIC
NO SQL
BEGIN
    RETURN PI() * p_radius * p_radius;
END //

DELIMITER ;
```

`circle_area(5)` always returns the same value, so it qualifies as `DETERMINISTIC`.

## What NOT DETERMINISTIC Means

A function is `NOT DETERMINISTIC` if its return value can differ across calls with identical inputs - for example because it reads from a table that changes, uses `NOW()`, or generates random numbers:

```sql
DELIMITER //

CREATE FUNCTION get_product_price(p_id INT)
RETURNS DECIMAL(10,2)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_price DECIMAL(10,2);
    SELECT price INTO v_price FROM products WHERE product_id = p_id;
    RETURN v_price;
END //

DELIMITER ;
```

The price for product 42 could change between calls, so this function is `NOT DETERMINISTIC`.

## Why the Declaration Matters

### Binary Logging and Replication

When binary logging is enabled (the default in MySQL 8.0+), MySQL requires that stored functions are declared as `DETERMINISTIC`, `NO SQL`, or `READS SQL DATA`. If you omit these keywords, MySQL raises an error:

```text
ERROR 1418: This function has none of DETERMINISTIC, NO SQL, or READS SQL DATA in its declaration
```

Check whether binary logging is enabled:

```sql
SHOW VARIABLES LIKE 'log_bin';
```

Add the appropriate data-access characteristic to the function to resolve the error. Note that `DETERMINISTIC` or `NOT DETERMINISTIC` can only be set when creating the function, not with `ALTER FUNCTION`:

```sql
ALTER FUNCTION get_product_price READS SQL DATA;
```

### Query Optimization

The optimizer may cache the result of a `DETERMINISTIC` function when called with the same arguments within a single query execution. With `NOT DETERMINISTIC`, it must re-evaluate on every row, which can be slower.

## Choosing the Right Declaration

```text
Function behavior                      | Use
---------------------------------------|-----------------------------
Pure math, no table reads              | DETERMINISTIC NO SQL
Reads table data, same row every time  | NOT DETERMINISTIC READS SQL DATA
May return different results per call  | NOT DETERMINISTIC
Uses NOW(), RAND(), or volatile data   | NOT DETERMINISTIC
```

Example of a correctly declared function that reads data:

```sql
DELIMITER //

CREATE FUNCTION username_exists(p_username VARCHAR(50))
RETURNS TINYINT(1)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users WHERE username = p_username
    );
END //

DELIMITER ;
```

## Summary

`DETERMINISTIC` tells MySQL the function always returns the same value for the same input, enabling query optimizations and satisfying statement-based replication requirements. Use `NOT DETERMINISTIC` honestly for functions that depend on external state like table contents, the current time, or random values to avoid incorrect query results or replication errors.
