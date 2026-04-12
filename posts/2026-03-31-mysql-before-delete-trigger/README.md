# How to Create a BEFORE DELETE Trigger in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, BEFORE DELETE, Audit, Data Protection

Description: Learn how to create a BEFORE DELETE trigger in MySQL to archive rows, block deletions under certain conditions, or log what is about to be removed.

---

A `BEFORE DELETE` trigger fires before MySQL removes a row from a table. You can use it to prevent deletion under certain conditions, copy the row to an archive table, or log who deleted what. Since the trigger runs before the row is gone, you still have access to all column values via the `OLD` pseudo-record.

## Basic Syntax

```sql
CREATE TRIGGER trigger_name
BEFORE DELETE ON table_name
FOR EACH ROW
BEGIN
    -- trigger body using OLD
END;
```

Inside a `BEFORE DELETE` trigger:
- `OLD.column` holds the current value of each column
- `NEW` does not exist - there are no incoming values for a delete
- Raising a `SIGNAL` inside the trigger prevents the deletion from happening

## Example 1 - Archive Rows Before Deletion

Move a row to an archive table before it is removed:

```sql
CREATE TABLE orders_archive LIKE orders;
ALTER TABLE orders_archive ADD COLUMN deleted_by VARCHAR(100);
ALTER TABLE orders_archive ADD COLUMN deleted_at DATETIME;

DELIMITER //

CREATE TRIGGER trg_orders_before_delete
BEFORE DELETE ON orders
FOR EACH ROW
BEGIN
    INSERT INTO orders_archive
    SELECT *, USER() AS deleted_by, NOW() AS deleted_at
    FROM orders
    WHERE order_id = OLD.order_id;
END //

DELIMITER ;
```

Because `orders_archive` has extra columns, a cleaner approach is an explicit insert:

```sql
DELIMITER //

CREATE TRIGGER trg_orders_archive
BEFORE DELETE ON orders
FOR EACH ROW
BEGIN
    INSERT INTO orders_archive
        (order_id, user_id, total, created_at, deleted_by, deleted_at)
    VALUES
        (OLD.order_id, OLD.user_id, OLD.total, OLD.created_at, USER(), NOW());
END //

DELIMITER ;
```

## Example 2 - Block Deletion of Active Records

Prevent deletion of any order that has not been fulfilled:

```sql
DELIMITER //

CREATE TRIGGER trg_orders_prevent_active_delete
BEFORE DELETE ON orders
FOR EACH ROW
BEGIN
    IF OLD.status = 'active' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot delete an active order. Cancel it first.';
    END IF;
END //

DELIMITER ;
```

Test it:

```sql
DELETE FROM orders WHERE order_id = 5;
-- ERROR 1644 (45000): Cannot delete an active order. Cancel it first.
```

## Example 3 - Audit Log on Delete

Record who deleted a user account:

```sql
DELIMITER //

CREATE TRIGGER trg_users_delete_audit
BEFORE DELETE ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, action_by, action_at)
    VALUES ('users', OLD.user_id, 'DELETE', USER(), NOW());
END //

DELIMITER ;
```

## Managing the Trigger

```sql
SHOW TRIGGERS LIKE 'orders';
SHOW CREATE TRIGGER trg_orders_archive;
DROP TRIGGER IF EXISTS trg_orders_archive;
```

## Summary

A `BEFORE DELETE` trigger is the right tool when you need to archive rows, enforce business rules that block deletion, or log removals. Use `OLD.column` to access the row being deleted, and `SIGNAL` to abort the operation when a condition is not met.
