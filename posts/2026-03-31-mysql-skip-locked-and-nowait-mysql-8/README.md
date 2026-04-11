# How to Use SKIP LOCKED and NOWAIT in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Concurrency, Lock, Transaction, Queue

Description: Learn how MySQL 8's SKIP LOCKED and NOWAIT clauses enable non-blocking row locking for job queues and concurrent processing patterns.

---

## The Problem with Blocking Locks

When multiple application workers compete to claim rows from a table (like a job queue), they often hit locking contention. Without special handling, a `SELECT ... FOR UPDATE` will block and wait until another transaction releases its lock - causing workers to pile up waiting for each other.

MySQL 8.0 added two clauses to `SELECT ... FOR UPDATE` and `SELECT ... FOR SHARE` that change this behavior: `NOWAIT` and `SKIP LOCKED`.

## NOWAIT - Fail Instead of Wait

`NOWAIT` causes the query to immediately return an error if any requested row is already locked, rather than blocking:

```sql
-- Transaction 1 locks a row
START TRANSACTION;
SELECT * FROM jobs WHERE id = 1 FOR UPDATE;
-- holds the lock...

-- Transaction 2 with NOWAIT - fails immediately
START TRANSACTION;
SELECT * FROM jobs WHERE id = 1 FOR UPDATE NOWAIT;
-- ERROR 3572 (HY000): Statement aborted because lock(s) could not be acquired
-- immediately and NOWAIT is set.
ROLLBACK;
```

This is useful when you want to retry with a different row or a different strategy rather than blocking.

## SKIP LOCKED - Skip Locked Rows

`SKIP LOCKED` skips over any rows that are currently locked by other transactions and returns only the unlocked rows:

```sql
-- Transaction 1 locks job #1
START TRANSACTION;
SELECT * FROM jobs WHERE status = 'pending' LIMIT 1 FOR UPDATE;
-- Returns job #1, holds lock

-- Transaction 2 - skips job #1 and picks the next available job
START TRANSACTION;
SELECT * FROM jobs WHERE status = 'pending' LIMIT 1 FOR UPDATE SKIP LOCKED;
-- Returns job #2 (skips locked job #1)
```

## Building a Job Queue with SKIP LOCKED

This pattern is ideal for concurrent worker pools:

```sql
CREATE TABLE jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payload JSON NOT NULL,
    status ENUM('pending', 'processing', 'done', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status)
);

INSERT INTO jobs (payload, status) VALUES
    ('{"task": "send_email", "to": "user1@example.com"}', 'pending'),
    ('{"task": "send_email", "to": "user2@example.com"}', 'pending'),
    ('{"task": "resize_image", "file": "photo.jpg"}', 'pending');
```

Worker process:

```sql
-- Each worker runs this pattern
START TRANSACTION;

-- Claim the next available job, skipping any locked by other workers
SELECT id, payload
FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- If a row was returned, mark it as processing
UPDATE jobs SET status = 'processing' WHERE id = :claimed_id;

COMMIT;

-- Process the job, then mark done
UPDATE jobs SET status = 'done' WHERE id = :claimed_id;
```

## Application-Level Implementation

```python
import mysql.connector

def claim_next_job(conn):
    cursor = conn.cursor(dictionary=True)
    conn.start_transaction()

    cursor.execute("""
        SELECT id, payload FROM jobs
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    """)

    job = cursor.fetchone()
    if job:
        cursor.execute(
            "UPDATE jobs SET status = 'processing' WHERE id = %s",
            (job['id'],)
        )
        conn.commit()
    else:
        conn.rollback()

    return job
```

## Combining NOWAIT with Error Handling

```sql
-- Use NOWAIT in a stored procedure with error handling
DELIMITER //
CREATE PROCEDURE try_claim_job(IN target_id INT)
BEGIN
    DECLARE EXIT HANDLER FOR 3572
    BEGIN
        ROLLBACK;
        -- Row was locked, retry logic here
    END;

    START TRANSACTION;
    SELECT * FROM jobs WHERE id = target_id FOR UPDATE NOWAIT;
    -- If the row is locked, the handler catches error 3572
END //
DELIMITER ;
```

## Summary

`SKIP LOCKED` and `NOWAIT` in MySQL 8.0 are essential tools for building concurrent job queues and worker pools. `SKIP LOCKED` enables multiple workers to efficiently pull work items without blocking each other, while `NOWAIT` provides immediate feedback when a row is contended. Together, they eliminate lock wait bottlenecks and enable scalable producer-consumer patterns directly in MySQL.
