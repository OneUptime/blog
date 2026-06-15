# How to Reduce Lock Contention in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Performance, Concurrency, Database, Lock

Description: Learn practical techniques to identify and reduce lock contention in PostgreSQL, including query optimization, transaction management, and lock monitoring strategies for high-concurrency workloads.

---

Lock contention is one of the most common performance killers in PostgreSQL. When multiple transactions compete for the same resources, you end up with queries waiting in line instead of executing. This guide walks through practical techniques to identify bottlenecks and keep your database humming.

## Understanding PostgreSQL Locks

PostgreSQL uses a sophisticated locking system to maintain data consistency. The main lock types you will encounter are:

- **ACCESS SHARE**: Acquired by SELECT queries
- **ROW SHARE**: Acquired by SELECT FOR UPDATE/SHARE
- **ROW EXCLUSIVE**: Acquired by INSERT, UPDATE, DELETE
- **SHARE UPDATE EXCLUSIVE**: Used by VACUUM, ANALYZE, CREATE INDEX CONCURRENTLY
- **SHARE**: Acquired by CREATE INDEX (non-concurrent)
- **ACCESS EXCLUSIVE**: Acquired by ALTER TABLE, DROP TABLE, TRUNCATE

The problem starts when these locks conflict with each other. A SELECT does not block another SELECT, but an UPDATE blocks other UPDATEs on the same row.

## Identifying Lock Contention

Before fixing anything, you need to see what is actually happening. PostgreSQL provides several system views for this purpose.

### Monitor Active Locks

This query shows current locks and which queries are waiting:

```sql
-- Find blocked queries and what is blocking them
SELECT
    blocked.pid AS blocked_pid,
    blocked.usename AS blocked_user,
    blocking.pid AS blocking_pid,
    blocking.usename AS blocking_user,
    blocked.query AS blocked_statement,
    blocking.query AS blocking_statement
FROM pg_catalog.pg_stat_activity blocked
JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS blockers(pid) ON true
JOIN pg_catalog.pg_stat_activity blocking
    ON blocking.pid = blockers.pid;
```

### Track Lock Wait Times

Enable lock wait logging to capture slow lock acquisitions:

```sql
-- Log queries that wait more than 1 second for locks
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET deadlock_timeout = '1s';
SELECT pg_reload_conf();
```

Check your PostgreSQL logs for entries like "process 12345 still waiting for ShareLock on transaction 67890 after 1000.123 ms".

## Strategy 1: Keep Transactions Short

Long-running transactions are the primary cause of lock contention. The longer a transaction holds locks, the more likely other transactions will queue up behind it.

```sql
-- BAD: Long transaction holding locks
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- ... application does other work for 5 seconds ...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- BETTER: Split into smaller transactions when possible
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

BEGIN;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

For cases where you need atomicity, minimize the work done inside the transaction:

```sql
-- Fetch data outside the transaction
SELECT * FROM accounts WHERE id IN (1, 2);
-- Application validates the data here

-- Then do the update in a tight transaction
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

## Strategy 2: Lock Rows in Consistent Order

Deadlocks happen when two transactions lock rows in opposite orders. Always lock rows in the same order across your application.

```sql
-- Transaction A locks row 1, then row 2
-- Transaction B locks row 2, then row 1
-- Result: Deadlock!

-- Fix: Always lock in a consistent order (e.g., by primary key)
BEGIN;
-- Sort IDs and process in order
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

For batch updates, sort your data first:

```sql
-- Process updates in primary key order to avoid deadlocks
WITH sorted_updates AS (
    SELECT id, new_balance
    FROM unnest(
        ARRAY[5, 2, 8, 1],
        ARRAY[500, 200, 800, 100]
    ) AS updates(id, new_balance)
    ORDER BY id  -- Consistent ordering
)
UPDATE accounts a
SET balance = s.new_balance
FROM sorted_updates s
WHERE a.id = s.id;
```

## Strategy 3: Use SKIP LOCKED for Queue Processing

When multiple workers process rows from a queue table, SKIP LOCKED prevents them from blocking each other:

```sql
-- Worker grabs the next available job, skipping locked rows
BEGIN;

