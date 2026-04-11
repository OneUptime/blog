# How to Schedule Table Maintenance with MySQL Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Event Scheduler, OPTIMIZE TABLE, ANALYZE TABLE, Maintenance

Description: Learn how to automate MySQL table maintenance tasks like OPTIMIZE TABLE, ANALYZE TABLE, and index statistics updates using scheduled events.

---

InnoDB tables accumulate fragmentation over time after heavy INSERT, UPDATE, and DELETE activity. Running maintenance commands manually is error-prone; automating them with MySQL events ensures they run consistently during low-traffic periods.

## Types of Table Maintenance

```text
Command            | What it does
-------------------|----------------------------------------------
ANALYZE TABLE      | Updates index statistics for the optimizer
OPTIMIZE TABLE     | Rebuilds the table, reclaims fragmented space
CHECK TABLE        | Verifies table integrity
REPAIR TABLE       | Fixes corrupted MyISAM tables
```

For InnoDB, `OPTIMIZE TABLE` is equivalent to `ALTER TABLE ... ENGINE=InnoDB` - it rebuilds the clustered index and reclaims space.

## Example 1 - Weekly ANALYZE TABLE

Update statistics on key tables every Sunday night:

```sql
DELIMITER //

CREATE EVENT evt_weekly_analyze
ON SCHEDULE EVERY 1 WEEK
STARTS '2026-04-06 02:00:00'
DO
BEGIN
    ANALYZE TABLE orders;
    ANALYZE TABLE products;
    ANALYZE TABLE users;
    INSERT INTO maintenance_log (task, completed_at)
    VALUES ('ANALYZE orders, products, users', NOW());
END //

DELIMITER ;
```

## Example 2 - Monthly OPTIMIZE TABLE

Reclaim fragmented space monthly. Because `OPTIMIZE TABLE` on InnoDB locks the table briefly (or uses online rebuild in MySQL 5.6+), schedule it during a maintenance window:

```sql
DELIMITER //

CREATE EVENT evt_monthly_optimize
ON SCHEDULE EVERY 1 MONTH
STARTS '2026-04-01 03:00:00'
DO
BEGIN
    OPTIMIZE TABLE audit_log;
    OPTIMIZE TABLE user_activity;
    OPTIMIZE TABLE temp_uploads;
    INSERT INTO maintenance_log (task, completed_at)
    VALUES ('OPTIMIZE audit_log, user_activity, temp_uploads', NOW());
END //

DELIMITER ;
```

## Example 3 - Dynamic Maintenance Based on Fragmentation

For smarter maintenance, check fragmentation before deciding to optimize:

```sql
DELIMITER //

CREATE EVENT evt_smart_optimize
ON SCHEDULE EVERY 1 DAY
STARTS '2026-04-01 04:00:00'
DO
BEGIN
    -- Only optimize tables with more than 20% fragmentation
    -- (DATA_FREE / (DATA_LENGTH + DATA_FREE) > 0.20)
    INSERT INTO optimize_queue (table_schema, table_name, queued_at)
    SELECT TABLE_SCHEMA, TABLE_NAME, NOW()
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'mydb'
      AND ENGINE = 'InnoDB'
      AND DATA_FREE > 0
      AND DATA_FREE / (DATA_LENGTH + DATA_FREE) > 0.20;
END //

DELIMITER ;
```

A separate process or manual review can then run `OPTIMIZE TABLE` on the queued tables.

## Example 4 - CHECK TABLE for Integrity Monitoring

```sql
DELIMITER //

CREATE EVENT evt_weekly_check
ON SCHEDULE EVERY 1 WEEK
STARTS '2026-04-05 01:00:00'
DO
BEGIN
    CHECK TABLE orders FAST QUICK;
    CHECK TABLE products FAST QUICK;
    INSERT INTO maintenance_log (task, completed_at)
    VALUES ('CHECK orders, products', NOW());
END //

DELIMITER ;
```

`FAST` checks only tables that have not been closed properly (ignored for InnoDB); `QUICK` does not scan rows to check for incorrect links.

## Maintenance Log Table

```sql
CREATE TABLE maintenance_log (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    task         VARCHAR(255),
    completed_at DATETIME
);
```

## Summary

Automate table maintenance by scheduling MySQL events for `ANALYZE TABLE` weekly and `OPTIMIZE TABLE` monthly during low-traffic windows. Use `information_schema.TABLES.DATA_FREE` to identify highly fragmented tables and log all maintenance runs to a `maintenance_log` table for auditing.
