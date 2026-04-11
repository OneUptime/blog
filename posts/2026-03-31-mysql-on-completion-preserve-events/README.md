# How to Use ON COMPLETION PRESERVE in MySQL Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Event Scheduler, ON COMPLETION PRESERVE, One-Time Event, Lifecycle

Description: Learn what ON COMPLETION PRESERVE does in MySQL events, when to use it, and how it differs from the default ON COMPLETION NOT PRESERVE behavior.

---

When a MySQL event finishes its last scheduled execution - whether a one-time event completes or a recurring event reaches its `ENDS` date - MySQL must decide what to do with the event definition. The `ON COMPLETION` clause controls this behavior.

## The Two Options

```sql
ON COMPLETION NOT PRESERVE   -- default: drop the event after last execution
ON COMPLETION PRESERVE       -- keep the event definition as DISABLED
```

## Default Behavior: ON COMPLETION NOT PRESERVE

Without specifying `ON COMPLETION`, MySQL drops the event after it runs:

```sql
CREATE EVENT evt_one_time_migration
ON SCHEDULE AT '2026-04-15 02:00:00'
DO
    CALL sp_run_schema_migration();
```

After this event fires, it is permanently deleted from `information_schema.EVENTS`. There is no record that it ever existed (unless you log it yourself).

## Using ON COMPLETION PRESERVE

Adding `ON COMPLETION PRESERVE` keeps the event definition with a status of `DISABLED` after its last execution:

```sql
CREATE EVENT evt_one_time_migration
ON SCHEDULE AT '2026-04-15 02:00:00'
ON COMPLETION PRESERVE
DO
    CALL sp_run_schema_migration();
```

After the event fires, querying `information_schema.EVENTS` shows:

```sql
SELECT EVENT_NAME, STATUS, EXECUTE_AT, LAST_EXECUTED
FROM information_schema.EVENTS
WHERE EVENT_NAME = 'evt_one_time_migration';
```

```text
EVENT_NAME              | STATUS   | EXECUTE_AT          | LAST_EXECUTED
------------------------|----------|---------------------|--------------------
evt_one_time_migration  | DISABLED | 2026-04-15 02:00:00 | 2026-04-15 02:00:03
```

## When to Use ON COMPLETION PRESERVE

Use it when you need:
- Audit evidence that a migration or one-time job ran
- The ability to manually re-run the event by re-enabling it
- Consistency with recurring events that have an `ENDS` clause

```sql
-- Recurring event that ends after 1 year - keep definition for review
CREATE EVENT evt_quarterly_report
ON SCHEDULE EVERY 3 MONTH
STARTS '2026-04-01 01:00:00'
ENDS   '2027-04-01 01:00:00'
ON COMPLETION PRESERVE
DO
    CALL sp_generate_quarterly_report();
```

## Modifying the Completion Behavior with ALTER EVENT

Change an existing event to preserve its definition after completion:

```sql
ALTER EVENT evt_one_time_migration
ON COMPLETION PRESERVE;
```

Or switch it back to the default (auto-drop):

```sql
ALTER EVENT evt_one_time_migration
ON COMPLETION NOT PRESERVE;
```

## Re-running a Preserved Event

After a preserved event is disabled, you can re-enable and reschedule it:

```sql
ALTER EVENT evt_one_time_migration
ON SCHEDULE AT NOW() + INTERVAL 1 HOUR
ENABLE;
```

This avoids rewriting the entire `CREATE EVENT` statement when you need to re-run the same logic.

## Summary

`ON COMPLETION PRESERVE` retains a MySQL event definition as `DISABLED` after its last scheduled execution, while the default `ON COMPLETION NOT PRESERVE` drops the event immediately. Use `PRESERVE` for one-time jobs where you want an audit trail or the option to re-run, and for recurring events with an `ENDS` clause where you want to review past configuration.
