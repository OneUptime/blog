# How to Use MySQL for Job Queue Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Queue, Background Job, Transaction, Concurrency

Description: Learn how to implement a reliable MySQL-backed job queue using SELECT FOR UPDATE SKIP LOCKED to safely dequeue jobs in concurrent worker environments.

---

A MySQL job queue is a practical choice when you want reliable background job processing without adding a dedicated message broker. The key to a correct MySQL queue is using `SELECT ... FOR UPDATE SKIP LOCKED`, which allows multiple workers to dequeue without conflicts or duplicate processing.

## Queue Schema

Design the jobs table to track status, attempts, and scheduling:

```sql
CREATE TABLE jobs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  queue        VARCHAR(100) NOT NULL DEFAULT 'default',
  payload      JSON NOT NULL,
  status       ENUM('pending', 'processing', 'done', 'failed') NOT NULL DEFAULT 'pending',
  attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 3,
  scheduled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at   DATETIME,
  finished_at  DATETIME,
  error        TEXT,
  INDEX idx_queue_status_scheduled (queue, status, scheduled_at)
) ENGINE=InnoDB;
```

## Enqueuing Jobs

```sql
INSERT INTO jobs (queue, payload, scheduled_at)
VALUES (
  'email',
  '{"to": "user@example.com", "template": "welcome", "user_id": 42}',
  NOW()
);

-- Schedule a job for the future
INSERT INTO jobs (queue, payload, scheduled_at)
VALUES (
  'reports',
  '{"report_type": "monthly", "period": "2026-03"}',
  '2026-04-01 06:00:00'
);
```

## Dequeuing with SKIP LOCKED

`SKIP LOCKED` is the critical ingredient: it causes the SELECT to skip rows that are already locked by another worker, enabling safe concurrent dequeuing:

```sql
START TRANSACTION;

SELECT id, payload INTO @job_id, @job_payload
FROM jobs
WHERE queue = 'email'
  AND status = 'pending'
  AND scheduled_at <= NOW()
ORDER BY scheduled_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- If a row was returned, mark it as processing
UPDATE jobs SET status = 'processing', started_at = NOW(), attempts = attempts + 1
WHERE id = @job_id;

COMMIT;
```

## Worker Loop in Python

```python
import time
import json

def process_jobs(conn, queue_name):
    while True:
        with conn.cursor() as cur:
            conn.begin()
            cur.execute("""
                SELECT id, payload FROM jobs
                WHERE queue = %s AND status = 'pending' AND scheduled_at <= NOW()
                ORDER BY scheduled_at LIMIT 1 FOR UPDATE SKIP LOCKED
            """, (queue_name,))
            row = cur.fetchone()

            if row:
                job_id, payload = row
                cur.execute(
                    "UPDATE jobs SET status='processing', started_at=NOW(), attempts=attempts+1 WHERE id=%s",
                    (job_id,)
                )
                conn.commit()

                try:
                    handle_job(json.loads(payload))
                    with conn.cursor() as cur2:
                        cur2.execute(
                            "UPDATE jobs SET status='done', finished_at=NOW() WHERE id=%s",
                            (job_id,)
                        )
                    conn.commit()
                except Exception as e:
                    with conn.cursor() as cur3:
                        cur3.execute(
                            "UPDATE jobs SET status='failed', error=%s WHERE id=%s",
                            (str(e), job_id)
                        )
                    conn.commit()
            else:
                conn.rollback()
                time.sleep(1)
```

## Retrying Failed Jobs

Requeue failed jobs that have not exceeded max_attempts:

```sql
UPDATE jobs
SET status = 'pending',
    scheduled_at = NOW() + INTERVAL 5 MINUTE
WHERE status = 'failed'
  AND attempts < max_attempts;
```

## Summary

A MySQL job queue built on `SELECT FOR UPDATE SKIP LOCKED` provides safe concurrent dequeuing without duplicate processing. The schema tracks status, attempts, and timing, enabling retry logic for failed jobs and delayed scheduling. This approach avoids adding a message broker and keeps job processing within your existing MySQL infrastructure, making it ideal for low-to-medium throughput workloads.
