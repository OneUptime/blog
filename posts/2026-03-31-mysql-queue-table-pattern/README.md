# How to Implement a Queue Table Pattern in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Queue, Pattern

Description: Learn how to implement a reliable job queue using MySQL tables with atomic dequeue operations, status tracking, and worker concurrency control.

---

A queue table in MySQL stores work items that workers consume in order. This pattern is useful when you need durable, persistent queues without a separate message broker. MySQL's transaction support and locking mechanisms make it possible to implement safe concurrent dequeuing.

## Queue Table Schema

Design the table to support status transitions and visibility:

```sql
CREATE TABLE job_queue (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payload     JSON NOT NULL,
  status      ENUM('pending', 'processing', 'done', 'failed') NOT NULL DEFAULT 'pending',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at   DATETIME NULL,
  locked_by   VARCHAR(100) NULL,
  attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 3,
  INDEX idx_status_created (status, created_at)
);
```

The `locked_by` field identifies which worker holds a job, and `locked_at` enables timeout-based recovery.

## Enqueuing Jobs

Insert new jobs in the pending state:

```sql
INSERT INTO job_queue (payload)
VALUES ('{"task": "send_email", "to": "user@example.com", "template": "welcome"}');
```

## Atomic Dequeue with SELECT ... FOR UPDATE SKIP LOCKED

The safest way to claim a job is to use `SELECT ... FOR UPDATE SKIP LOCKED`, which atomically locks a row and skips rows already locked by other workers:

```sql
START TRANSACTION;

SELECT id, payload
FROM job_queue
WHERE status = 'pending'
  AND attempts < max_attempts
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- If a row was returned, claim it:
UPDATE job_queue
SET
  status    = 'processing',
  locked_at = NOW(),
  locked_by = 'worker-1',
  attempts  = attempts + 1
WHERE id = ?;  -- use the id from SELECT

COMMIT;
```

`SKIP LOCKED` requires MySQL 8.0+ and ensures that multiple workers can dequeue simultaneously without blocking each other.

## Processing and Completing Jobs

After successfully processing a job, mark it done:

```sql
UPDATE job_queue
SET status = 'done', locked_at = NULL, locked_by = NULL
WHERE id = ? AND locked_by = 'worker-1';
```

On failure, either retry or mark as failed:

```sql
UPDATE job_queue
SET
  status    = IF(attempts >= max_attempts, 'failed', 'pending'),
  locked_at = NULL,
  locked_by = NULL
WHERE id = ? AND locked_by = 'worker-1';
```

## Recovering Stale Jobs

Workers that crash leave jobs in the `processing` state indefinitely. A periodic cleanup job reclaims them:

```sql
UPDATE job_queue
SET status = 'pending', locked_at = NULL, locked_by = NULL
WHERE status = 'processing'
  AND locked_at < NOW() - INTERVAL 5 MINUTE
  AND attempts < max_attempts;
```

Run this as a scheduled event or cron job.

## MySQL Event for Cleanup

```sql
CREATE EVENT recover_stale_jobs
ON SCHEDULE EVERY 1 MINUTE
DO
  UPDATE job_queue
  SET status = 'pending', locked_at = NULL, locked_by = NULL
  WHERE status = 'processing'
    AND locked_at < NOW() - INTERVAL 5 MINUTE
    AND attempts < max_attempts;
```

## Dead Letter Queue

Separate failed jobs for manual inspection:

```sql
CREATE TABLE dead_letter_queue LIKE job_queue;

INSERT INTO dead_letter_queue
SELECT * FROM job_queue WHERE status = 'failed';

DELETE FROM job_queue WHERE status = 'failed';
```

## Summary

The MySQL queue table pattern uses `SELECT ... FOR UPDATE SKIP LOCKED` for safe concurrent dequeuing, status columns for lifecycle tracking, and a periodic recovery process for crashed workers. It provides a durable, transactional queue suitable for moderate workloads without requiring an external broker.
