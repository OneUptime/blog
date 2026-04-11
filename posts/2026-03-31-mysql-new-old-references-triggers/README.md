# How to Use NEW and OLD References in MySQL Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, NEW, OLD, Row Reference

Description: Learn how MySQL trigger row references NEW and OLD work across INSERT, UPDATE, and DELETE triggers with practical examples.

---

Inside a MySQL trigger body you access row data through two special pseudo-records: `NEW` and `OLD`. Understanding which one is available for each trigger type - and what you can do with them - is fundamental to writing correct trigger logic.

## Availability by Trigger Type

```text
Trigger type    | OLD available | NEW available | NEW is writable
----------------|--------------|---------------|----------------
BEFORE INSERT   | No           | Yes           | Yes
AFTER INSERT    | No           | Yes           | No
BEFORE UPDATE   | Yes          | Yes           | Yes
AFTER UPDATE    | Yes          | Yes           | No
BEFORE DELETE   | Yes          | No            | N/A
AFTER DELETE    | Yes          | No            | N/A
```

## Using NEW in an INSERT Trigger

In a `BEFORE INSERT` trigger you can read and modify incoming values:

```sql
DELIMITER //

CREATE TRIGGER trg_users_before_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    -- Normalize email to lowercase before storing
    SET NEW.email = LOWER(NEW.email);

    -- Default the status if not provided
    IF NEW.status IS NULL THEN
        SET NEW.status = 'pending';
    END IF;
END //

DELIMITER ;
```

## Using OLD and NEW in an UPDATE Trigger

Both records are available. Compare them to detect actual changes:

```sql
DELIMITER //

CREATE TRIGGER trg_products_price_audit
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    IF OLD.price <> NEW.price THEN
        INSERT INTO price_changes (product_id, old_price, new_price, changed_at)
        VALUES (OLD.product_id, OLD.price, NEW.price, NOW());
    END IF;
END //

DELIMITER ;
```

`OLD.price` is the value before the update; `NEW.price` is the value being written.

## Using OLD in a DELETE Trigger

Only `OLD` exists - there is no incoming row:

```sql
DELIMITER //

CREATE TRIGGER trg_orders_after_delete
AFTER DELETE ON orders
FOR EACH ROW
BEGIN
    INSERT INTO deleted_orders_log (order_id, user_id, total, deleted_at)
    VALUES (OLD.order_id, OLD.user_id, OLD.total, NOW());
END //

DELIMITER ;
```

## Modifying NEW Values in BEFORE Triggers

Assigning to `NEW.column` in a `BEFORE INSERT` or `BEFORE UPDATE` trigger changes the value that gets written to the table:

```sql
DELIMITER //

CREATE TRIGGER trg_employees_normalize
BEFORE INSERT ON employees
FOR EACH ROW
BEGIN
    SET NEW.first_name = CONCAT(UPPER(LEFT(NEW.first_name, 1)),
                               LOWER(SUBSTRING(NEW.first_name, 2)));
    SET NEW.hired_date = COALESCE(NEW.hired_date, CURDATE());
END //

DELIMITER ;
```

In `AFTER` triggers, `NEW` is read-only because the row has already been written.

## Preventing a Change Based on OLD vs NEW

Use `OLD` to compare with `NEW` and block an unwanted change:

```sql
DELIMITER //

CREATE TRIGGER trg_prevent_status_regression
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
    IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot revert a completed order status';
    END IF;
END //

DELIMITER ;
```

## Summary

`NEW` provides the incoming row values for `INSERT` and `UPDATE` triggers and is writable in `BEFORE` triggers. `OLD` provides the existing row values for `UPDATE` and `DELETE` triggers and is always read-only. Comparing `OLD` and `NEW` is the standard pattern for conditional audit logging and change detection.
