# How to Choose Between Stored Procedures and Stored Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Stored Function, Database Design, Best Practice

Description: Understand the key differences between MySQL stored procedures and stored functions so you can choose the right one for each use case.

---

Stored procedures and stored functions are both named, reusable blocks of SQL. The difference lies in how they return data, where they can be used, and what side effects they are allowed to have.

## Key Differences at a Glance

```text
Feature                  | Stored Procedure        | Stored Function
-------------------------|-------------------------|------------------------
Called with              | CALL proc_name()        | SELECT func_name()
Returns value            | Via OUT/INOUT params    | Single RETURN value
Use in SELECT/WHERE      | No                      | Yes
Can modify tables        | Yes                     | Limited (by characteristic)
Transaction control      | Yes (COMMIT/ROLLBACK)   | No
Multiple result sets     | Yes                     | No
```

## When to Use a Stored Procedure

Use a stored procedure when you need to:
- Execute a sequence of DML statements (INSERT, UPDATE, DELETE)
- Use explicit transactions with `COMMIT` and `ROLLBACK`
- Return multiple result sets
- Use `OUT` or `INOUT` parameters

```sql
DELIMITER //

CREATE PROCEDURE register_user(
    IN  p_email    VARCHAR(255),
    IN  p_password VARCHAR(255),
    OUT p_user_id  INT
)
BEGIN
    START TRANSACTION;

    INSERT INTO users (email, password_hash, created_at)
    VALUES (p_email, SHA2(p_password, 256), NOW());

    SET p_user_id = LAST_INSERT_ID();

    INSERT INTO user_settings (user_id, theme, notify_email)
    VALUES (p_user_id, 'light', 1);

    COMMIT;
END //

DELIMITER ;
```

Call it:

```sql
CALL register_user('alice@example.com', 'secret', @uid);
SELECT @uid;
```

## When to Use a Stored Function

Use a stored function when you need to:
- Compute and return a single scalar value
- Embed logic inside a `SELECT`, `WHERE`, `ORDER BY`, or `GROUP BY` clause
- Reuse a deterministic calculation across many queries

```sql
DELIMITER //

CREATE FUNCTION tax_amount(p_subtotal DECIMAL(10,2), p_rate DECIMAL(5,4))
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    RETURN ROUND(p_subtotal * p_rate, 2);
END //

DELIMITER ;
```

Use it inline:

```sql
SELECT
    order_id,
    subtotal,
    tax_amount(subtotal, 0.0875) AS tax,
    subtotal + tax_amount(subtotal, 0.0875) AS total
FROM orders;
```

## The DETERMINISTIC Distinction

Functions meant for use in queries should be declared `DETERMINISTIC` (same inputs always produce the same output). This allows the optimizer to cache results and is required for use with binary logging in statement mode.

```sql
-- Not deterministic because CURDATE() changes daily
CREATE FUNCTION days_until_expiry(p_expires DATE)
RETURNS INT
NOT DETERMINISTIC
BEGIN
    RETURN DATEDIFF(p_expires, CURDATE());
END;
```

## Mixing Both

A stored procedure can call a stored function, letting you compose reusable logic:

```sql
DELIMITER //

CREATE PROCEDURE apply_discount(IN p_order_id INT)
BEGIN
    UPDATE orders
    SET total_price = subtotal + tax_amount(subtotal, 0.0875)
    WHERE order_id = p_order_id;
END //

DELIMITER ;
```

## Summary

Choose a stored procedure when the task involves multiple statements, transactions, or returning multiple rows. Choose a stored function when you need a reusable scalar calculation that must be usable inside SQL expressions. Using each type for its intended purpose keeps code readable and maintainable.
