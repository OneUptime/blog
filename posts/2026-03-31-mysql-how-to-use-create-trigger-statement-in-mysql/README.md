# How to Use CREATE TRIGGER Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, Database Automation, DDL

Description: Learn how to use the CREATE TRIGGER statement in MySQL to automatically execute SQL code before or after INSERT, UPDATE, and DELETE operations.

---

## What Is a MySQL Trigger

A trigger is a stored program that MySQL executes automatically when a specific event (INSERT, UPDATE, or DELETE) occurs on a table. Triggers run either BEFORE or AFTER the event, and they have access to the old and new row values via the `OLD` and `NEW` pseudo-rows.

Common use cases include audit logging, enforcing business rules, maintaining derived columns, and cascading updates that foreign keys cannot handle.

## Basic Syntax

```sql
CREATE TRIGGER trigger_name
    {BEFORE | AFTER} {INSERT | UPDATE | DELETE}
    ON table_name
    FOR EACH ROW
    trigger_body;
```

For multi-statement trigger bodies, use `BEGIN ... END` with a custom delimiter:

```sql
DELIMITER $$

CREATE TRIGGER trigger_name
    BEFORE INSERT ON table_name
    FOR EACH ROW
BEGIN
    -- statements
END$$

DELIMITER ;
```

## BEFORE INSERT Trigger - Validation Example

Enforce a business rule before a row is inserted:

```sql
DELIMITER $$

CREATE TRIGGER trg_check_price_before_insert
    BEFORE INSERT ON products
    FOR EACH ROW
BEGIN
    IF NEW.price < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Price cannot be negative';
    END IF;
END$$

DELIMITER ;
```

## AFTER INSERT Trigger - Audit Log Example

Record every new order in an audit table:

```sql
CREATE TABLE order_audit (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    action VARCHAR(10),
    changed_at DATETIME
);

DELIMITER $$

CREATE TRIGGER trg_after_insert_order
    AFTER INSERT ON orders
    FOR EACH ROW
BEGIN
    INSERT INTO order_audit (order_id, action, changed_at)
    VALUES (NEW.id, 'INSERT', NOW());
END$$

DELIMITER ;
```

## BEFORE UPDATE Trigger - Timestamp Maintenance

Automatically update a `modified_at` column on every update:

```sql
DELIMITER $$

CREATE TRIGGER trg_set_modified_at
    BEFORE UPDATE ON users
    FOR EACH ROW
BEGIN
    SET NEW.modified_at = NOW();
END$$

DELIMITER ;
```

## AFTER DELETE Trigger - Cascade Audit

Log deleted rows after they are removed:

```sql
DELIMITER $$

CREATE TRIGGER trg_after_delete_user
    AFTER DELETE ON users
    FOR EACH ROW
BEGIN
    INSERT INTO deleted_users_log (user_id, email, deleted_at)
    VALUES (OLD.id, OLD.email, NOW());
END$$

DELIMITER ;
```

## Accessing OLD and NEW Values

- `NEW.column_name` - the new value being inserted or updated
- `OLD.column_name` - the existing value before an update or delete

In BEFORE triggers you can modify `NEW` values; in AFTER triggers both `OLD` and `NEW` are read-only.

```sql
DELIMITER $$

CREATE TRIGGER trg_normalize_email
    BEFORE INSERT ON users
    FOR EACH ROW
BEGIN
    SET NEW.email = LOWER(TRIM(NEW.email));
END$$

DELIMITER ;
```

## Multiple Triggers for the Same Event

MySQL 5.7+ supports multiple triggers for the same event/timing combination. Use `FOLLOWS` or `PRECEDES` to control execution order:

```sql
CREATE TRIGGER trg_audit_second
    AFTER INSERT ON orders
    FOR EACH ROW
    FOLLOWS trg_after_insert_order
BEGIN
    -- runs after trg_after_insert_order
END;
```

## Viewing and Dropping Triggers

```sql
-- List all triggers in the current database
SHOW TRIGGERS\G

-- List triggers for a specific table
SHOW TRIGGERS FROM mydb LIKE 'orders'\G

-- Drop a trigger
DROP TRIGGER IF EXISTS trg_after_insert_order;
```

## Trigger Limitations

- Triggers cannot call stored procedures that return result sets
- Triggers cannot use transactions directly (`COMMIT`/`ROLLBACK`)
- A trigger cannot modify a table that is already being used by the statement that invoked it, but cascading triggers across different tables are supported
- Heavy use of triggers can make debugging and performance tuning more difficult

## Summary

The `CREATE TRIGGER` statement lets you automate SQL logic that runs before or after data modification events in MySQL. Triggers are powerful for audit logging, input validation, and maintaining derived data, but should be used judiciously to keep database logic transparent and maintainable.
