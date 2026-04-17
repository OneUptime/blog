# How to Build a ClickHouse Connection Pool in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Connection Pool, Python, Performance, Architecture

Description: Build a thread-safe ClickHouse connection pool in Python to handle concurrent requests efficiently, with health checks and automatic reconnection.

---

## Why Pool ClickHouse Connections?

Creating a new ClickHouse TCP connection for every query is expensive - it involves TCP handshake, authentication, and settings negotiation. In a web application serving hundreds of requests per second, connection overhead becomes a bottleneck. A connection pool reuses connections across requests.

## Using clickhouse-connect's Built-in Pooling

The `clickhouse-connect` library uses HTTP and handles connection pooling via `urllib3` internally. For most use cases, a single client instance is sufficient:

```python
import clickhouse_connect
from clickhouse_connect.driver import httputil

# Configure the urllib3 pool (default maxsize is 8)
pool_mgr = httputil.get_pool_manager(maxsize=16, num_pools=12)

# One client per application instance - thread-safe
client = clickhouse_connect.get_client(
    host="localhost",
    port=8123,
    username="default",
    password="",
    pool_mgr=pool_mgr,
)
```

## Building a Custom Pool for Native Protocol

For the native TCP protocol (port 9000), build a pool with `queue.Queue`:

```python
import queue
import threading
import clickhouse_driver

class ClickHousePool:
    def __init__(self, host, port=9000, user="default", password="", pool_size=10):
        self._pool = queue.Queue(maxsize=pool_size)
        self._host = host
        self._port = port
        self._user = user
        self._password = password
        self._lock = threading.Lock()

        for _ in range(pool_size):
            self._pool.put(self._create_connection())

    def _create_connection(self):
        return clickhouse_driver.Client(
            host=self._host,
            port=self._port,
            user=self._user,
            password=self._password,
            connect_timeout=10,
            send_receive_timeout=300
        )

    def acquire(self, timeout=30):
        return self._pool.get(timeout=timeout)

    def release(self, conn):
        self._pool.put(conn)

    class _PooledConnection:
        def __init__(self, pool):
            self._pool = pool
            self._conn = None

        def __enter__(self):
            self._conn = self._pool.acquire()
            return self._conn

        def __exit__(self, exc_type, exc_val, exc_tb):
            self._pool.release(self._conn)

    def connection(self):
        return self._PooledConnection(self)
```

## Using the Pool

```python
pool = ClickHousePool(host="localhost", pool_size=10)

def get_user_count():
    with pool.connection() as conn:
        result = conn.execute("SELECT count(DISTINCT user_id) FROM events")
        return result[0][0]

# Thread-safe concurrent use
import concurrent.futures
with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    futures = [executor.submit(get_user_count) for _ in range(100)]
    results = [f.result() for f in futures]
```

## Health Check and Reconnect

Add a health check to detect dead connections before returning them:

```python
def _acquire_healthy(self):
    while True:
        conn = self._pool.get(timeout=30)
        try:
            conn.execute("SELECT 1")
            return conn
        except Exception:
            # Replace dead connection
            conn = self._create_connection()
            return conn
```

## Summary

ClickHouse connection pooling with `clickhouse-connect` works out of the box via `urllib3`. For the native TCP protocol, a `Queue`-based pool with context manager support provides thread-safe connection reuse, health checks, and automatic reconnection. A pool of 10-20 connections handles hundreds of concurrent application threads efficiently.
