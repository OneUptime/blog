# How to Implement a FIFO Queue in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Queue, Pattern, Concurrency, Lock

Description: Learn how to implement a reliable FIFO queue in MySQL using SKIP LOCKED for concurrent workers to process jobs in order without blocking.

---

## Why Use MySQL as a Queue?

For teams already using MySQL, implementing a FIFO queue directly in MySQL avoids adding dedicated message broker infrastructure. MySQL handles moderate queue throughput (hundreds to low thousands of jobs per second) well when designed correctly.

## Queue Schema

```sql
CREATE TABLE job_queue (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    queue_name VARCHAR(100) NOT NULL DEFAULT 'default',
    payload JSON NOT NULL,
    status ENUM('pending', 'processing', 'done', 'failed') NOT NULL DEFAULT 'pending',
    priority INT NOT NULL DEFAULT 0,        -- Higher = processed first
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    available_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- For delayed jobs
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    failed_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pending (queue_name, status, priority DESC, id ASC),
    INDEX idx_stalled (status, started_at)
);
```

## Enqueuing Jobs

```sql
-- Enqueue a simple job (FIFO order by id)
INSERT INTO job_queue (queue_name, payload)
VALUES ('emails', JSON_OBJECT('to', 'user@example.com', 'template', 'welcome'));

-- Enqueue with higher priority
INSERT INTO job_queue (queue_name, payload, priority)
VALUES ('emails', JSON_OBJECT('to', 'admin@example.com', 'template', 'alert'), 10);

-- Enqueue a delayed job (available in 5 minutes)
INSERT INTO job_queue (queue_name, payload, available_at)
VALUES ('reminders', JSON_OBJECT('user_id', 42, 'type', 'follow_up'),
        DATE_ADD(NOW(), INTERVAL 5 MINUTE));
```

## Dequeuing with SKIP LOCKED

`SKIP LOCKED` is the key to concurrent workers - each worker claims a different job:

```sql
-- Worker dequeue: claim the next available job atomically
START TRANSACTION;

SELECT id, payload
FROM job_queue
WHERE queue_name = 'emails'
  AND status = 'pending'
  AND available_at <= NOW()
ORDER BY priority DESC, id ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- Mark as processing (substitute :job_id with the returned id)
UPDATE job_queue
SET status = 'processing',
    started_at = NOW(),
    attempts = attempts + 1
WHERE id = :job_id;

COMMIT;
```

## Worker Implementation in Python

```python
import mysql.connector

def dequeue_job(conn, queue_name='default'):
    cursor = conn.cursor(dictionary=True)
    conn.start_transaction()

    cursor.execute("""
        SELECT id, payload, attempts, max_attempts
        FROM job_queue
        WHERE queue_name = %s
          AND status = 'pending'
          AND available_at <= NOW()
        ORDER BY priority DESC, id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    """, (queue_name,))

    job = cursor.fetchone()
    if job:
        cursor.execute("""
            UPDATE job_queue
            SET status = 'processing', started_at = NOW(), attempts = attempts + 1
            WHERE id = %s
        """, (job['id'],))
        conn.commit()
    else:
        conn.rollback()

    return job

def complete_job(conn, job_id):
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE job_queue
        SET status = 'done', completed_at = NOW()
        WHERE id = %s
    """, (job_id,))
    conn.commit()

def fail_job(conn, job_id, reason, retry_delay_seconds=60):
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT attempts, max_attempts FROM job_queue WHERE id = %s", (job_id,))
    job = cursor.fetchone()

    if job['attempts'] >= job['max_attempts']:
        cursor.execute("""
            UPDATE job_queue
            SET status = 'failed', failed_reason = %s, completed_at = NOW()
            WHERE id = %s
        """, (reason, job_id))
    else:
        # Retry after delay
        cursor.execute("""
            UPDATE job_queue
            SET status = 'pending',
                available_at = DATE_ADD(NOW(), INTERVAL %s SECOND),
                failed_reason = %s
            WHERE id = %s
        """, (retry_delay_seconds, reason, job_id))

    conn.commit()
```

## Recovering Stalled Jobs

Jobs can get stuck in "processing" if a worker crashes:

```sql
-- Reset jobs stuck in processing for over 5 minutes
UPDATE job_queue
SET status = 'pending',
    started_at = NULL
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL 5 MINUTE
  AND attempts < max_attempts;

-- Schedule automatic recovery
CREATE EVENT recover_stalled_jobs
ON SCHEDULE EVERY 1 MINUTE
DO
    UPDATE job_queue
    SET status = 'pending', started_at = NULL
    WHERE status = 'processing'
      AND started_at < NOW() - INTERVAL 5 MINUTE
      AND attempts < max_attempts;
```

## Queue Depth Monitoring

```sql
-- Monitor queue depth per queue and status
SELECT
    queue_name,
    status,
    COUNT(*) AS count,
    MIN(created_at) AS oldest_job
FROM job_queue
WHERE status IN ('pending', 'processing', 'failed')
GROUP BY queue_name, status;
```

## Summary

A MySQL FIFO queue uses `SELECT ... FOR UPDATE SKIP LOCKED` to allow concurrent workers to claim jobs without blocking each other. Priority ordering and delayed availability (`available_at`) support advanced scheduling patterns. Stalled job recovery and retry logic with configurable delay make the queue resilient to worker failures. For most applications, this pattern handles queue workloads efficiently without additional infrastructure.
