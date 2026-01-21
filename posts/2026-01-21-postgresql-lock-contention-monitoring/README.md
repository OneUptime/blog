# How to Monitor PostgreSQL Lock Contention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Locks, Monitoring, Performance, Deadlocks

Description: A guide to monitoring PostgreSQL lock contention, detecting deadlocks, and resolving blocking queries.

---

Lock contention can severely impact performance. This guide covers monitoring and resolving lock issues.

## View Current Locks

```sql
-- All current locks
SELECT
    pid,
    locktype,
    relation::regclass,
    mode,
    granted,
    query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE relation IS NOT NULL;
```

## Detect Blocking

```sql
-- Find blocking and blocked queries
SELECT
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query,
    blocked.wait_event_type,
    blocked.wait_event
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks ON blocked_locks.locktype = blocking_locks.locktype
    AND blocked_locks.relation = blocking_locks.relation
    AND blocked_locks.pid != blocking_locks.pid
JOIN pg_stat_activity blocking ON blocking_locks.pid = blocking.pid
WHERE NOT blocked_locks.granted
AND blocking_locks.granted;
```

## Monitor Lock Waits

```conf
# postgresql.conf
log_lock_waits = on
deadlock_timeout = 1s  # Log after 1 second wait
```

## Deadlock Detection

```sql
-- Recent deadlocks (from logs)
-- grep "deadlock detected" /var/log/postgresql/*.log

-- View deadlock statistics
SELECT deadlocks FROM pg_stat_database WHERE datname = 'myapp';
```

## Kill Blocking Query

```sql
-- Terminate blocking session
SELECT pg_terminate_backend(blocking_pid);

-- Cancel query (gentler)
SELECT pg_cancel_backend(blocking_pid);
```

## Lock Timeout

```sql
-- Set lock timeout for session
SET lock_timeout = '10s';

-- For specific statement
SET LOCAL lock_timeout = '5s';
```

## Prometheus Metrics

```yaml
# Alert on lock contention
- alert: PostgreSQLHighLockContention
  expr: pg_locks_count{mode="ExclusiveLock"} > 10
  for: 5m
  labels:
    severity: warning
```

## Best Practices

1. **Log lock waits** - Early detection
2. **Set lock timeouts** - Prevent indefinite waits
3. **Monitor deadlocks** - Track in metrics
4. **Keep transactions short** - Reduce lock duration
5. **Use appropriate isolation** - Not stricter than needed

## Conclusion

Monitor locks to detect contention early. Use lock timeouts and keep transactions short to minimize blocking.
