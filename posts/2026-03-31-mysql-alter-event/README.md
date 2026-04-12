# How to Alter an Event in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Event Scheduler, ALTER EVENT, Modification, Configuration

Description: Learn how to modify a MySQL event's schedule, body, status, and name using the ALTER EVENT statement without dropping and recreating it.

---

`ALTER EVENT` lets you change any attribute of an existing MySQL event - its schedule, SQL body, enabled status, definer, or name - without dropping and recreating it. All changes take effect immediately.

## Basic Syntax

```sql
ALTER EVENT event_name
    [ON SCHEDULE schedule]
    [ON COMPLETION [NOT] PRESERVE]
    [RENAME TO new_name]
    [ENABLE | DISABLE | DISABLE ON SLAVE]
    [COMMENT 'string']
    [DO event_body];
```

You can change one or many attributes in a single `ALTER EVENT` statement.

## Change the Schedule

Update a daily event to run every 12 hours:

```sql
ALTER EVENT evt_daily_cleanup
ON SCHEDULE EVERY 12 HOUR;
```

Change a one-time event to run at a new time:

```sql
ALTER EVENT evt_one_time_migration
ON SCHEDULE AT '2026-05-01 03:00:00';
```

Add a start and end window to a recurring event:

```sql
ALTER EVENT evt_sync_cache
ON SCHEDULE EVERY 5 MINUTE
STARTS '2026-04-01 00:00:00'
ENDS   '2026-06-30 23:59:59';
```

## Change the Event Body

Replace the SQL the event executes:

```sql
ALTER EVENT evt_daily_cleanup
DO
    DELETE FROM temp_logs WHERE created_at < NOW() - INTERVAL 7 DAY;
```

For multi-statement bodies, use `BEGIN ... END` with a delimiter change:

```sql
DELIMITER //

ALTER EVENT evt_daily_cleanup
DO
BEGIN
    DELETE FROM temp_logs  WHERE created_at < NOW() - INTERVAL 7 DAY;
    DELETE FROM rate_limits WHERE window_end < NOW() - INTERVAL 1 DAY;
END //

DELIMITER ;
```

## Enable or Disable Without Dropping

Temporarily pause an event:

```sql
ALTER EVENT evt_daily_cleanup DISABLE;
```

Resume it:

```sql
ALTER EVENT evt_daily_cleanup ENABLE;
```

This is more reversible than `DROP EVENT IF EXISTS`.

## Rename an Event

```sql
ALTER EVENT evt_daily_cleanup
RENAME TO evt_daily_log_purge;
```

## Change the Completion Behavior

Switch from auto-drop to preserve after execution:

```sql
ALTER EVENT evt_one_time_task
ON COMPLETION PRESERVE;
```

## Verify the Changes

After altering, confirm the new definition:

```sql
SHOW EVENTS LIKE 'evt_daily_log_purge';

SELECT EVENT_NAME, STATUS, INTERVAL_VALUE, INTERVAL_FIELD,
       STARTS, ENDS, ON_COMPLETION, LAST_EXECUTED
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'mydb'
  AND EVENT_NAME = 'evt_daily_log_purge';
```

## Required Privileges

To alter an event you need the `EVENT` privilege on the schema where the event exists:

```sql
GRANT EVENT ON mydb.* TO 'scheduler_user'@'localhost';
```

## Summary

Use `ALTER EVENT` to change a MySQL event's schedule, body, name, or enabled state without a drop-and-recreate cycle. `DISABLE` and `ENABLE` let you pause and resume events safely, and `RENAME TO` keeps existing monitoring queries working by updating the name in place.
