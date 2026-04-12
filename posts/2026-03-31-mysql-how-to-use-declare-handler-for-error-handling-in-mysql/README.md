# How to Use DECLARE HANDLER for Error Handling in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Error Handling, SQL

Description: Learn how to use DECLARE HANDLER in MySQL stored procedures to catch SQL errors, warnings, and not-found conditions and handle them gracefully.

---

## What Is DECLARE HANDLER?

`DECLARE HANDLER` defines an error handler inside a stored procedure or function. When a specified condition occurs (an SQL error, warning, or not-found condition), MySQL executes the handler's action instead of aborting the procedure.

## Handler Syntax

```sql
DECLARE handler_action HANDLER
  FOR condition_value [, condition_value ...]
  handler_statement;
```

- `handler_action`: `CONTINUE` (keep executing) or `EXIT` (exit the current `BEGIN...END` block)
- `condition_value`: the error or condition to handle
- `handler_statement`: a single statement or `BEGIN...END` block to execute

## Common Condition Values

| Condition | Meaning |
|---|---|
| `SQLEXCEPTION` | Any SQL error (SQLSTATE values not beginning with '00', '01', or '02') |
| `SQLWARNING` | Any warning (SQLSTATE class '01') |
| `NOT FOUND` | Cursor exhausted or no rows matched |
| `SQLSTATE 'XXXXX'` | Specific SQLSTATE value |
| `1062` | MySQL error code (e.g., duplicate entry) |

## Handling NOT FOUND in a Cursor

The most common handler catches the end-of-cursor condition:

```sql
DELIMITER //

CREATE PROCEDURE ListCustomerEmails()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE cust_email VARCHAR(255);

  DECLARE cust_cursor CURSOR FOR
    SELECT email FROM customers WHERE active = 1;

  DECLARE CONTINUE HANDLER FOR NOT FOUND
    SET done = TRUE;

  OPEN cust_cursor;

  read_loop: LOOP
    FETCH cust_cursor INTO cust_email;
    IF done THEN
      LEAVE read_loop;
    END IF;
    SELECT cust_email;
  END LOOP;

  CLOSE cust_cursor;
END //

DELIMITER ;
```

## Handling Duplicate Key Errors

```sql
DELIMITER //

CREATE PROCEDURE SafeInsertCustomer(
  IN p_email VARCHAR(255),
  IN p_name VARCHAR(100),
  OUT p_result VARCHAR(100)
)
BEGIN
  DECLARE duplicate_key INT DEFAULT FALSE;

  DECLARE CONTINUE HANDLER FOR 1062
    SET duplicate_key = TRUE;

  INSERT INTO customers (email, name) VALUES (p_email, p_name);

  IF duplicate_key THEN
    SET p_result = 'Email already exists';
  ELSE
    SET p_result = 'Customer inserted successfully';
  END IF;
END //

DELIMITER ;
```

```sql
CALL SafeInsertCustomer('user@example.com', 'Alice', @res);
SELECT @res;
```

## EXIT Handler for Cleanup

An `EXIT` handler stops the enclosing block and can perform cleanup:

```sql
DELIMITER //

CREATE PROCEDURE TransferFunds(
  IN from_id INT,
  IN to_id INT,
  IN amount DECIMAL(10, 2),
  OUT result VARCHAR(100)
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET result = 'Transfer failed - rolled back';
  END;

  START TRANSACTION;

  UPDATE accounts SET balance = balance - amount WHERE id = from_id;
  UPDATE accounts SET balance = balance + amount WHERE id = to_id;

  COMMIT;
  SET result = 'Transfer successful';
END //

DELIMITER ;
```

## Using GET DIAGNOSTICS to Get Error Details

After handling an error, retrieve the error message with `GET DIAGNOSTICS`:

```sql
DELIMITER //

CREATE PROCEDURE InsertWithLogging(
  IN p_data VARCHAR(255),
  OUT p_status VARCHAR(200)
)
BEGIN
  DECLARE v_sqlstate CHAR(5);
  DECLARE v_message TEXT;

  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1
      v_sqlstate = RETURNED_SQLSTATE,
      v_message  = MESSAGE_TEXT;
    SET p_status = CONCAT('Error ', v_sqlstate, ': ', v_message);
  END;

  INSERT INTO data_table (data) VALUES (p_data);
  SET p_status = 'OK';
END //

DELIMITER ;
```

## Handler Precedence and Scope

- Handlers are scoped to the `BEGIN...END` block in which they are declared.
- A handler in an inner block takes precedence over one in an outer block.
- The `DECLARE` order matters: handlers must be declared after cursors and variables but can be in any order relative to other handlers.

## Summary

`DECLARE HANDLER` in MySQL stored procedures provides structured error handling by catching SQL errors, warnings, and not-found conditions. Use `CONTINUE` handlers to keep execution going after recoverable errors, and `EXIT` handlers with `ROLLBACK` for transactions that must be entirely reversed on failure. Always capture error details with `GET DIAGNOSTICS` for logging or returning informative messages to the caller.
