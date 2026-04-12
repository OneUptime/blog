# How to Implement a Message Queue in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Message Queue, Job Queue, Transaction, FOR UPDATE

Description: Learn how to implement a reliable message queue in MySQL using a jobs table, SELECT FOR UPDATE SKIP LOCKED, and transactional dequeue for background task processing.

---

## Why Use MySQL as a Message Queue?

For applications that already use MySQL, building a simple message queue on top of the database avoids introducing a separate system like Redis or RabbitMQ. MySQL supports transactional job processing, persistent storage, and retry logic out of the box.

## Creating the Jobs Table

```sql
CREATE TABLE jobs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  queue       VARCHAR(100) NOT NULL DEFAULT 'default',
  payload     JSON NOT NULL,
  status      ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 3,
  available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reserved_at  DATETIME DEFAULT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  failed_at    DATETIME DEFAULT NULL,
  INDEX idx_queue_status_available (queue, status, available_at)
) ENGINE=InnoDB;
```

## Enqueuing a Job

```sql
INSERT INTO jobs (queue, payload, available_at)
VALUES (
  'emails',
  JSON_OBJECT('to', 'alice@example.com', 'subject', 'Welcome', 'template', 'welcome'),
  NOW()
);

-- Schedule a delayed job (available in 5 minutes)
INSERT INTO jobs (queue, payload, available_at)
VALUES ('emails', JSON_OBJECT('to', 'bob@example.com'), NOW() + INTERVAL 5 MINUTE);
```

## Dequeuing with SELECT FOR UPDATE SKIP LOCKED

`SKIP LOCKED` is critical - it skips rows locked by other worker threads, enabling concurrent consumers without blocking:

```sql
START TRANSACTION;

SELECT id, payload
FROM jobs
WHERE queue = 'emails'
  AND status = 'pending'
  AND available_at <= NOW()
ORDER BY id ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- If a row was found, mark it as processing
UPDATE jobs
SET status = 'processing',
    reserved_at = NOW(),
    attempts = attempts + 1
WHERE id = :job_id;

COMMIT;
```

## Processing and Completing a Job

```python
import mysql.connector
import json

conn = mysql.connector.connect(host="db", user="app", password="secret", database="myapp")
cur = conn.cursor(dictionary=True)

conn.start_transaction()

cur.execute("""
  SELECT id, payload FROM jobs
  WHERE queue = 'emails' AND status = 'pending' AND available_at <= NOW()
  ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED
""")
job = cur.fetchone()

if job:
    cur.execute("UPDATE jobs SET status='processing', reserved_at=NOW(), attempts=attempts+1 WHERE id=%s", (job['id'],))
    conn.commit()

    try:
        data = json.loads(job['payload'])
        # ... process job ...
        cur.execute("UPDATE jobs SET status='completed' WHERE id=%s", (job['id'],))
        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.execute("""
          UPDATE jobs SET status=IF(attempts >= max_attempts,'failed','pending'),
          available_at = NOW() + INTERVAL 60 SECOND WHERE id=%s
        """, (job['id'],))
        conn.commit()
```

## Cleaning Up Completed Jobs

```sql
-- Archive or delete old completed jobs
DELETE FROM jobs
WHERE status = 'completed'
  AND created_at < NOW() - INTERVAL 7 DAY;
```

## Summary

Implement a MySQL message queue using a `jobs` table with a `status` column and `available_at` scheduling. Use `SELECT FOR UPDATE SKIP LOCKED` to enable multiple concurrent workers without row contention. Handle failures with an attempt counter and a retry delay by updating `available_at`. Regularly purge completed jobs to control table size.
