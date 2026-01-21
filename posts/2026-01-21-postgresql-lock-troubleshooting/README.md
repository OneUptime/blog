# How to Troubleshoot PostgreSQL Lock Contention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Locks, Troubleshooting, Deadlocks, Performance

Description: A guide to identifying and resolving PostgreSQL lock contention issues, including deadlock analysis and prevention strategies.

---

Lock contention causes queries to wait and can lead to deadlocks. This guide covers troubleshooting and resolution.

## Identify Lock Issues

```sql
-- Queries waiting for locks
SELECT
    pid,
    usename,
    pg_blocking_pids(pid) AS blocked_by,
    query AS waiting_query,
    wait_event_type,
    wait_event
FROM pg_stat_activity
WHERE wait_event_type = 'Lock';
```

## Find Lock Hierarchy

```sql
-- Detailed lock blocking chain
WITH RECURSIVE lock_tree AS (
    SELECT pid, pg_blocking_pids(pid) AS blockers, query, 0 AS depth
    FROM pg_stat_activity
    WHERE cardinality(pg_blocking_pids(pid)) > 0

    UNION ALL

    SELECT a.pid, pg_blocking_pids(a.pid), a.query, lt.depth + 1
    FROM pg_stat_activity a
    JOIN lock_tree lt ON a.pid = ANY(lt.blockers)
    WHERE lt.depth < 5
)
SELECT * FROM lock_tree ORDER BY depth;
```

## Resolve Blocking

```sql
-- Terminate blocking session
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE pid IN (SELECT unnest(pg_blocking_pids(waiting_pid)));

-- Or cancel query
SELECT pg_cancel_backend(pid);
```

## Analyze Deadlocks

```bash
# Check logs for deadlock details
grep -A 20 "deadlock detected" /var/log/postgresql/*.log
```

## Prevention Strategies

```sql
-- Use SKIP LOCKED for queue-like patterns
SELECT * FROM tasks
WHERE status = 'pending'
FOR UPDATE SKIP LOCKED
LIMIT 1;

-- Use NOWAIT to fail fast
SELECT * FROM orders
WHERE id = 1
FOR UPDATE NOWAIT;

-- Set lock timeout
SET lock_timeout = '5s';
```

## Advisory Locks

```sql
-- Application-level locking
SELECT pg_advisory_lock(hashtext('my_resource'));
-- Do work
SELECT pg_advisory_unlock(hashtext('my_resource'));

-- Try lock (non-blocking)
SELECT pg_try_advisory_lock(hashtext('my_resource'));
```

## Best Practices

1. **Access tables in consistent order** - Prevents deadlocks
2. **Keep transactions short** - Release locks quickly
3. **Use appropriate isolation** - Lower when possible
4. **Index foreign keys** - Faster lock acquisition
5. **Use SKIP LOCKED** - For queue patterns

## Conclusion

Troubleshoot locks by identifying blocking chains and analyzing deadlock logs. Prevent issues with consistent access patterns and short transactions.
