# How to Configure MySQL Connector/Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Python, Connector/Python, Connection Pool, Driver

Description: Configure MySQL Connector/Python for production applications with connection pooling, SSL, charset settings, and error handling best practices.

---

## MySQL Connector/Python Overview

MySQL Connector/Python is the official MySQL driver for Python, maintained by Oracle. It provides both a pure Python implementation and a C extension (`mysql-connector-python`) for better performance. For production use, proper connection pooling, SSL, and charset configuration are essential.

## Installation

```bash
# Official MySQL connector (recommended)
pip install mysql-connector-python

# Alternative: mysqlclient (C extension, faster)
pip install mysqlclient

# Alternative: PyMySQL (pure Python)
pip install PyMySQL
```

## Basic Connection

```python
import mysql.connector

conn = mysql.connector.connect(
    host='db.example.com',
    port=3306,
    database='myapp',
    user='app_user',
    password='app_password',
    charset='utf8mb4',
    collation='utf8mb4_unicode_ci',
    use_unicode=True,
    time_zone='+00:00',
    connection_timeout=10,
    autocommit=False,
)
```

## Connection Pool Configuration

For production applications, use a connection pool:

```python
import mysql.connector.pooling

# Create a connection pool
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name='myapp_pool',
    pool_size=20,
    pool_reset_session=True,

    host='db.example.com',
    port=3306,
    database='myapp',
    user='app_user',
    password='app_password',
    charset='utf8mb4',
    collation='utf8mb4_unicode_ci',
    use_unicode=True,
    time_zone='+00:00',
    connection_timeout=10,
    autocommit=False,
)

# Usage
def get_orders(user_id: int):
    conn = pool.get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            'SELECT id, total, status FROM orders WHERE user_id = %s',
            (user_id,)
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()  # Returns connection to pool
```

## SSL Configuration

```python
conn = mysql.connector.connect(
    host='db.example.com',
    database='myapp',
    user='app_user',
    password='app_password',
    ssl_ca='/etc/ssl/mysql/ca.pem',
    ssl_cert='/etc/ssl/mysql/client-cert.pem',
    ssl_key='/etc/ssl/mysql/client-key.pem',
    ssl_verify_cert=True,
    ssl_verify_identity=True,
)
```

## Using SQLAlchemy with mysql-connector-python

For larger applications, SQLAlchemy provides a higher-level interface with better pooling:

```python
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool
import os

engine = create_engine(
    f"mysql+mysqlconnector://{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}"
    f"@{os.environ['DB_HOST']}:3306/{os.environ['DB_NAME']}",
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,      # Recycle connections every 30 minutes
    pool_pre_ping=True,     # Verify connection is alive before using
    connect_args={
        'charset': 'utf8mb4',
        'time_zone': '+00:00',
        'connection_timeout': 10,
    }
)

# Context manager usage
def get_users():
    with engine.connect() as conn:
        result = conn.execute(text('SELECT id, email FROM users LIMIT 10'))
        return [row._asdict() for row in result]
```

## Error Handling

```python
import mysql.connector
from mysql.connector import errorcode

def execute_query(pool, query, params):
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params)
        result = cursor.fetchall()
        conn.commit()
        return result
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            raise ValueError("Invalid MySQL credentials")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            raise ValueError("Database does not exist")
        elif err.errno == 1213:  # Deadlock
            if conn:
                conn.rollback()
            raise  # Let caller retry
        else:
            if conn:
                conn.rollback()
            raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
```

## Summary

Configuring MySQL Connector/Python for production requires using `pool_size` with `MySQLConnectionPool` or SQLAlchemy's `QueuePool`, setting `charset='utf8mb4'` to handle full Unicode, enabling SSL with certificate verification for secure connections, and setting `pool_pre_ping=True` (SQLAlchemy) to automatically recover from stale connections. Always use `%s` placeholders for parameterized queries to prevent SQL injection.
