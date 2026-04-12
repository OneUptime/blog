# How to Implement Application-Level Read-Write Splitting for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Read Replica, Read-Write Splitting, Replication, Performance

Description: Learn how to implement application-level read-write splitting for MySQL to route SELECT queries to replicas and writes to the primary without a proxy layer.

---

## Why Application-Level Read-Write Splitting?

Read-write splitting routes write queries (INSERT, UPDATE, DELETE, DDL) to the MySQL primary and read queries (SELECT) to one or more replicas. This reduces primary load and uses replica capacity effectively.

While proxies like ProxySQL handle this automatically, application-level splitting gives you finer control: you can decide which reads require replica freshness guarantees, which tolerate stale data, and when to force a read to the primary (for example, immediately after a write).

## Setting Up the Connection Manager

Maintain separate connection pools for the primary and all replicas:

```python
import mysql.connector.pooling
import random

class MySQLConnectionManager:
    def __init__(self):
        self.write_pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name="write",
            pool_size=10,
            host="primary.db.internal",
            user="app",
            password="secret",
            database="mydb"
        )
        self.read_pools = [
            mysql.connector.pooling.MySQLConnectionPool(
                pool_name=f"read_{i}",
                pool_size=10,
                host=host,
                user="app",
                password="secret",
                database="mydb"
            )
            for i, host in enumerate([
                "replica1.db.internal",
                "replica2.db.internal"
            ])
        ]

    def get_write_conn(self):
        return self.write_pool.get_connection()

    def get_read_conn(self):
        # Random selection across replicas
        pool = random.choice(self.read_pools)
        return pool.get_connection()

db = MySQLConnectionManager()
```

## Routing Reads and Writes

```python
def get_user(user_id: int):
    conn = db.get_read_conn()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cursor.fetchone()
    finally:
        conn.close()

def update_user_email(user_id: int, email: str):
    conn = db.get_write_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET email = %s WHERE id = %s",
            (email, user_id)
        )
        conn.commit()
    finally:
        conn.close()
```

## Handling Read-After-Write Consistency

After a write, reading from a replica may return stale data. Use a sticky session strategy: route reads to the primary for a short window after a write:

```python
import time
from threading import local

_local = local()

def mark_recent_write():
    _local.last_write_time = time.time()

def get_conn_for_read(require_fresh: bool = False):
    recent_write = getattr(_local, "last_write_time", 0)
    if require_fresh or (time.time() - recent_write) < 2.0:
        return db.get_write_conn()
    return db.get_read_conn()

def update_and_read(user_id: int, email: str):
    # Write to primary
    conn = db.get_write_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET email = %s WHERE id = %s", (email, user_id))
    conn.commit()
    conn.close()
    mark_recent_write()

    # Read from primary for next 2 seconds
    conn = get_conn_for_read(require_fresh=True)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result
```

## Transactions Always Go to the Primary

All statements within a transaction must target the same server:

```python
def transfer_credits(from_id: int, to_id: int, amount: int):
    conn = db.get_write_conn()
    try:
        conn.start_transaction()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET credits = credits - %s WHERE id = %s",
            (amount, from_id)
        )
        cursor.execute(
            "UPDATE users SET credits = credits + %s WHERE id = %s",
            (amount, to_id)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
```

Never split a transaction between primary and replica connections.

## Monitoring Replication Lag

Check replica lag periodically to avoid routing reads to lagging replicas:

```python
def check_replica_lag(conn) -> int:
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SHOW REPLICA STATUS")
    status = cursor.fetchone()
    lag = status.get("Seconds_Behind_Source") if status else None
    return lag if lag is not None else 999
```

Skip replicas with lag above your threshold when selecting a read connection.

## Summary

Application-level read-write splitting routes writes to the MySQL primary and reads to replicas using separate connection pools. Use thread-local state to route reads to the primary briefly after a write, always send transactions to the primary, and monitor `Seconds_Behind_Source` to exclude lagging replicas from the read pool. This approach gives maximum control over routing logic without requiring a proxy.
