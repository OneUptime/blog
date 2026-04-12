# How to Tune MySQL for High Concurrency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Tuning, Concurrency, InnoDB, Database

Description: Learn the key MySQL configuration settings and design patterns to handle high concurrency workloads - hundreds or thousands of simultaneous queries.

---

## High Concurrency Challenges in MySQL

When hundreds of threads execute simultaneously, MySQL faces contention at multiple layers: the InnoDB buffer pool mutex, row-level locks, the MVCC undo log, and the thread scheduler. Understanding and addressing each bottleneck is key to sustaining high throughput under load.

## Use Connection Pooling to Reduce Thread Overhead

The first step is ensuring MySQL never has too many active OS threads. Each OS thread carries stack memory and scheduling overhead. Use ProxySQL or MySQL Router as a connection pool:

```bash
# Install ProxySQL
apt-get install proxysql

# Configure ProxySQL to pool connections
mysql -u admin -padmin -h 127.0.0.1 -P6032 <<EOF
INSERT INTO mysql_servers (hostgroup_id, hostname, port) VALUES (1, '127.0.0.1', 3306);
INSERT INTO mysql_users (username, password, default_hostgroup) VALUES ('appuser', 'password', 1);
LOAD MYSQL SERVERS TO RUNTIME;
LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
SAVE MYSQL USERS TO DISK;
EOF
```

## Tune Thread Handling

```text
[mysqld]
# Thread pool plugin (MySQL Enterprise or Percona Server)
thread_handling = pool-of-threads
thread_pool_size = 32              # Number of CPU cores

# For community MySQL, limit active InnoDB threads
innodb_thread_concurrency = 0      # Let InnoDB auto-tune (recommended)
```

## Multiple InnoDB Buffer Pool Instances

Reduce mutex contention in the buffer pool:

```text
[mysqld]
innodb_buffer_pool_size = 16G
innodb_buffer_pool_instances = 16   # 1 per GB, reduces latch contention
```

## Increase innodb_read_io_threads and innodb_write_io_threads

```text
[mysqld]
innodb_read_io_threads = 8
innodb_write_io_threads = 8
```

These control the number of background I/O threads for read-ahead and page flushing. Increasing to 8 helps on systems with many concurrent queries hitting disk.

## Reduce Lock Contention

Long-running transactions hold row locks, blocking other sessions. Use these settings:

```text
[mysqld]
innodb_lock_wait_timeout = 10       # Fail fast instead of waiting 50s
innodb_deadlock_detect = ON         # Auto-detect and rollback deadlocks
transaction_isolation = READ-COMMITTED  # Reduces gap lock contention for OLTP
```

Check for blocking:

```sql
SELECT
  r.trx_id waiting_trx_id,
  r.trx_mysql_thread_id waiting_thread,
  r.trx_query waiting_query,
  b.trx_id blocking_trx_id,
  b.trx_mysql_thread_id blocking_thread,
  b.trx_query blocking_query
FROM performance_schema.data_lock_waits w
  JOIN information_schema.innodb_trx b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID
  JOIN information_schema.innodb_trx r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID;
```

## Optimize for Short Transactions

Long transactions are the primary cause of concurrency problems. Break large batch operations into smaller chunks:

```sql
-- Instead of one huge DELETE:
DELETE FROM events WHERE created_at < '2025-01-01';

-- Use batched deletes:
DELIMITER $$
CREATE PROCEDURE batch_delete()
BEGIN
  REPEAT
    DELETE FROM events
    WHERE created_at < '2025-01-01'
    LIMIT 1000;
    DO SLEEP(0.01);
  UNTIL ROW_COUNT() = 0 END REPEAT;
END$$
DELIMITER ;

CALL batch_delete();
```

## Use READ COMMITTED Isolation Level

The default `REPEATABLE READ` uses gap locks that can cause deadlocks in insert-heavy workloads. Switch to `READ COMMITTED` for OLTP:

```sql
SET GLOBAL transaction_isolation = 'READ-COMMITTED';
```

This requires binary log format to be ROW:

```text
[mysqld]
binlog_format = ROW
transaction_isolation = READ-COMMITTED
```

## Use Prepared Statements

Prepared statements reduce parse and planning overhead for repeated queries:

```python
import mysql.connector

conn = mysql.connector.connect(host='localhost', user='root', password='password', database='app')
cursor = conn.cursor(prepared=True)

stmt = "INSERT INTO events (user_id, event_type) VALUES (%s, %s)"
data = [(1, 'login'), (2, 'purchase'), (3, 'logout')]
cursor.executemany(stmt, data)
conn.commit()
```

## Monitor Concurrency Metrics

```sql
-- Check current threads and states
SELECT state, count(*) as cnt
FROM information_schema.processlist
GROUP BY state
ORDER BY cnt DESC;

-- InnoDB concurrency stats
SHOW STATUS LIKE 'Innodb_row_lock%';
```

## Summary

High concurrency in MySQL requires connection pooling to reduce OS thread overhead, multiple buffer pool instances to reduce latch contention, short transactions to minimize lock hold times, and `READ COMMITTED` isolation to reduce gap lock conflicts. These changes together allow MySQL to scale to thousands of concurrent users efficiently.
