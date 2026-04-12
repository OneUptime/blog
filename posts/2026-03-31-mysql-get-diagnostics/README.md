# How to Use GET DIAGNOSTICS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GET DIAGNOSTICS, Error Handling, Stored Procedure

Description: Learn how to use GET DIAGNOSTICS in MySQL stored procedures to retrieve detailed error and warning information after SQL statement execution.

---

## What Is GET DIAGNOSTICS

`GET DIAGNOSTICS` is a SQL standard statement available in MySQL 5.6+ that retrieves detailed diagnostic information about the most recently executed SQL statement. It provides access to error codes, SQLSTATE values, and error messages from within stored procedures and functions, giving you richer error handling than simple condition handlers.

## Diagnostics Area Structure

MySQL maintains two types of information in the diagnostics area:

- **Statement information** - number of conditions (errors/warnings), number of rows affected
- **Condition information** - per-error details: error code, SQLSTATE, message text

## Basic Usage

```sql
DELIMITER $$
CREATE PROCEDURE demo_get_diagnostics()
BEGIN
  DECLARE v_row_count     INT;
  DECLARE v_condition_count INT;

  -- Execute a statement
  UPDATE orders SET status = 'SHIPPED' WHERE status = 'PROCESSING';

  -- Retrieve statement-level diagnostics
  GET DIAGNOSTICS
    v_row_count       = ROW_COUNT,
    v_condition_count = NUMBER;

  SELECT v_row_count       AS rows_updated,
         v_condition_count AS warnings;
END$$
DELIMITER ;
```

## Retrieving Condition Details

Each condition (error or warning) can be inspected by index:

```sql
DELIMITER $$
CREATE PROCEDURE demo_condition_details()
BEGIN
  DECLARE v_number     INT;
  DECLARE v_errno      INT;
  DECLARE v_sqlstate   VARCHAR(5);
  DECLARE v_message    TEXT;

  -- Force a warning (truncation)
  INSERT INTO some_table (short_col) VALUES (REPEAT('x', 300));

  -- How many conditions were raised?
  GET DIAGNOSTICS v_number = NUMBER;

  -- Inspect condition 1
  IF v_number > 0 THEN
    GET DIAGNOSTICS CONDITION 1
      v_errno    = MYSQL_ERRNO,
      v_sqlstate = RETURNED_SQLSTATE,
      v_message  = MESSAGE_TEXT;

    SELECT v_errno    AS error_code,
           v_sqlstate AS sqlstate,
           v_message  AS message;
  END IF;
END$$
DELIMITER ;
```

## Available Diagnostic Items

```text
Statement-level items:
  NUMBER          - count of conditions raised
  ROW_COUNT       - rows affected by last DML statement

Condition-level items (per index):
  CLASS_ORIGIN        - standard that defines the SQLSTATE class
  SUBCLASS_ORIGIN     - standard that defines the SQLSTATE subclass
  RETURNED_SQLSTATE   - SQLSTATE value (e.g., '23000')
  MYSQL_ERRNO         - MySQL error number (e.g., 1062)
  MESSAGE_TEXT        - human-readable error message
  CONSTRAINT_CATALOG  - catalog of the violated constraint
  CONSTRAINT_SCHEMA   - schema of the violated constraint
  CONSTRAINT_NAME     - name of the violated constraint
  CATALOG_NAME        - catalog related to the condition
  SCHEMA_NAME         - schema related to the condition
  TABLE_NAME          - table involved in the error
  COLUMN_NAME         - column involved in the error
  CURSOR_NAME         - cursor name related to the condition
```

## Practical Error Logging Example

```sql
DELIMITER $$
CREATE PROCEDURE safe_insert_order(
  IN p_customer_id BIGINT,
  IN p_total       DECIMAL(10,2)
)
BEGIN
  DECLARE v_errno   INT     DEFAULT 0;
  DECLARE v_msg     TEXT    DEFAULT '';
  DECLARE v_sqlstate VARCHAR(5) DEFAULT '00000';

  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1
      v_errno    = MYSQL_ERRNO,
      v_sqlstate = RETURNED_SQLSTATE,
      v_msg      = MESSAGE_TEXT;

    INSERT INTO error_log (procedure_name, error_code, sqlstate, message, logged_at)
    VALUES ('safe_insert_order', v_errno, v_sqlstate, v_msg, NOW());
  END;

  INSERT INTO orders (customer_id, total, status)
  VALUES (p_customer_id, p_total, 'PENDING');

  IF v_errno != 0 THEN
    SELECT CONCAT('Error ', v_errno, ': ', v_msg) AS error_detail;
  ELSE
    SELECT LAST_INSERT_ID() AS new_order_id;
  END IF;
END$$
DELIMITER ;
```

## Stacking Diagnostics

`GET DIAGNOSTICS` can be called multiple times within the same condition handler. Use `GET STACKED DIAGNOSTICS` (available in MySQL 5.7+) inside a handler to read the original error after the diagnostics area has been modified by other statements:

```sql
DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
BEGIN
  -- GET DIAGNOSTICS reads the current area (may be cleared by other statements)
  -- GET STACKED DIAGNOSTICS reads the saved area from when the condition was raised
  GET STACKED DIAGNOSTICS CONDITION 1
    v_errno = MYSQL_ERRNO,
    v_msg   = MESSAGE_TEXT;
END;
```

## Summary

`GET DIAGNOSTICS` provides structured access to error and warning details after a SQL statement executes inside a stored procedure. Use it to log error codes, SQLSTATE values, and messages for debugging and audit trails. Combine it with `DECLARE CONTINUE HANDLER FOR SQLEXCEPTION` for robust error recovery, and use `GET STACKED DIAGNOSTICS` inside handlers to safely read the original error after the diagnostics area has been modified.
