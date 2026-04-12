# How to Use CREATE EVENT Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Event, Scheduling, Database Automation

Description: Learn how to use the CREATE EVENT statement in MySQL to schedule SQL tasks that run automatically at one-time or recurring intervals.

---

## What Is a MySQL Event

A MySQL event is a scheduled task - a block of SQL code that executes automatically at a defined time or on a recurring schedule. Events are part of the MySQL Event Scheduler, which runs as a background thread. They replace cron jobs for database-specific maintenance tasks such as purging old data, refreshing summary tables, or sending alerts.

## Enabling the Event Scheduler

Before creating events, ensure the scheduler is running:

```sql
-- Check scheduler status
SHOW VARIABLES LIKE 'event_scheduler';

-- Enable it at runtime
SET GLOBAL event_scheduler = ON;
```

To make it persistent, add to `my.cnf`:

```text
[mysqld]
event_scheduler = ON
```

## Basic Syntax

```sql
CREATE EVENT [IF NOT EXISTS] event_name
    ON SCHEDULE schedule
    [ON COMPLETION [NOT] PRESERVE]
    [ENABLE | DISABLE]
    [COMMENT 'comment']
    DO event_body;
```

For multi-statement bodies, use `BEGIN ... END`.

## One-Time Event

Execute a task once at a specific time:

```sql
CREATE EVENT one_time_cleanup
    ON SCHEDULE AT '2026-04-01 02:00:00'
    DO
        DELETE FROM session_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

By default, one-time events are dropped after execution. Use `ON COMPLETION PRESERVE` to keep the event definition:

```sql
CREATE EVENT one_time_cleanup
    ON SCHEDULE AT NOW() + INTERVAL 1 HOUR
    ON COMPLETION PRESERVE
    DO
        DELETE FROM temp_imports WHERE created_at < NOW();
```

## Recurring Event - Every Hour

```sql
CREATE EVENT hourly_stats_refresh
    ON SCHEDULE EVERY 1 HOUR
    STARTS NOW()
    DO
        CALL refresh_hourly_summary();
```

## Recurring Event - Daily Cleanup

```sql
DELIMITER $$

CREATE EVENT daily_purge_old_logs
    ON SCHEDULE EVERY 1 DAY
    STARTS '2026-04-01 03:00:00'
    DO
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

    INSERT INTO maintenance_log (task, run_at)
    VALUES ('daily_purge_old_logs', NOW());
END$$

DELIMITER ;
```

## Recurring Event - Weekly Aggregation

```sql
DELIMITER $$

CREATE EVENT weekly_sales_summary
    ON SCHEDULE EVERY 1 WEEK
    STARTS TIMESTAMP(CURDATE() + INTERVAL (7 - WEEKDAY(CURDATE())) DAY, '01:00:00')
DO
BEGIN
    INSERT INTO weekly_sales (week_start, total_revenue, order_count)
    SELECT
        DATE_SUB(CURDATE(), INTERVAL 7 DAY),
        SUM(total),
        COUNT(*)
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      AND created_at < CURDATE();
END$$

DELIMITER ;
```

## Viewing Events

```sql
-- List all events
SHOW EVENTS\G

-- Filter by database
SHOW EVENTS FROM mydb\G

-- Query information_schema
SELECT event_name, event_type, execute_at, interval_value, interval_field, status
FROM information_schema.events
WHERE event_schema = 'mydb';
```

## Modifying an Event

Use `ALTER EVENT` to change schedule, status, or body:

```sql
-- Change the schedule
ALTER EVENT daily_purge_old_logs
    ON SCHEDULE EVERY 12 HOUR;

-- Disable an event temporarily
ALTER EVENT daily_purge_old_logs DISABLE;

-- Re-enable it
ALTER EVENT daily_purge_old_logs ENABLE;
```

## Dropping an Event

```sql
DROP EVENT IF EXISTS daily_purge_old_logs;
```

## Error Handling in Events

Events run without a client connection, so errors are only visible in the MySQL error log. Add error logging to a table:

```sql
DELIMITER $$

CREATE EVENT safe_daily_cleanup
    ON SCHEDULE EVERY 1 DAY
    STARTS '2026-04-01 02:30:00'
DO
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        INSERT INTO event_errors (event_name, error_time)
        VALUES ('safe_daily_cleanup', NOW());
    END;

    DELETE FROM temp_data WHERE expires_at < NOW();
END$$

DELIMITER ;
```

## Summary

The `CREATE EVENT` statement provides a built-in scheduler in MySQL for automating recurring database tasks without external cron jobs. Events support one-time and interval-based schedules, multi-statement bodies, and can be enabled or disabled dynamically. Always verify the event scheduler is enabled and monitor event execution through the error log or a custom log table.
