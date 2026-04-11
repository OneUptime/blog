# How to Use SHOW EVENTS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Event, Scheduler

Description: Learn how to use SHOW EVENTS in MySQL to list scheduled events, view execution schedules, and inspect event status and definer information.

---

## What Is SHOW EVENTS

`SHOW EVENTS` lists all scheduled events defined in the MySQL Event Scheduler for the current or specified database. Events are stored SQL procedures that run automatically at a scheduled time or on a recurring interval. `SHOW EVENTS` lets you see what is scheduled, when it runs, its status, and who created it.

```sql
SHOW EVENTS;
SHOW EVENTS FROM database_name;
SHOW EVENTS LIKE 'pattern';
SHOW EVENTS WHERE condition;
```

## Enabling the Event Scheduler

Before events can run, the Event Scheduler must be enabled:

```sql
-- Check if the scheduler is running
SHOW VARIABLES LIKE 'event_scheduler';

-- Enable it globally
SET GLOBAL event_scheduler = ON;
```

## Basic Usage

```sql
USE myapp_db;
SHOW EVENTS\G
```

```text
*************************** 1. row ***************************
                  Db: myapp_db
                Name: purge_old_sessions
             Definer: root@localhost
           Time zone: SYSTEM
                Type: RECURRING
          Execute at: NULL
      Interval value: 1
      Interval field: DAY
              Starts: 2024-01-01 02:00:00
                Ends: NULL
              Status: ENABLED
          Originator: 1
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
  Database Collation: utf8mb4_0900_ai_ci
```

## Key Output Columns

- **Name**: Event name
- **Definer**: The user who created the event
- **Type**: `ONE TIME` (runs once) or `RECURRING` (repeats)
- **Execute at**: For one-time events, the scheduled timestamp
- **Interval value/field**: For recurring events, the repeat interval (e.g., `1 DAY`, `6 HOUR`)
- **Starts / Ends**: Active window for recurring events
- **Status**: `ENABLED`, `DISABLED`, or `SLAVESIDE_DISABLED`

## Filtering Events

```sql
-- Find events from a specific database
SHOW EVENTS FROM reporting_db;

-- Find events matching a pattern
SHOW EVENTS LIKE '%purge%';

-- Show only enabled events
SHOW EVENTS WHERE Status = 'ENABLED';

-- Show one-time events
SHOW EVENTS WHERE Type = 'ONE TIME';
```

## Querying information_schema for Events

```sql
SELECT
  EVENT_NAME,
  EVENT_SCHEMA,
  DEFINER,
  EVENT_TYPE,
  EXECUTE_AT,
  INTERVAL_VALUE,
  INTERVAL_FIELD,
  STARTS,
  ENDS,
  STATUS,
  EVENT_COMMENT
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'myapp_db'
ORDER BY EVENT_NAME;
```

## Viewing the Full Event Definition

```sql
SHOW CREATE EVENT event_name\G
```

```sql
SHOW CREATE EVENT purge_old_sessions\G
```

This returns the complete `CREATE EVENT` statement including the body.

## Common Event Examples

A daily cleanup event:

```sql
CREATE EVENT purge_old_sessions
ON SCHEDULE EVERY 1 DAY
STARTS '2024-01-01 02:00:00'
DO
  DELETE FROM user_sessions
  WHERE last_active < NOW() - INTERVAL 30 DAY;
```

A one-time migration event:

```sql
CREATE EVENT backfill_user_ranks
ON SCHEDULE AT '2024-06-15 03:00:00'
DO
  UPDATE users u
  JOIN (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders GROUP BY user_id
  ) o ON u.id = o.user_id
  SET u.tier = CASE WHEN o.order_count > 10 THEN 'gold' ELSE 'silver' END;
```

## Enabling and Disabling Events

```sql
-- Disable an event (stops it from firing)
ALTER EVENT purge_old_sessions DISABLE;

-- Re-enable an event
ALTER EVENT purge_old_sessions ENABLE;
```

## Summary

`SHOW EVENTS` lists all MySQL scheduled events with their schedule type, timing, status, and definer. Use `WHERE Status = 'ENABLED'` to see active events, `SHOW CREATE EVENT` to view the full event body, and `information_schema.EVENTS` for programmatic querying. Always verify the event scheduler is enabled with `SHOW VARIABLES LIKE 'event_scheduler'` before relying on scheduled events in production.
