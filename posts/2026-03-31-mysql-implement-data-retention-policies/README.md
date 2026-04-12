# How to Implement Data Retention Policies in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Retention, Compliance, Event Scheduler, Automation

Description: Implement automated MySQL data retention policies that purge or archive expired data on schedule to meet compliance requirements and control storage growth.

---

## Why Data Retention Policies Matter

Without a data retention policy, databases grow indefinitely, causing performance degradation, increased storage costs, and compliance risks. GDPR, HIPAA, and other regulations often mandate that personal data be deleted after a defined period. MySQL's Event Scheduler can automate retention enforcement without external tooling.

## Designing a Retention Policy

Before writing any SQL, define your retention rules:

```text
Table             Retention Period    Action After Retention
------            -----------------   ---------------------
audit_logs        90 days             DELETE
user_sessions     30 days             DELETE
orders            7 years             ARCHIVE to cold storage
user_events       1 year              DELETE
temp_files        7 days              DELETE
```

## Adding Retention Metadata

Add a `expires_at` column to tables with time-based retention:

```sql
ALTER TABLE user_sessions ADD COLUMN expires_at DATETIME NOT NULL;
ALTER TABLE user_sessions ADD INDEX idx_expires_at (expires_at);

-- Set expiry on insert
INSERT INTO user_sessions (user_id, token, expires_at)
VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY));
```

## Automated Purge with MySQL Event Scheduler

Enable the Event Scheduler if not already active:

```sql
SET GLOBAL event_scheduler = ON;
```

Create purge events for each table:

```sql
-- Purge expired user sessions daily at 03:00 UTC
CREATE EVENT purge_expired_sessions
ON SCHEDULE EVERY 1 DAY
STARTS '2026-04-01 03:00:00'
DO
  DELETE FROM user_sessions
  WHERE expires_at < NOW()
  LIMIT 10000;

-- Purge old audit logs (older than 90 days) daily
CREATE EVENT purge_old_audit_logs
ON SCHEDULE EVERY 1 DAY
STARTS '2026-04-01 03:30:00'
DO
  DELETE FROM audit_logs
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
  LIMIT 10000;
```

The `LIMIT` clause prevents the delete from locking the table for too long on tables with many rows to purge.

## Batch Deletion for Large Tables

For large purges, use a stored procedure that deletes in small batches:

```sql
DELIMITER //

CREATE PROCEDURE purge_old_events(IN retention_days INT, IN batch_size INT)
BEGIN
  DECLARE rows_deleted INT DEFAULT 1;
  DECLARE cutoff DATETIME DEFAULT DATE_SUB(NOW(), INTERVAL retention_days DAY);

  WHILE rows_deleted > 0 DO
    DELETE FROM user_events
    WHERE created_at < cutoff
    LIMIT batch_size;

    SET rows_deleted = ROW_COUNT();
    DO SLEEP(0.1);  -- Brief pause between batches to reduce I/O pressure
  END WHILE;
END //

DELIMITER ;

-- Call from an event
CREATE EVENT purge_user_events
ON SCHEDULE EVERY 1 DAY
STARTS '2026-04-01 04:00:00'
DO
  CALL purge_old_events(365, 5000);
```

## Monitoring Retention Jobs

Track event execution status:

```sql
-- View all scheduled events
SELECT event_name, status, last_executed, starts, ends
FROM information_schema.EVENTS
WHERE event_schema = 'myapp';
```

Log purge activity to an audit table:

```sql
CREATE TABLE retention_log (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name   VARCHAR(64) NOT NULL,
  rows_deleted INT NOT NULL,
  executed_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Compliance Verification

```sql
-- Verify no sessions older than 30 days exist
SELECT COUNT(*) AS expired_sessions
FROM user_sessions
WHERE expires_at < NOW();

-- Verify audit logs older than 90 days have been purged
SELECT COUNT(*) AS old_audit_logs
FROM audit_logs
WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

## Summary

Implementing MySQL data retention policies requires defining clear per-table retention periods, adding `expires_at` columns with indexes for efficient deletion, and using the MySQL Event Scheduler to run batch deletions on schedule. Batch deletion with small `LIMIT` values and brief pauses prevents lock contention on large tables. Retention logs and compliance verification queries provide auditability.
