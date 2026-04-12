# How to Create an AFTER INSERT Trigger in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, AFTER INSERT, Automation, Audit

Description: Learn how to create an AFTER INSERT trigger in MySQL to automatically run SQL after a new row is inserted into a table.

---

An `AFTER INSERT` trigger fires automatically after MySQL successfully inserts a row into a table. Because it runs after the row is written to the table (but still within the same transaction), you can safely reference the `NEW` row in the trigger body without affecting the original insert.

## Basic Syntax

```sql
CREATE TRIGGER trigger_name
AFTER INSERT ON table_name
FOR EACH ROW
BEGIN
    -- trigger body
END;
```

`FOR EACH ROW` means the trigger fires once for every row inserted, including bulk inserts with multi-row `INSERT` statements.

## Example 1 - Writing to an Audit Table

A common use case is recording who inserted what and when:

```sql
CREATE TABLE orders (
    order_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT,
    total      DECIMAL(10,2),
    created_at DATETIME DEFAULT NOW()
);

CREATE TABLE order_audit (
    audit_id   INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT,
    action     VARCHAR(10),
    changed_by VARCHAR(100),
    changed_at DATETIME
);

DELIMITER //

CREATE TRIGGER trg_orders_after_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    INSERT INTO order_audit (order_id, action, changed_by, changed_at)
    VALUES (NEW.order_id, 'INSERT', USER(), NOW());
END //

DELIMITER ;
```

Test it:

```sql
INSERT INTO orders (user_id, total) VALUES (42, 199.99);
SELECT * FROM order_audit;
```

## Example 2 - Updating a Summary Table

Maintain a running total in a summary table without application-level code:

```sql
CREATE TABLE sales_summary (
    summary_date DATE PRIMARY KEY,
    total_sales  DECIMAL(12,2) DEFAULT 0
);

DELIMITER //

CREATE TRIGGER trg_orders_update_summary
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    INSERT INTO sales_summary (summary_date, total_sales)
    VALUES (DATE(NEW.created_at), NEW.total)
    ON DUPLICATE KEY UPDATE total_sales = total_sales + NEW.total;
END //

DELIMITER ;
```

## Accessing NEW Values

Inside an `AFTER INSERT` trigger every column of the inserted row is available via the `NEW` pseudo-record:

```sql
NEW.column_name
```

There is no `OLD` record in an `AFTER INSERT` trigger - it only exists for `UPDATE` and `DELETE` triggers.

## Viewing the Trigger

```sql
SHOW TRIGGERS LIKE 'orders';
SHOW CREATE TRIGGER trg_orders_after_insert;
```

## Dropping the Trigger

```sql
DROP TRIGGER IF EXISTS trg_orders_after_insert;
```

## Limitations

- Triggers cannot call stored procedures that use `COMMIT` or `ROLLBACK`.
- Triggers cannot use `RETURN`; use `LEAVE` or `SIGNAL` to exit early.
- A trigger that raises an error will cause the original `INSERT` to fail and roll back (for InnoDB tables).

## Summary

An `AFTER INSERT` trigger is ideal for audit logging, cascading denormalization, and maintaining aggregate summaries. Reference inserted values using the `NEW` pseudo-record, and keep trigger bodies lightweight to avoid slowing down the originating `INSERT` statement.
