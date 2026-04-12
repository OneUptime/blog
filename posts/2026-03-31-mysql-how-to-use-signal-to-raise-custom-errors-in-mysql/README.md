# How to Use SIGNAL to Raise Custom Errors in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Signal, Error Handling, Stored Procedure, Trigger

Description: Learn how to use SIGNAL and RESIGNAL in MySQL stored procedures and triggers to raise custom error conditions with meaningful messages and SQLSTATE codes.

---

## What Is SIGNAL in MySQL

`SIGNAL` is a MySQL statement that allows stored procedures, triggers, and functions to raise custom error conditions. It was introduced in MySQL 5.5 and allows you to:
- Return meaningful error messages to the application.
- Enforce business rules in triggers and procedures.
- Re-raise errors with additional context using `RESIGNAL`.

## Basic SIGNAL Syntax

```sql
SIGNAL SQLSTATE 'XXXXX'
  SET MESSAGE_TEXT = 'Your error message here';
```

The SQLSTATE code is a 5-character string that categorizes the error:
- `'45000'` - unhandled user-defined exception (the most common choice for custom errors).
- `'23000'` - integrity constraint violation.
- `'22007'` - invalid datetime format.

## Raising a Custom Error in a Stored Procedure

```sql
DELIMITER $$

CREATE PROCEDURE transfer_funds(
  IN from_account INT,
  IN to_account INT,
  IN amount DECIMAL(10, 2)
)
BEGIN
  DECLARE from_balance DECIMAL(10, 2);

  -- Get the current balance
  SELECT balance INTO from_balance FROM accounts WHERE id = from_account FOR UPDATE;

  -- Validate the transfer amount
  IF amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Transfer amount must be positive';
  END IF;

  -- Check sufficient funds
  IF from_balance < amount THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Insufficient funds for transfer';
  END IF;

  -- Perform the transfer
  UPDATE accounts SET balance = balance - amount WHERE id = from_account;
  UPDATE accounts SET balance = balance + amount WHERE id = to_account;
END$$

DELIMITER ;
```

Test it:

```sql
CALL transfer_funds(1, 2, -50);
-- ERROR 1644 (45000): Transfer amount must be positive

CALL transfer_funds(1, 2, 999999);
-- ERROR 1644 (45000): Insufficient funds for transfer
```

## Using SIGNAL in Triggers

`SIGNAL` in triggers allows you to abort DML operations that violate business rules:

```sql
DELIMITER $$

CREATE TRIGGER orders_before_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  IF NEW.total_amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Order total must be greater than zero',
          MYSQL_ERRNO = 1644;
  END IF;

  IF NEW.customer_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Order must be associated with a customer';
  END IF;
END$$

DELIMITER ;
```

## SIGNAL with Additional Condition Information

You can set multiple condition items for richer error information:

```sql
SIGNAL SQLSTATE '45000'
  SET
    MESSAGE_TEXT = 'Account balance would go negative',
    MYSQL_ERRNO = 1644,
    CLASS_ORIGIN = 'ISO 9075',
    CONSTRAINT_CATALOG = 'def',
    CONSTRAINT_SCHEMA = 'myapp',
    CONSTRAINT_NAME = 'positive_balance',
    TABLE_NAME = 'accounts',
    COLUMN_NAME = 'balance';
```

Available condition items:
- `MESSAGE_TEXT` - the error message string.
- `MYSQL_ERRNO` - MySQL error number (use 1644 for custom errors).
- `CLASS_ORIGIN` - origin of the SQLSTATE class.
- `TABLE_NAME`, `COLUMN_NAME` - table and column context.

## RESIGNAL - Re-Raising an Error

`RESIGNAL` re-raises the current error condition, optionally modifying it. Use it in exception handlers to add context:

```sql
DELIMITER $$

CREATE PROCEDURE update_inventory(IN p_product_id INT, IN p_qty_change INT)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    -- Re-raise the error with additional context
    RESIGNAL SET MESSAGE_TEXT = CONCAT('update_inventory failed for product_id=', p_product_id);
  END;

  UPDATE inventory
  SET quantity = quantity + p_qty_change
  WHERE product_id = p_product_id;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Product not found in inventory';
  END IF;
END$$

DELIMITER ;
```

## SIGNAL with Named Conditions

Define named conditions for reusable error codes:

```sql
DELIMITER $$

CREATE PROCEDURE validate_email(IN email VARCHAR(200))
BEGIN
  DECLARE invalid_email CONDITION FOR SQLSTATE '45001';

  IF email NOT REGEXP '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' THEN
    SIGNAL invalid_email
      SET MESSAGE_TEXT = 'Invalid email address format';
  END IF;
END$$

DELIMITER ;
```

## Handling SIGNAL in Application Code

In Python, catch the custom error:

```python
import mysql.connector

try:
    conn = mysql.connector.connect(host='localhost', user='app', password='pass', database='myapp')
    cursor = conn.cursor()
    cursor.callproc('transfer_funds', [1, 2, 99999])
    conn.commit()
except mysql.connector.errors.DatabaseError as e:
    if e.errno == 1644:
        print(f"Business rule violation: {e.msg}")
    else:
        raise
finally:
    conn.close()
```

## Summary

`SIGNAL` in MySQL allows stored procedures and triggers to raise meaningful custom errors with specific SQLSTATE codes and message text. Use SQLSTATE `'45000'` for general user-defined exceptions and set `MESSAGE_TEXT` to provide clear business-level error descriptions. Use `RESIGNAL` in exception handlers to re-raise errors with additional context. Catching error number 1644 in your application code distinguishes business rule violations from system errors.
