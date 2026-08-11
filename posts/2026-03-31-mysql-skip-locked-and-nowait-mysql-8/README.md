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
SELECT *
FROM jobs FORCE INDEX (idx_jobs_claim)
WHERE status = 'pending'
ORDER BY created_at, id
LIMIT 1
FOR UPDATE;
-- Returns job #1, holds lock

-- Transaction 2 - skips job #1 and picks the next available job
START TRANSACTION;
SELECT *
FROM jobs FORCE INDEX (idx_jobs_claim)
WHERE status = 'pending'
ORDER BY created_at, id
LIMIT 1
FOR UPDATE SKIP LOCKED;
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
    INDEX idx_jobs_claim (status, created_at, id)
);

INSERT INTO jobs (payload, status) VALUES
    ('{"task": "send_email", "to": "user1@example.com"}', 'pending'),
    ('{"task": "send_email", "to": "user2@example.com"}', 'pending'),
    ('{"task": "resize_image", "file": "photo.jpg"}', 'pending');
```

The index order is part of the concurrency design. An InnoDB locking read [generally locks every index record it scans](https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html). An index on `status` alone can find pending jobs, but it cannot return them in `created_at` order. The locking scan feeding the filesort must [read all pending matches before it can return `LIMIT 1`](https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html), allowing one worker to lock every candidate and leaving other workers nothing to claim.

When the plan uses `idx_jobs_claim`, MySQL can read pending jobs in claim order and stop after the first unlocked row. The `id` column provides deterministic ordering when multiple jobs have the same timestamp. Because `status` is the leftmost column, the composite index can also serve queries that filter only by status.

Defining the index does not guarantee that the optimizer will select it, especially when most rows have the same status. The claim queries use `FORCE INDEX (idx_jobs_claim)` so this concurrency-sensitive access path cannot fall back to a table scan and filesort.

For an existing table that uses the original status-only index, replace it:

```sql
ALTER TABLE jobs
    DROP INDEX idx_status,
    ADD INDEX idx_jobs_claim (status, created_at, id);
```

Check the access plan with production-like data:

```sql
EXPLAIN
SELECT id, payload
FROM jobs FORCE INDEX (idx_jobs_claim)
WHERE status = 'pending'
ORDER BY created_at, id
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

The plan should use `idx_jobs_claim`, and its `Extra` column should not contain `Using filesort`. MySQL documents how a [composite index can satisfy `ORDER BY`](https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html) when its first column is fixed by the `WHERE` clause. Recheck this plan after MySQL upgrades or schema changes; do not rely on the queue's concurrency behavior if `Using filesort` appears.

Worker process:

```sql
-- Each worker runs this pattern
START TRANSACTION;

-- Claim the next available job, skipping any locked by other workers
SELECT id, payload
FROM jobs FORCE INDEX (idx_jobs_claim)
WHERE status = 'pending'
ORDER BY created_at, id
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
        SELECT id, payload FROM jobs FORCE INDEX (idx_jobs_claim)
        WHERE status = 'pending'
        ORDER BY created_at, id
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

`SKIP LOCKED` and `NOWAIT` in MySQL 8.0 are useful tools for building concurrent job queues and worker pools. With a claim access path that matches the filter and order, plus short claim transactions, `SKIP LOCKED` reduces row-lock waits and lets workers claim different jobs concurrently. `NOWAIT` provides immediate feedback when a row is contended. Both clauses complement careful query-plan and transaction design rather than replacing it.
