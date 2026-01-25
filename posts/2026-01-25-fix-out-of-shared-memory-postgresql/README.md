# How to Fix "out of shared memory" Errors in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, Shared Memory, Performance, Configuration

Description: Learn how to diagnose and fix "out of shared memory" errors in PostgreSQL. This guide covers the root causes, configuration tuning, and monitoring strategies to prevent memory issues.

---

The "out of shared memory" error in PostgreSQL typically indicates that the database has exhausted one of its memory-related resources. This error can be frustrating because it may appear suddenly even when your server has plenty of RAM available. Understanding what shared memory means in PostgreSQL and how to configure it properly is essential for running a stable production database.

---

## Understanding the Error

When PostgreSQL reports "out of shared memory," you might see messages like:

```
ERROR: out of shared memory
HINT: You might need to increase max_locks_per_transaction.

ERROR: out of shared memory
HINT: You might need to increase max_pred_locks_per_transaction.

ERROR: out of shared memory
DETAIL: Failed while allocating a hash table entry for tracking ...
```

The error message and hint will vary depending on which resource was exhausted.

---

## Common Causes

### 1. Too Many Locks

The most common cause is exceeding the number of locks PostgreSQL can track. Each table, index, or row lock consumes shared memory.

```sql
-- Check current lock count
SELECT
    count(*) as total_locks,
    mode,
    locktype
FROM pg_locks
GROUP BY mode, locktype
ORDER BY count(*) DESC;

-- Example output showing potential issues:
-- total_locks | mode          | locktype
-- 15000       | AccessShareLock | relation
-- 8500        | RowExclusiveLock | tuple
```

### 2. Many Subtransactions

Using too many savepoints or exception blocks in PL/pgSQL creates subtransactions, each requiring memory:

```sql
-- Bad pattern: Too many subtransactions
DO $$
BEGIN
    FOR i IN 1..10000 LOOP
        BEGIN  -- Each BEGIN creates a subtransaction
            INSERT INTO test_table VALUES (i);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END;
$$;
-- This can exhaust shared memory
```

### 3. Predicate Locks in Serializable Transactions

Serializable isolation level uses predicate locks which consume more memory:

```sql
-- High isolation level with many rows
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT * FROM large_table WHERE category = 'active';
-- Creates predicate locks on all matching rows
COMMIT;
```

### 4. Too Many Prepared Transactions

Unused or orphaned prepared transactions hold locks indefinitely:

```sql
-- Check for prepared transactions
SELECT * FROM pg_prepared_xacts;

-- Output might show:
-- transaction | gid                  | prepared            | owner
-- 12345678    | payment_txn_001      | 2026-01-20 10:00:00 | app_user
```

---

## Diagnostic Queries

### Check Current Memory Configuration

```sql
-- View relevant memory settings
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name IN (
    'shared_buffers',
    'max_connections',
    'max_locks_per_transaction',
    'max_pred_locks_per_transaction',
    'max_prepared_transactions'
)
ORDER BY name;
```

### Calculate Lock Memory Usage

```sql
-- Estimate lock table size
SELECT
    current_setting('max_connections')::int *
    current_setting('max_locks_per_transaction')::int as estimated_lock_slots;

-- Check actual lock usage vs capacity
SELECT
    count(*) as current_locks,
    current_setting('max_connections')::int *
    current_setting('max_locks_per_transaction')::int as max_locks,
    round(
        100.0 * count(*) /
        (current_setting('max_connections')::int *
         current_setting('max_locks_per_transaction')::int)
    , 2) as usage_percent
FROM pg_locks;
```

### Find Sessions Holding Many Locks

```sql
-- Identify sessions with the most locks
SELECT
    l.pid,
    a.usename,
    a.application_name,
    a.client_addr,
    a.state,
    count(*) as lock_count,
    a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
GROUP BY l.pid, a.usename, a.application_name, a.client_addr, a.state, a.query
ORDER BY lock_count DESC
LIMIT 10;
```

---

## Solutions

### Solution 1: Increase max_locks_per_transaction

This is often the first fix to try:

```sql
-- Check current setting
SHOW max_locks_per_transaction;
-- Default is typically 64

-- Calculate how many locks your workload needs
-- Formula: max_connections * max_locks_per_transaction
```

Edit `postgresql.conf`:

```ini
# Increase from default of 64
max_locks_per_transaction = 256

# For workloads with many partitions or tables per query
max_locks_per_transaction = 512
```

Remember to restart PostgreSQL after changing this setting.

### Solution 2: Increase max_pred_locks_per_transaction

For serializable transactions:

```ini
# In postgresql.conf
# Default is 64
max_pred_locks_per_transaction = 128

# For complex serializable workloads
max_pred_locks_per_transaction = 256
```

### Solution 3: Clean Up Prepared Transactions

```sql
-- List all prepared transactions
SELECT * FROM pg_prepared_xacts;

-- Rollback orphaned prepared transactions
-- WARNING: Only do this if you're sure the transaction should be aborted
ROLLBACK PREPARED 'transaction_name_here';

-- Or commit if the transaction was successful
COMMIT PREPARED 'transaction_name_here';
```

If you do not use prepared transactions, disable them:

