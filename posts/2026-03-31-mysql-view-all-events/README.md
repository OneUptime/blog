# How to View All Events in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Event Scheduler, SHOW EVENTS, Information Schema, Metadata

Description: Learn how to list all MySQL events using SHOW EVENTS, SHOW CREATE EVENT, and querying information_schema.EVENTS for schedule, status, and last execution details.

---

MySQL stores event definitions in `information_schema.EVENTS` and exposes them through `SHOW EVENTS`. Knowing how to query this metadata helps you audit scheduled jobs, monitor last execution times, and troubleshoot missed runs.

## SHOW EVENTS

List all events in the current database:

```sql
SHOW EVENTS;
```

List events in a specific database:

```sql
SHOW EVENTS FROM mydb;
```

Filter by name pattern:

```sql
SHOW EVENTS LIKE '%cleanup%';
```

The output columns include: `Db`, `Name`, `Definer`, `Time zone`, `Type`, `Execute at`, `Interval value`, `Interval field`, `Starts`, `Ends`, `Status`, `Originator`, `character_set_client`, `collation_connection`, `Database Collation`.

## SHOW CREATE EVENT

View the full event definition including its SQL body:

```sql
SHOW CREATE EVENT evt_daily_cleanup\G
```

The output shows the complete `CREATE EVENT` statement with all options, which you can copy to recreate the event on another server.

## Querying information_schema.EVENTS

For scripting or flexible filtering, query the table directly:

```sql
SELECT
    EVENT_SCHEMA        AS db_name,
    EVENT_NAME,
    EVENT_TYPE          AS type,
    INTERVAL_VALUE,
    INTERVAL_FIELD,
    EXECUTE_AT,
    STARTS,
    ENDS,
    STATUS,
    LAST_EXECUTED,
    ON_COMPLETION,
    DEFINER,
    CREATED,
    LAST_ALTERED
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'mydb'
ORDER BY EVENT_NAME;
```

## Find Events That Have Never Run

```sql
SELECT EVENT_NAME, STATUS, STARTS, CREATED
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'mydb'
  AND LAST_EXECUTED IS NULL;
```

## Find Events That Have Not Run Recently

Identify events that should have run but have not executed in the last 2 hours:

```sql
SELECT EVENT_NAME, INTERVAL_VALUE, INTERVAL_FIELD, LAST_EXECUTED
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'mydb'
  AND STATUS = 'ENABLED'
  AND EVENT_TYPE = 'RECURRING'
  AND LAST_EXECUTED < NOW() - INTERVAL 2 HOUR;
```

## Find Disabled Events

```sql
SELECT EVENT_NAME, LAST_EXECUTED, CREATED
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'mydb'
  AND STATUS = 'DISABLED';
```

## Count Events by Status

```sql
SELECT STATUS, COUNT(*) AS event_count
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'mydb'
GROUP BY STATUS;
```

## Exporting Event Definitions

Use `mysqldump` to export event definitions:

```bash
mysqldump --events --no-data --no-create-info mydb > mydb_events.sql
```

## Required Privileges

To see event definitions in `information_schema.EVENTS`, the user needs the `EVENT` privilege on the target schema, or at minimum be the definer of the event.

## Summary

Use `SHOW EVENTS FROM schema` for a quick overview and `SHOW CREATE EVENT` to inspect a specific event's body. For monitoring and auditing, query `information_schema.EVENTS` and filter by `STATUS`, `LAST_EXECUTED`, and `INTERVAL_VALUE` to identify scheduled jobs that are disabled, overdue, or have never run.
