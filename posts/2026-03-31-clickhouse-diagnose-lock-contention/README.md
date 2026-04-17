# How to Diagnose ClickHouse Lock Contention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Lock Contention, Mutex, Diagnosis, Performance, system.rwlock_events

Description: Diagnose ClickHouse lock contention on RW locks, table mutexes, and ZooKeeper coordination paths using system tables and profiler metrics.

---

## Lock Types in ClickHouse

ClickHouse uses several locking mechanisms:

- **Table RW locks** - Reader/writer locks on table structures for DDL vs queries
- **Part locks** - Per-part locks during merges and reads
- **ZooKeeper distributed locks** - For replicated table coordination
- **Mutex locks** - In-process serialization of shared state

Unlike traditional databases, ClickHouse rarely shows classic "lock contention" on data rows. Contention usually appears at the table structure level or during heavy DDL activity.

## Step 1 - Check RW Lock Wait Events

```sql
SELECT
    query_id,
    user,
    ProfileEvents['RWLockAcquiredReadLocks'] AS read_locks,
    ProfileEvents['RWLockAcquiredWriteLocks'] AS write_locks,
    ProfileEvents['RWLockReadersWaitMilliseconds'] AS read_wait_ms,
    ProfileEvents['RWLockWritersWaitMilliseconds'] AS write_wait_ms,
    query
FROM system.query_log
WHERE event_date = today() AND type = 'QueryFinish'
  AND (ProfileEvents['RWLockReadersWaitMilliseconds'] > 100
    OR ProfileEvents['RWLockWritersWaitMilliseconds'] > 100)
ORDER BY write_wait_ms DESC
LIMIT 20;
```

## Step 2 - Check Live RWLock State

Inspect the current number of threads holding or waiting on table RWLocks via `system.metrics`:

```sql
SELECT metric, value, description
FROM system.metrics
WHERE metric IN (
    'RWLockWaitingReaders',
    'RWLockWaitingWriters',
    'RWLockActiveReaders',
    'RWLockActiveWriters'
);
```

## Common Causes of Lock Contention

### DDL During Active Queries

`ALTER TABLE` operations acquire a write lock. If queries are running, DDL waits. And queries issued after DDL starts wait for it to complete.

```sql
-- Check for active DDL
SELECT query, elapsed, query_id
FROM system.processes
WHERE query LIKE 'ALTER%' OR query LIKE 'CREATE%' OR query LIKE 'DROP%';
```

### Mutations on Active Tables

`ALTER TABLE ... DELETE/UPDATE` creates mutations that run in the background but can acquire locks on parts:

```sql
SELECT table, command, create_time, is_done, latest_fail_reason
FROM system.mutations
WHERE NOT is_done
ORDER BY create_time DESC;
```

Cancel stuck mutations:

```sql
KILL MUTATION WHERE table = 'events' AND NOT is_done;
```

### Too Many Simultaneous DDL Operations

Avoid running parallel schema changes on the same table. Serialize DDL changes in your deployment process.

## ZooKeeper Lock Contention

On replicated tables, ZooKeeper coordination can become a bottleneck. Check current ZooKeeper state in `system.metrics`:

```sql
SELECT metric, value
FROM system.metrics
WHERE metric LIKE '%ZooKeeper%' OR metric LIKE '%Keeper%';
```

For cumulative ZooKeeper wait time, check the `ZooKeeperWaitMicroseconds` profile event in `system.events`:

```sql
SELECT event, value
FROM system.events
WHERE event LIKE '%ZooKeeper%';
```

A high `ZooKeeperWaitMicroseconds` value indicates ZooKeeper is a bottleneck. Consider migrating to ClickHouse Keeper for better performance.

## Summary

Diagnose ClickHouse lock contention by checking `RWLock*` profile events in `system.query_log`, monitoring active mutations in `system.mutations`, and tracking ZooKeeper wait metrics. The most common fix is serializing DDL operations and canceling long-running mutations that block schema changes on active production tables.
