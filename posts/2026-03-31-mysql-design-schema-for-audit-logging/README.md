# How to Design a Schema for Audit Logging in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Audit Log, Schema Design, Compliance

Description: Learn how to build a robust audit logging schema in MySQL that captures who changed what and when, using triggers and append-only tables.

---

Audit logging records a history of data changes - inserts, updates, and deletes - for compliance, debugging, and recovery. The core requirement is that audit rows are append-only and never modified.

## Audit Log Table Design

```sql
CREATE TABLE audit_log (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    table_name   VARCHAR(64)     NOT NULL,
    record_id    BIGINT UNSIGNED NOT NULL,
    operation    ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    changed_by   INT UNSIGNED    NULL,
    changed_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    old_data     JSON            NULL,
    new_data     JSON            NULL,
    PRIMARY KEY (id, changed_at),
    KEY idx_table_record (table_name, record_id),
    KEY idx_changed_at   (changed_at)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED;
```

`JSON` columns for `old_data` and `new_data` provide a flexible snapshot without requiring a separate audit column per business table.

## Creating Audit Triggers

```sql
DELIMITER $$

CREATE TRIGGER trg_orders_after_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, operation, changed_by, old_data, new_data)
    VALUES (
        'orders',
        OLD.id,
        'UPDATE',
        @current_user_id,
        JSON_OBJECT('status', OLD.status, 'total', OLD.total),
        JSON_OBJECT('status', NEW.status, 'total', NEW.total)
    );
END$$

CREATE TRIGGER trg_orders_after_delete
AFTER DELETE ON orders
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, operation, changed_by, old_data, new_data)
    VALUES (
        'orders',
        OLD.id,
        'DELETE',
        @current_user_id,
        JSON_OBJECT('status', OLD.status, 'total', OLD.total),
        NULL
    );
END$$

DELIMITER ;
```

## Setting the Current User Context

Set a session variable before every data-changing query:

```sql
SET @current_user_id = 42;
UPDATE orders SET status = 'shipped' WHERE id = 100;
```

## Querying the Audit Trail

```sql
-- History of a specific order
SELECT operation, changed_by, changed_at, old_data, new_data
FROM   audit_log
WHERE  table_name = 'orders'
AND    record_id  = 100
ORDER BY changed_at;
```

```sql
-- All changes made by user 42 in the last 24 hours
SELECT table_name, record_id, operation, changed_at
FROM   audit_log
WHERE  changed_by  = 42
AND    changed_at >= NOW() - INTERVAL 24 HOUR;
```

## Partitioning for Retention

Audit logs grow quickly. Partition by month to drop old data efficiently:

```sql
ALTER TABLE audit_log
PARTITION BY RANGE (TO_DAYS(changed_at)) (
    PARTITION p2026_03 VALUES LESS THAN (TO_DAYS('2026-04-01')),
    PARTITION p2026_04 VALUES LESS THAN (TO_DAYS('2026-05-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

Drop old partitions with `ALTER TABLE audit_log DROP PARTITION p2026_03;` - much faster than a DELETE.

## Summary

Design audit log tables with `JSON` old/new snapshots, a `changed_at` timestamp with millisecond precision, and a `changed_by` user reference. Use AFTER triggers to write audit rows automatically. Partition by date for efficient retention management. Keep audit tables in a separate schema or InnoDB tablespace to prevent operational tables from being impacted by audit writes.
