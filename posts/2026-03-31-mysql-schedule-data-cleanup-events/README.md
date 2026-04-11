# How to Schedule Data Cleanup Jobs with MySQL Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Event Scheduler, Data Cleanup, Automation, Maintenance

Description: Learn how to automate data cleanup in MySQL by creating recurring events that purge expired sessions, old logs, and stale records on a schedule.

---

Automating data cleanup with MySQL events keeps tables lean, improves query performance, and removes the need for external cron jobs. A well-written cleanup event runs during off-peak hours, deletes rows in bounded batches to avoid long locks, and logs what it removed.

## Prerequisites

Ensure the event scheduler is running:

```sql
SET GLOBAL event_scheduler = ON;
SHOW VARIABLES LIKE 'event_scheduler';
```

## Example 1 - Purge Expired Sessions Hourly

```sql
CREATE EVENT evt_purge_expired_sessions
ON SCHEDULE EVERY 1 HOUR
STARTS NOW()
DO
    DELETE FROM sessions
    WHERE expires_at < NOW()
    LIMIT 5000;
```

The `LIMIT 5000` clause prevents the DELETE from holding row locks for too long on large tables.

## Example 2 - Archive and Delete Old Audit Logs Weekly

```sql
DELIMITER //

CREATE EVENT evt_archive_old_audit_logs
ON SCHEDULE EVERY 1 WEEK
STARTS '2026-04-07 02:00:00'
DO
BEGIN
    -- Move rows older than 90 days to the archive table
    INSERT INTO audit_log_archive
    SELECT * FROM audit_log
    WHERE changed_at < NOW() - INTERVAL 90 DAY;

    -- Remove the archived rows
    DELETE FROM audit_log
    WHERE changed_at < NOW() - INTERVAL 90 DAY;
END //

DELIMITER ;
```

## Example 3 - Delete Soft-Deleted Records Monthly

Many applications mark records as deleted with a flag rather than removing them. Schedule a monthly job to purge them:

```sql
DELIMITER //

CREATE EVENT evt_purge_soft_deleted_records
ON SCHEDULE EVERY 1 MONTH
STARTS '2026-05-01 03:00:00'
DO
BEGIN
    -- Log how many rows will be removed
    INSERT INTO maintenance_log (job_name, row_count, ran_at)
    SELECT 'purge_soft_deleted', COUNT(*), NOW()
    FROM users
    WHERE deleted_at < NOW() - INTERVAL 30 DAY;

    -- Delete the rows
    DELETE FROM users
    WHERE deleted_at < NOW() - INTERVAL 30 DAY;
END //

DELIMITER ;
```

## Example 4 - Batch Deletion to Reduce Lock Pressure

For very large tables, delete in small batches using a frequently scheduled event:

```sql
DELIMITER //

CREATE EVENT evt_batch_purge_temp_data
ON SCHEDULE EVERY 5 MINUTE
DO
BEGIN
    DELETE FROM temp_data
    WHERE created_at < NOW() - INTERVAL 1 DAY
    LIMIT 1000;
END //

DELIMITER ;
```

Running every 5 minutes with a 1,000-row limit spreads the delete load over time instead of one large delete.

## Monitor Cleanup Events

```sql
SELECT EVENT_NAME, STATUS, INTERVAL_VALUE, INTERVAL_FIELD, LAST_EXECUTED
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'mydb'
  AND (EVENT_NAME LIKE '%purge%'
    OR EVENT_NAME LIKE '%cleanup%'
    OR EVENT_NAME LIKE '%archive%');
```

## Summary

Use MySQL recurring events for automated data cleanup by scheduling `DELETE` or INSERT-then-DELETE patterns with bounded `LIMIT` clauses to avoid long lock waits. Log cleanup activity to a `maintenance_log` table for observability, and monitor `LAST_EXECUTED` in `information_schema.EVENTS` to confirm jobs are running on schedule.