```ini
# In postgresql.conf
max_prepared_transactions = 0
```

### Solution 4: Reduce Lock Contention in Application Code

Refactor queries that lock many objects:

```python
# Bad: Locks entire table with many partitions
def process_all_partitions(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM partitioned_table")  # Locks all partitions
    # Process...

# Better: Process partitions individually
def process_partitions_individually(conn):
    cursor = conn.cursor()

    # Get partition names
    cursor.execute("""
        SELECT inhrelid::regclass::text as partition_name
        FROM pg_inherits
        WHERE inhparent = 'partitioned_table'::regclass
    """)
    partitions = cursor.fetchall()

    for (partition_name,) in partitions:
        cursor.execute(f"SELECT * FROM {partition_name}")
        # Process this partition
        conn.commit()  # Release locks after each partition
```

### Solution 5: Batch Operations to Reduce Locks

```sql
-- Bad: Single query locking thousands of rows
UPDATE orders SET status = 'archived' WHERE created_at < '2025-01-01';

-- Better: Process in batches
DO $$
DECLARE
    batch_size INT := 1000;
    updated_count INT;
BEGIN
    LOOP
        UPDATE orders
        SET status = 'archived'
        WHERE id IN (
            SELECT id FROM orders
            WHERE created_at < '2025-01-01'
            AND status != 'archived'
            LIMIT batch_size
            FOR UPDATE SKIP LOCKED
        );

        GET DIAGNOSTICS updated_count = ROW_COUNT;

        COMMIT;  -- Release locks after each batch

        EXIT WHEN updated_count = 0;

        RAISE NOTICE 'Updated % rows', updated_count;
    END LOOP;
END;
$$;
```

### Solution 6: Avoid Excessive Subtransactions

```sql
-- Bad: Creates a subtransaction for each iteration
DO $$
BEGIN
    FOR i IN 1..10000 LOOP
        BEGIN
            INSERT INTO test_table VALUES (i);
        EXCEPTION WHEN unique_violation THEN
            NULL;
        END;
    END LOOP;
END;
$$;

-- Better: Use ON CONFLICT instead of exception handling
DO $$
BEGIN
    FOR i IN 1..10000 LOOP
        INSERT INTO test_table VALUES (i)
        ON CONFLICT DO NOTHING;  -- No subtransaction needed
    END LOOP;
END;
$$;

-- Best: Single statement
INSERT INTO test_table
SELECT generate_series(1, 10000)
ON CONFLICT DO NOTHING;
```

---

## Configuration Recommendations

### Calculating Shared Memory Requirements

The total shared memory needed depends on several settings:

```sql
-- Estimate shared memory usage
SELECT
    -- Base shared buffers
    pg_size_pretty(
        current_setting('shared_buffers')::bigint * 8192
    ) as shared_buffers_size,

    -- Lock table estimate (rough)
    pg_size_pretty(
        current_setting('max_connections')::bigint *
        current_setting('max_locks_per_transaction')::bigint *
        400  -- Approximate bytes per lock entry
    ) as estimated_lock_table;
```

### Recommended Settings by Workload

```ini
# Small workload (< 100 tables, simple queries)
max_locks_per_transaction = 64
max_pred_locks_per_transaction = 64

# Medium workload (100-500 tables, some complex queries)
max_locks_per_transaction = 128
max_pred_locks_per_transaction = 128

# Large workload (partitioned tables, many joins)
max_locks_per_transaction = 256
max_pred_locks_per_transaction = 256

# Very large workload (heavily partitioned, complex analytics)
max_locks_per_transaction = 512
max_pred_locks_per_transaction = 512
```

---

## Monitoring and Prevention

### Create a Monitoring Query

```sql
-- Create a view for lock monitoring
CREATE VIEW lock_monitor AS
SELECT
    count(*) as total_locks,
    current_setting('max_connections')::int *
    current_setting('max_locks_per_transaction')::int as max_locks,
    round(
        100.0 * count(*) /
        (current_setting('max_connections')::int *
         current_setting('max_locks_per_transaction')::int)
    , 2) as usage_percent,
    max(count(*)) OVER () as peak_locks
FROM pg_locks;

-- Query the monitor
SELECT * FROM lock_monitor;
```

### Set Up Alerts

Monitor lock usage and alert before hitting limits:

```sql
-- Check if lock usage exceeds 80%
SELECT
    CASE
        WHEN (count(*)::float /
              (current_setting('max_connections')::int *
               current_setting('max_locks_per_transaction')::int)) > 0.8
        THEN 'WARNING: Lock usage above 80%'
        ELSE 'OK'
    END as lock_status
FROM pg_locks;
```

---

## Conclusion

The "out of shared memory" error in PostgreSQL is usually caused by exhausting lock-related resources rather than actual RAM. The key solutions are:

1. Increase `max_locks_per_transaction` for general workloads
2. Clean up orphaned prepared transactions
3. Refactor application code to reduce lock contention
4. Process large operations in batches
5. Avoid excessive subtransactions

Monitoring lock usage proactively will help you prevent these errors before they impact production.

---

*Need to monitor your PostgreSQL memory usage? [OneUptime](https://oneuptime.com) provides real-time database monitoring with alerts for memory issues, lock contention, and performance problems.*
