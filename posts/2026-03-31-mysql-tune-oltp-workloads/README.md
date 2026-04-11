# How to Tune MySQL for OLTP Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, OLTP, Tuning, Transaction

Description: Tune MySQL for OLTP workloads by optimizing InnoDB transaction settings, connection management, and lock contention to handle thousands of concurrent short transactions.

---

Online Transaction Processing (OLTP) workloads consist of many concurrent, short-lived transactions - think e-commerce orders, user authentication, and payment processing. These workloads demand low latency per transaction and high throughput simultaneously.

## Characteristics of OLTP Workloads

OLTP queries are typically:
- Short-lived (milliseconds to low seconds)
- High concurrency (hundreds to thousands of concurrent connections)
- Row-level operations (INSERT, UPDATE, DELETE on specific rows by primary key)
- Requiring strong consistency (ACID compliance)

Benchmark your current OLTP performance with sysbench:

```bash
sysbench oltp_read_write \
  --mysql-host=localhost \
  --mysql-db=sbtest \
  --mysql-user=root \
  --mysql-password=secret \
  --tables=10 \
  --table-size=1000000 \
  --threads=64 \
  --time=60 \
  prepare

sysbench oltp_read_write \
  --mysql-host=localhost \
  --mysql-db=sbtest \
  --mysql-user=root \
  --mysql-password=secret \
  --threads=64 \
  --time=60 \
  run
```

## InnoDB Settings for OLTP

```text
[mysqld]
# Buffer pool - allocate 70-80% of RAM
innodb_buffer_pool_size = 24G
innodb_buffer_pool_instances = 8

# Full ACID compliance for OLTP
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1

# Redo log - size for 15-20 min of peak writes
innodb_redo_log_capacity = 4G

# Reduce lock contention
innodb_thread_concurrency = 0
innodb_autoinc_lock_mode = 2
```

`innodb_autoinc_lock_mode = 2` uses interleaved locking for AUTO_INCREMENT, which dramatically reduces lock contention for high-concurrency inserts.

## Connection Management for OLTP

OLTP applications often have connection pooling. Tune `max_connections` and thread cache:

```text
[mysqld]
max_connections = 500
thread_cache_size = 64
wait_timeout = 60
interactive_timeout = 60
```

Check connection usage:

```sql
SELECT
  variable_value AS threads_connected
FROM performance_schema.global_status
WHERE variable_name = 'Threads_connected';

SHOW STATUS LIKE 'Max_used_connections';
```

## Reducing Lock Contention

Check current lock waits:

```sql
SELECT
  r.trx_id waiting_trx,
  r.trx_mysql_thread_id waiting_thread,
  r.trx_query waiting_query,
  b.trx_id blocking_trx,
  b.trx_mysql_thread_id blocking_thread
FROM performance_schema.data_lock_waits w
JOIN information_schema.innodb_trx b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID
JOIN information_schema.innodb_trx r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID;
```

For hot rows receiving many concurrent updates, consider:

```sql
-- Use SELECT ... FOR UPDATE to serialize access explicitly
BEGIN;
SELECT balance FROM accounts WHERE id = 123 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 123;
COMMIT;
```

## Optimizing Primary Key Access

OLTP queries should primarily access rows by primary key to avoid index scans:

```sql
-- Fast: primary key lookup
SELECT * FROM orders WHERE id = 98765;

-- Slower: non-indexed lookup
SELECT * FROM orders WHERE reference_code = 'ORD-98765';
```

Ensure primary keys are clustered and queries use them:

```sql
EXPLAIN SELECT * FROM orders WHERE id = 98765;
-- Should show "type: const" and no filesort
```

## Transaction Size and Commit Frequency

For bulk OLTP operations, commit in smaller batches to reduce lock hold time:

```python
batch_size = 1000
for i in range(0, len(records), batch_size):
    batch = records[i:i + batch_size]
    cursor.executemany(
        "INSERT INTO events (user_id, action, ts) VALUES (%s, %s, %s)",
        batch
    )
    connection.commit()
```

## Summary

MySQL OLTP tuning focuses on full ACID compliance settings, keeping `innodb_flush_log_at_trx_commit = 1` and `sync_binlog = 1` for transaction safety, and reducing lock contention with `innodb_autoinc_lock_mode = 2`. Generous buffer pool sizing keeps hot data in memory, while proper primary key usage ensures transactions execute index lookups rather than full scans. Monitor active lock waits with the `data_lock_waits` view and use connection pooling with `wait_timeout` to release idle connections promptly.
