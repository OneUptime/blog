# How to Handle Connection Pool Exhaustion in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection Pool, Exhaustion, Troubleshooting, Performance

Description: Learn how to detect, diagnose, and resolve MySQL connection pool exhaustion - the condition where all pooled connections are in use and new requests are queued or rejected.

---

## Introduction

Connection pool exhaustion occurs when all connections in the pool are in use and new requests must either wait in a queue or fail immediately. This manifests as `connection timeout` errors, hanging requests, or cascading failures across your application. Understanding the root cause is essential to fixing it correctly.

## Symptoms of Pool Exhaustion

Common error messages indicating pool exhaustion:

```text
HikariCP - Connection is not available, request timed out after 30000ms
mysql2: Error: No connections available in pool
SQLAlchemy: QueuePool limit of size 5 overflow 10 reached, connection timed out
database/sql: context deadline exceeded
```

## Diagnosing on the MySQL Server

Check active connections and what they are doing:

```sql
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Threads_running';
SHOW PROCESSLIST;

-- See long-running queries
SELECT id, user, host, db, command, time, state, info
FROM information_schema.processlist
WHERE time > 5
ORDER BY time DESC;
```

## Identifying Leaked Connections

A connection leak (forgetting to close/release a connection) is the most common cause. In HikariCP, enable leak detection:

```java
config.setLeakDetectionThreshold(5000); // warn if connection held > 5s
```

You will see log entries like:

```text
WARN  HikariPool-1 - Connection leak detection triggered for conn123
```

In SQLAlchemy, use `pool_pre_ping=True` and enable logging:

```python
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.pool').setLevel(logging.DEBUG)
```

## Fixing Connection Leaks in Code

Always use try-with-resources or context managers to guarantee connection release:

```java
// Java - use try-with-resources
try (Connection conn = dataSource.getConnection();
     PreparedStatement ps = conn.prepareStatement("SELECT 1")) {
    // conn is automatically closed/returned to pool
}
```

```python
# Python - use context manager
with engine.connect() as conn:
    result = conn.execute(text("SELECT 1"))
# connection returned to pool automatically
```

```javascript
// Node.js - always release
const conn = await pool.getConnection();
try {
  const [rows] = await conn.query('SELECT 1');
  return rows;
} finally {
  conn.release();  // critical - never skip this
}
```

## Identifying Long-Running Transactions

Transactions holding connections without committing exhaust the pool:

```sql
SELECT trx_id, trx_started, trx_state, trx_mysql_thread_id,
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS duration_seconds
FROM information_schema.innodb_trx
ORDER BY trx_started;
```

Kill long-running transactions that are blocking:

```sql
KILL CONNECTION <thread_id>;
```

## Increasing Pool Size as a Short-Term Fix

If legitimate load is causing exhaustion, increase the pool size:

```java
config.setMaximumPoolSize(30);  // increase from 10
config.setConnectionTimeout(60_000);  // give more time to acquire
```

But also check MySQL's server limit first:

```sql
SHOW VARIABLES LIKE 'max_connections';
SET GLOBAL max_connections = 500;
```

## Implementing Connection Timeout and Retry

For resilient applications, implement retry logic:

```python
import time
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

def execute_with_retry(engine, query, retries=3, delay=1.0):
    for attempt in range(retries):
        try:
            with engine.connect() as conn:
                return conn.execute(text(query)).fetchall()
        except OperationalError as e:
            if attempt < retries - 1:
                time.sleep(delay * (2 ** attempt))
            else:
                raise
```

## Summary

Connection pool exhaustion is caused by connection leaks, long-running transactions, or insufficient pool size relative to load. Start by identifying leaked connections using leak detection settings, then review long-running transactions with `information_schema.innodb_trx`. Use try-with-resources or context managers to guarantee connection release, and only increase pool size after confirming the load is legitimate.