SELECT id, payload
FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- Process the job here

UPDATE job_queue SET status = 'completed' WHERE id = ?;
COMMIT;
```

This pattern is essential for job queues and task processing systems. Workers never wait for each other.

## Strategy 4: Use Advisory Locks for Application-Level Locking

Sometimes you need to coordinate at the application level without locking actual rows. Advisory locks provide this capability:

```sql
-- Acquire an advisory lock (blocks until acquired)
SELECT pg_advisory_lock(12345);

-- Your critical section here
UPDATE settings SET value = 'new_value' WHERE key = 'config';

-- Release the lock
SELECT pg_advisory_unlock(12345);
```

For non-blocking attempts:

```sql
-- Try to acquire lock, return immediately if not available
SELECT pg_try_advisory_lock(12345) AS acquired;
-- Check the result before proceeding
```

Advisory locks are useful for:
- Preventing duplicate cron job execution
- Serializing access to external resources
- Implementing distributed locks

## Strategy 5: Optimize Index Creation

Creating indexes on large tables can block writes for extended periods. Use concurrent index creation instead:

```sql
-- This blocks all writes to the table
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- This allows writes to continue (takes longer but non-blocking)
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders(customer_id);
```

Note that CONCURRENTLY has some caveats:
- Takes longer to complete
- Cannot run inside a transaction
- May fail and leave an invalid index (check with `\d tablename`)

## Strategy 6: Partition Hot Tables

When contention is concentrated in predictable ranges, partitioning can spread the load across separate physical tables:

```sql
-- Create a partitioned table
CREATE TABLE events (
    id BIGSERIAL,
    created_at TIMESTAMP NOT NULL,
    event_type VARCHAR(50),
    payload JSONB
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE events_2026_01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE events_2026_02 PARTITION OF events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

With partitioning, transactions and maintenance operations targeting different time ranges can work on different physical tables.

## Strategy 7: Use Appropriate Isolation Levels

The default READ COMMITTED level is usually fine, but sometimes you should be explicit about the consistency you need:

```sql
-- For read-heavy analytics queries that need a stable snapshot
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT count(*) FROM large_table WHERE created_at > '2026-01-01';
COMMIT;
```

Plain SELECT queries use snapshots and do not block writers. REPEATABLE READ keeps that snapshot stable for the whole transaction, but applications should still be prepared to retry transactions if they later add writes at this isolation level.

## Monitoring Lock Contention Over Time

Set up continuous monitoring to catch contention issues early:

```sql
-- Create a table to track lock statistics
CREATE TABLE lock_stats (
    captured_at TIMESTAMP DEFAULT now(),
    waiting_count INTEGER,
    longest_wait_seconds NUMERIC
);

-- Run this periodically (e.g., every minute via cron)
INSERT INTO lock_stats (waiting_count, longest_wait_seconds)
SELECT
    count(*),
    max(extract(epoch from now() - query_start))
FROM pg_stat_activity
WHERE wait_event_type = 'Lock';
```

## Quick Wins Checklist

Here is a summary of the most effective techniques:

1. **Enable lock wait logging** to capture slow lock acquisitions
2. **Keep transactions under 1 second** whenever possible
3. **Use SKIP LOCKED** for queue-style processing
4. **Create indexes concurrently** on production tables
5. **Lock rows in consistent order** to prevent deadlocks
6. **Monitor pg_stat_activity** for waiting queries
7. **Consider partitioning** for high-contention tables

Lock contention often sneaks up gradually as traffic grows. The key is to monitor proactively and apply these patterns before users start complaining about slow responses. Start with the monitoring queries above, identify your hotspots, and then apply the appropriate strategy for each case.
