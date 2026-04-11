# MySQL Trigger Syntax Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, Syntax, Cheat Sheet

Description: Quick reference for MySQL trigger syntax covering BEFORE/AFTER INSERT/UPDATE/DELETE, NEW/OLD references, multiple triggers, and trigger management commands.

---

## Trigger Syntax

```sql
DELIMITER $$

CREATE TRIGGER trigger_name
  {BEFORE | AFTER} {INSERT | UPDATE | DELETE}
  ON table_name
  FOR EACH ROW
  [FOLLOWS | PRECEDES other_trigger]
BEGIN
  -- trigger body
END $$

DELIMITER ;
```

## BEFORE INSERT

```sql
DELIMITER $$
CREATE TRIGGER trg_before_insert_orders
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  IF NEW.total < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Order total cannot be negative';
  END IF;
  SET NEW.created_at = NOW();
END $$
DELIMITER ;
```

## AFTER INSERT (audit log)

```sql
DELIMITER $$
CREATE TRIGGER trg_after_insert_orders
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
  INSERT INTO order_audit (order_id, action, changed_at)
  VALUES (NEW.id, 'INSERT', NOW());
END $$
DELIMITER ;
```

## BEFORE UPDATE

```sql
DELIMITER $$
CREATE TRIGGER trg_before_update_products
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
  IF NEW.price < 0 THEN
    SET NEW.price = 0;
  END IF;
  SET NEW.updated_at = NOW();
END $$
DELIMITER ;
```

## AFTER UPDATE

```sql
DELIMITER $$
CREATE TRIGGER trg_after_update_employees
AFTER UPDATE ON employees
FOR EACH ROW
BEGIN
  IF OLD.salary <> NEW.salary THEN
    INSERT INTO salary_history (emp_id, old_salary, new_salary, changed_at)
    VALUES (OLD.id, OLD.salary, NEW.salary, NOW());
  END IF;
END $$
DELIMITER ;
```

## BEFORE DELETE

```sql
DELIMITER $$
CREATE TRIGGER trg_before_delete_users
BEFORE DELETE ON users
FOR EACH ROW
BEGIN
  IF OLD.is_admin = 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot delete admin users';
  END IF;
END $$
DELIMITER ;
```

## AFTER DELETE

```sql
DELIMITER $$
CREATE TRIGGER trg_after_delete_orders
AFTER DELETE ON orders
FOR EACH ROW
BEGIN
  DELETE FROM order_items WHERE order_id = OLD.id;
END $$
DELIMITER ;
```

## NEW and OLD Reference Table

```text
Event   | OLD available | NEW available
--------+---------------+--------------
INSERT  | No            | Yes
UPDATE  | Yes           | Yes
DELETE  | Yes           | No
```

```sql
-- In BEFORE trigger: NEW values can be modified
SET NEW.column = some_value;

-- In AFTER trigger: values are read-only
-- OLD.column is always read-only
```

## Multiple Triggers on the Same Event (MySQL 5.7+)

```sql
CREATE TRIGGER trg_second_after_insert
AFTER INSERT ON orders
FOR EACH ROW
FOLLOWS trg_first_after_insert
BEGIN
  -- runs after trg_first_after_insert
END;
```

## Trigger Management

```sql
-- List triggers
SHOW TRIGGERS FROM mydb;
-- LIKE filters by table name, not trigger name
SHOW TRIGGERS LIKE 'orders%';

-- Inspect definition
SHOW CREATE TRIGGER trg_after_insert_orders;

-- Drop a trigger
DROP TRIGGER IF EXISTS trg_after_insert_orders;
```

## Preventing Recursive Triggers

```sql
-- Use a session variable to guard against recursive/cascading trigger calls
DELIMITER $$
CREATE TRIGGER trg_after_update_inventory
AFTER UPDATE ON inventory
FOR EACH ROW
BEGIN
  IF @trigger_running IS NULL THEN
    SET @trigger_running = TRUE;
    INSERT INTO inventory_log VALUES (NEW.id, NOW());
    SET @trigger_running = NULL;
  END IF;
END $$
DELIMITER ;
```

## Summary

MySQL triggers fire automatically on INSERT, UPDATE, or DELETE events. Use BEFORE triggers to validate or modify incoming data and AFTER triggers for side effects like audit logging. NEW references the incoming row; OLD references the previous row. Triggers cannot return result sets and should be kept lightweight to avoid adding latency to every DML statement.
