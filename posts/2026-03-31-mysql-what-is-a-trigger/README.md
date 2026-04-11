# What Is a Trigger in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, Automation, DML, Database Programming

Description: A trigger in MySQL is a stored program that automatically executes in response to INSERT, UPDATE, or DELETE operations on a specific table.

---

## Overview

A trigger is a database object associated with a table that fires automatically when a specific DML event occurs. You define triggers to run `BEFORE` or `AFTER` an `INSERT`, `UPDATE`, or `DELETE` statement. Within the trigger body, you have access to special `OLD` and `NEW` pseudo-records that reference the row values before and after the change. Triggers are commonly used for audit logging, data validation, maintaining derived data, and enforcing complex constraints.

## Trigger Types

MySQL supports six trigger types, one for each combination of timing and event:

- `BEFORE INSERT`
- `AFTER INSERT`
- `BEFORE UPDATE`
- `AFTER UPDATE`
- `BEFORE DELETE`
- `AFTER DELETE`

## Creating a Trigger

```sql
DELIMITER $$

CREATE TRIGGER after_order_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, action, record_id, changed_at)
  VALUES ('orders', 'INSERT', NEW.id, NOW());
END$$

DELIMITER ;
```

## Accessing OLD and NEW Values

- `NEW.column_name`: The value being inserted or the updated value.
- `OLD.column_name`: The original value before an update or delete.

```sql
DELIMITER $$

CREATE TRIGGER before_order_update
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
  -- Prevent reducing order total below zero
  IF NEW.total < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Order total cannot be negative';
  END IF;

  -- Automatically update the modified_at timestamp
  SET NEW.modified_at = NOW();
END$$

DELIMITER ;
```

## Audit Logging with Triggers

A common use case is tracking changes for audit purposes:

```sql
CREATE TABLE orders_audit (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  action ENUM('INSERT','UPDATE','DELETE'),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by VARCHAR(100),
  changed_at DATETIME
);

DELIMITER $$

CREATE TRIGGER after_order_status_change
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO orders_audit (order_id, action, old_status, new_status, changed_by, changed_at)
    VALUES (NEW.id, 'UPDATE', OLD.status, NEW.status, USER(), NOW());
  END IF;
END$$

DELIMITER ;
```

## Viewing and Dropping Triggers

```sql
-- List all triggers in current database
SHOW TRIGGERS;

-- View trigger definition
SHOW CREATE TRIGGER after_order_insert;

-- Drop a trigger
DROP TRIGGER IF EXISTS after_order_insert;
```

## Limitations

- Triggers cannot call stored procedures that return data to the client or that use transactions (`COMMIT`/`ROLLBACK`).
- Triggers do not fire for operations performed by replication SQL thread by default.
- MySQL prevents recursive trigger execution by design -- a trigger cannot activate itself.
- Triggers add overhead to DML operations; complex trigger logic on high-throughput tables can impact performance.

## Summary

MySQL triggers execute automatically in response to DML events on a table, before or after the event fires. They are powerful for audit logging, data validation, and maintaining derived columns without requiring application code changes. Triggers should be used judiciously -- overusing them makes schemas harder to understand and debug. Document triggers clearly alongside table definitions.
