# How to Handle Errors in MySQL Stored Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Function, Error Handling, Handler, Exception

Description: Learn how to handle errors in MySQL stored functions using DECLARE HANDLER, SIGNAL, and defensive patterns to return safe default values.

---

Error handling in MySQL stored functions is more constrained than in stored procedures. Functions cannot use `COMMIT` or `ROLLBACK`, but they can declare condition handlers and use `SIGNAL` to raise custom errors. Understanding these limits helps you write robust functions.

## Declaring a CONTINUE Handler

The simplest approach is a defensive check that prevents the error before it occurs:

```sql
DELIMITER //

CREATE FUNCTION safe_divide(p_numerator DECIMAL(10,2), p_denominator DECIMAL(10,2))
RETURNS DECIMAL(10,2)
DETERMINISTIC
NO SQL
BEGIN
    IF p_denominator = 0 THEN
        RETURN NULL;
    END IF;
    RETURN p_numerator / p_denominator;
END //

DELIMITER ;
```

For SQL errors from table reads, use `DECLARE CONTINUE HANDLER FOR SQLEXCEPTION`:

```sql
DELIMITER //

CREATE FUNCTION get_account_balance(p_account_id INT)
RETURNS DECIMAL(12,2)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_balance DECIMAL(12,2) DEFAULT -1;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        SET v_balance = -1;
    END;

    SELECT balance INTO v_balance
    FROM accounts
    WHERE account_id = p_account_id;

    RETURN v_balance;
END //

DELIMITER ;
```

When no row is found, `SELECT ... INTO` raises a `NOT FOUND` condition which you can catch with a `NOT FOUND` handler:

```sql
DELIMITER //

CREATE FUNCTION get_username(p_user_id INT)
RETURNS VARCHAR(100)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_name  VARCHAR(100) DEFAULT 'Unknown';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_name = 'Unknown';

    SELECT username INTO v_name FROM users WHERE user_id = p_user_id;

    RETURN v_name;
END //

DELIMITER ;
```

## Raising Custom Errors with SIGNAL

Use `SIGNAL` to raise a custom error from within a function when input validation fails:

```sql
DELIMITER //

CREATE FUNCTION calculate_discount(p_price DECIMAL(10,2), p_pct DECIMAL(5,2))
RETURNS DECIMAL(10,2)
DETERMINISTIC
NO SQL
BEGIN
    IF p_pct < 0 OR p_pct > 100 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Discount percentage must be between 0 and 100';
    END IF;
    RETURN ROUND(p_price * (1 - p_pct / 100), 2);
END //

DELIMITER ;
```

Testing it:

```sql
SELECT calculate_discount(100.00, 150.00);
-- ERROR 1644 (45000): Discount percentage must be between 0 and 100
```

## Handling SQL Warnings

You can catch warnings raised during operations like type conversion using the `SQLWARNING` class condition:

```sql
DELIMITER //

CREATE FUNCTION safe_cast_to_int(p_value VARCHAR(20))
RETURNS INT
DETERMINISTIC
NO SQL
BEGIN
    DECLARE v_result INT DEFAULT NULL;
    DECLARE CONTINUE HANDLER FOR SQLWARNING SET v_result = NULL;
    SET v_result = CAST(p_value AS SIGNED);
    RETURN v_result;
END //

DELIMITER ;

SELECT safe_cast_to_int('42'),    -- returns 42
       safe_cast_to_int('abc');   -- returns NULL
```

## Limitations Compared to Procedures

Unlike stored procedures, stored functions:
- Cannot use `COMMIT` or `ROLLBACK`
- Cannot call procedures that execute transactions
- Cannot return multiple result sets

If error recovery requires transaction control, move the logic to a stored procedure instead.

## Summary

Handle errors in MySQL stored functions by declaring `CONTINUE HANDLER FOR NOT FOUND` or `CONTINUE HANDLER FOR SQLEXCEPTION` to set a fallback return value, and use `SIGNAL` to raise custom errors for invalid inputs. For cases that require transaction rollback, use a stored procedure instead.
