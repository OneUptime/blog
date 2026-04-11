# How to Use SIGNAL and RESIGNAL in MySQL Stored Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Error Handling, Signal, RESIGNAL, SQL

Description: Learn how to raise custom errors with SIGNAL and re-raise caught errors with RESIGNAL inside MySQL stored procedures.

---

## Overview

MySQL's `SIGNAL` statement lets you raise a custom error or warning condition from within a stored procedure, trigger, or function. `RESIGNAL` lets you re-raise a condition that was caught by a handler, optionally changing its attributes. Together they give you full control over error propagation in procedural MySQL code.

## SIGNAL Syntax

```sql
SIGNAL SQLSTATE 'value'
    SET MESSAGE_TEXT = 'your error message',
        MYSQL_ERRNO   = error_code;
```

`SQLSTATE` is a five-character code following the SQL standard. The first two characters represent the class:
- `'45000'` - user-defined unhandled exception (most common for custom errors)
- `'01xxx'` - warning class
- `'02xxx'` - no data class

## Raising a Custom Error with SIGNAL

```sql
DELIMITER $$
CREATE PROCEDURE transfer_funds(
    IN p_from_account INT,
    IN p_to_account   INT,
    IN p_amount       DECIMAL(12,2)
)
BEGIN
    DECLARE v_balance DECIMAL(12,2);

    SELECT balance INTO v_balance
    FROM accounts
    WHERE id = p_from_account
    FOR UPDATE;

    IF v_balance < p_amount THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient funds for transfer',
                MYSQL_ERRNO   = 1644;
    END IF;

    UPDATE accounts SET balance = balance - p_amount WHERE id = p_from_account;
    UPDATE accounts SET balance = balance + p_amount WHERE id = p_to_account;
END$$
DELIMITER ;
```

When the balance is insufficient, MySQL raises error 1644 with the custom message and the procedure terminates immediately. Note that `SIGNAL` does not automatically roll back the current transaction — the caller is responsible for issuing a `ROLLBACK` if needed.

## Raising a Warning Instead of an Error

Use a `01` class SQLSTATE to raise a warning (execution continues):

```sql
DELIMITER $$
CREATE PROCEDURE log_if_low_stock(IN p_product_id INT)
BEGIN
    DECLARE v_qty INT;

    SELECT quantity INTO v_qty FROM products WHERE id = p_product_id;

    IF v_qty < 10 THEN
        SIGNAL SQLSTATE '01000'
            SET MESSAGE_TEXT = 'Product stock is running low';
    END IF;
END$$
DELIMITER ;
```

## RESIGNAL: Re-Raising a Caught Condition

`RESIGNAL` is used inside a `DECLARE HANDLER` block to re-raise the current condition after performing cleanup actions. Without arguments, it re-raises the condition unchanged:

```sql
DELIMITER $$
CREATE PROCEDURE safe_delete_order(IN p_order_id INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Log the error, then re-raise it
        INSERT INTO error_log (procedure_name, error_time)
        VALUES ('safe_delete_order', NOW());
        RESIGNAL;
    END;

    DELETE FROM order_items WHERE order_id = p_order_id;
    DELETE FROM orders      WHERE id       = p_order_id;
END$$
DELIMITER ;
```

## RESIGNAL with Modified Attributes

You can change the message or SQLSTATE when re-raising:

```sql
DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
    RESIGNAL SET MESSAGE_TEXT = 'Order deletion failed - see error_log for details';
END;
```

## SIGNAL vs RESIGNAL

| Statement | Where Used | Purpose |
|---|---|---|
| SIGNAL | Anywhere in body | Raise a new condition |
| RESIGNAL | Inside a DECLARE HANDLER | Re-raise the caught condition, optionally modifying it |

## Catching a SIGNAL in the Caller

When a procedure raises a `SIGNAL`, the calling code sees it as a regular MySQL error. In Python:

```python
import mysql.connector
from mysql.connector import Error

try:
    cursor.callproc("transfer_funds", [1, 2, 1000000.00])
except Error as e:
    print(f"Error {e.errno}: {e.msg}")
    # Error 1644: Insufficient funds for transfer
```

## Available SET Attributes for SIGNAL

```sql
SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT     = 'Custom message',
        MYSQL_ERRNO       = 1644,
        CONSTRAINT_CATALOG = 'def',
        CONSTRAINT_SCHEMA  = 'shop',
        CONSTRAINT_NAME    = 'balance_check',
        TABLE_NAME         = 'accounts',
        COLUMN_NAME        = 'balance';
```

The additional attributes help clients surface structured error context.

## Summary

`SIGNAL` raises user-defined errors or warnings inside MySQL stored procedures, while `RESIGNAL` re-raises a caught condition after a handler has had a chance to run cleanup code. Use `SQLSTATE '45000'` for custom errors that should abort execution. Use `RESIGNAL` in exit handlers when you want to log or enrich an error without swallowing it.
