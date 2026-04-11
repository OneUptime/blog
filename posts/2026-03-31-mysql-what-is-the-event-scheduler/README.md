# What Is the MySQL Event Scheduler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Event Scheduler, Scheduled Job, Automation, DBA

Description: The MySQL Event Scheduler is a built-in job scheduler that executes SQL statements or stored procedures on a defined schedule, similar to cron for databases.

---

## Overview

The MySQL Event Scheduler is a component of the MySQL server that executes SQL code on a time-based schedule. Events are named database objects associated with the schema in which they are created and managed with `CREATE EVENT`, `ALTER EVENT`, and `DROP EVENT` statements. The event scheduler runs in the background as a separate thread and can trigger one-time or recurring tasks without any external scheduler.

## Enabling the Event Scheduler

The event scheduler must be enabled before events can run:

```sql
-- Enable globally (persists until server restart)
SET GLOBAL event_scheduler = ON;

-- Check status
SHOW VARIABLES LIKE 'event_scheduler';
```

To enable permanently, add to `my.cnf`:

```ini
[mysqld]
event_scheduler = ON
```

## Creating a One-Time Event

```sql
-- Execute once in 10 minutes, then automatically drop
CREATE EVENT purge_old_sessions_once
ON SCHEDULE AT NOW() + INTERVAL 10 MINUTE
DO
  DELETE FROM sessions WHERE last_active < NOW() - INTERVAL 1 HOUR;
```

## Creating a Recurring Event

```sql
-- Run every night at midnight starting tomorrow
CREATE EVENT purge_old_sessions_daily
ON SCHEDULE EVERY 1 DAY
STARTS DATE_ADD(CURDATE(), INTERVAL 1 DAY)
COMMENT 'Remove expired sessions nightly'
DO
BEGIN
  DELETE FROM sessions WHERE last_active < NOW() - INTERVAL 24 HOUR;
  INSERT INTO maintenance_log (action, executed_at)
  VALUES ('session_purge', NOW());
END;
```

## Calling a Stored Procedure from an Event

For complex logic, call a stored procedure:

```sql
CREATE PROCEDURE archive_old_orders()
BEGIN
  INSERT INTO orders_archive
  SELECT * FROM orders WHERE created_at < NOW() - INTERVAL 90 DAY;

  DELETE FROM orders WHERE created_at < NOW() - INTERVAL 90 DAY;
END;

CREATE EVENT archive_orders_weekly
ON SCHEDULE EVERY 1 WEEK
STARTS '2026-04-01 02:00:00'
DO
  CALL archive_old_orders();
```

## Viewing Existing Events

```sql
-- List all events in current database
SHOW EVENTS;

-- Detailed view from INFORMATION_SCHEMA
SELECT
  EVENT_NAME,
  STATUS,
  EVENT_TYPE,
  INTERVAL_VALUE,
  INTERVAL_FIELD,
  STARTS,
  LAST_EXECUTED,
  EVENT_COMMENT
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = DATABASE()
ORDER BY EVENT_NAME;
```

## Enabling and Disabling Events

```sql
-- Disable an event without dropping it
ALTER EVENT archive_orders_weekly DISABLE;

-- Re-enable
ALTER EVENT archive_orders_weekly ENABLE;

-- Rename and change schedule
ALTER EVENT archive_orders_weekly
  RENAME TO archive_orders_monthly
  ON SCHEDULE EVERY 1 MONTH;
```

## Dropping an Event

```sql
DROP EVENT IF EXISTS purge_old_sessions_daily;
```

## Error Handling in Events

Events run silently in the background. Errors do not raise alerts to the client. Log event execution results manually:

```sql
CREATE EVENT process_queue_every_minute
ON SCHEDULE EVERY 1 MINUTE
DO
BEGIN
  DECLARE err_msg TEXT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 err_msg = MESSAGE_TEXT;
    INSERT INTO event_error_log (event_name, error_msg, occurred_at)
    VALUES ('process_queue_every_minute', err_msg, NOW());
  END;

  CALL process_pending_queue();
END;
```

## Summary

The MySQL Event Scheduler provides cron-like functionality directly within the database server. It handles recurring and one-time tasks like data archiving, cleanup, and aggregations without requiring external scheduling tools. Events are stored as database objects, versioned with the schema, and can be managed with standard SQL. Always enable logging or error tables to track event execution outcomes.
