# How to Implement Connection Pooling for MySQL in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection Pool, Python, Performance, mysql-connector

Description: Learn how to implement MySQL connection pooling in Python using mysql-connector-python and SQLAlchemy to handle concurrent database access efficiently.

---

## Introduction

Opening a new MySQL connection for every database operation is expensive - each connection involves network round trips, authentication, and session setup. Connection pooling reuses a set of pre-established connections, dramatically reducing overhead in high-throughput Python applications.

## Option 1: mysql-connector-python Built-in Pool

The `mysql-connector-python` package includes a built-in connection pool:

```python
import mysql.connector
from mysql.connector import pooling

# Create a connection pool
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=10,
    pool_reset_session=True,
    host="localhost",
    port=3306,
    user="root",
    password="password",
    database="mydb",
    charset="utf8mb4",
)

def fetch_products(max_price: float) -> list:
    conn = pool.get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, name, price FROM products WHERE price <= %s AND stock > 0",
            (max_price,)
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()  # returns connection to pool
```

## Option 2: SQLAlchemy Connection Pool

SQLAlchemy's engine manages pooling automatically and integrates with all major Python ORMs:

```python
from sqlalchemy import create_engine, text

engine = create_engine(
    "mysql+mysqlconnector://root:password@localhost/mydb",
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,  # recycle connections after 30 minutes
    pool_pre_ping=True,  # verify connections before use
    echo=False,
)

def fetch_products(max_price: float) -> list:
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, name, price FROM products WHERE price <= :max AND stock > 0"),
            {"max": max_price}
        )
        return [dict(row._mapping) for row in result]
```

`pool_pre_ping=True` automatically reconnects on stale connections, preventing `MySQL has gone away` errors.

## Option 3: PyMySQL with Connection Pool

```python
from dbutils.pooled_db import PooledDB
import pymysql

pool = PooledDB(
    creator=pymysql,
    maxconnections=10,
    mincached=2,
    maxcached=5,
    blocking=True,
    host="localhost",
    user="root",
    password="password",
    database="mydb",
    charset="utf8mb4",
    autocommit=False,
)

def insert_order(customer_id: int, total: float) -> int:
    conn = pool.connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO orders (customer_id, total) VALUES (%s, %s)",
            (customer_id, total)
        )
        conn.commit()
        return cursor.lastrowid
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
```

## Checking Pool Status

With SQLAlchemy, inspect pool statistics:

```python
status = engine.pool.status()
print(status)
# Pool size: 10  Connections in pool: 4  Current overflow: 0  Current checked out: 2
```

## Configuring Pool Size

A common formula for pool size is:

```text
pool_size = (number_of_cores * 2) + effective_disk_spindles
```

For a 4-core machine with SSD storage:

```python
engine = create_engine(
    "mysql+mysqlconnector://root:password@localhost/mydb",
    pool_size=9,
    max_overflow=10,
)
```

## Summary

For Python applications, SQLAlchemy's `create_engine` with `pool_pre_ping=True` and `pool_recycle` is the recommended approach - it handles stale connections automatically and integrates with FastAPI, Flask-SQLAlchemy, and standalone SQLAlchemy usage. Use `mysql-connector-python`'s built-in pool for simpler scripts that don't need SQLAlchemy. Always size pools based on your CPU core count and measure actual utilization under load.
