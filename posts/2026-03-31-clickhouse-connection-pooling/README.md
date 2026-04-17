# How to Use Connection Pooling with ClickHouse Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Connection Pool, Python, Performance, Client

Description: Learn how to configure connection pooling with ClickHouse clients to improve throughput, reduce latency, and handle concurrent query workloads efficiently.

---

## Why Connection Pooling Matters

Opening a new TCP or HTTP connection for every query adds overhead. Connection pooling reuses established connections, reducing latency and improving throughput for high-concurrency applications.

## HTTP Client Pooling with clickhouse-connect

The `clickhouse-connect` client manages an internal HTTP connection pool via `urllib3`. By default, all client instances share a single pool manager that keeps up to 8 HTTP keep-alive connections per ClickHouse server.

To control how long HTTP connections are reused before being recycled, set the `max_connection_age` common setting (defaults to 600 seconds):

```python
import clickhouse_connect
from clickhouse_connect import common

common.set_setting("max_connection_age", 600)

client = clickhouse_connect.get_client(
    host="localhost",
    port=8123,
    username="default",
    password="",
)
```

## Custom urllib3 Pool Manager

Use `clickhouse_connect.driver.httputil.get_pool_manager` to create a custom pool with a larger size, then pass it via the `pool_mgr` argument:

```python
import clickhouse_connect
from clickhouse_connect.driver import httputil

pool = httputil.get_pool_manager(maxsize=20, num_pools=5)

client = clickhouse_connect.get_client(
    host="localhost",
    pool_mgr=pool
)
```

## SQLAlchemy Connection Pool

When using `clickhouse-sqlalchemy`, configure the pool via engine parameters:

```python
from sqlalchemy import create_engine

engine = create_engine(
    "clickhouse+http://default:@localhost:8123/default",
    pool_size=10,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=600,
    pool_pre_ping=True
)
```

- `pool_size` - number of persistent connections
- `max_overflow` - extra connections allowed above `pool_size`
- `pool_recycle` - recycle connections older than N seconds
- `pool_pre_ping` - test connection health before using

## Thread-Safe Client Sharing

The `clickhouse-connect` client is thread-safe and can be shared across threads:

```python
import threading
import clickhouse_connect

client = clickhouse_connect.get_client(host="localhost")

def query_worker(thread_id):
    df = client.query_df(f"SELECT count() FROM events WHERE user_id = '{thread_id}'")
    print(thread_id, df.iloc[0, 0])

threads = [threading.Thread(target=query_worker, args=(i,)) for i in range(20)]
for t in threads:
    t.start()
for t in threads:
    t.join()
```

## Async Pooling with asyncio

```python
import asyncio
import clickhouse_connect

async def run_query(client, query):
    return client.query_df(query)

async def main():
    client = clickhouse_connect.get_client(host="localhost")
    tasks = [
        asyncio.to_thread(client.query_df, "SELECT count() FROM events"),
        asyncio.to_thread(client.query_df, "SELECT count() FROM users"),
    ]
    results = await asyncio.gather(*tasks)
    for r in results:
        print(r)

asyncio.run(main())
```

## Monitor Pool Usage

Check active connections from ClickHouse's system tables:

```sql
SELECT
    interface,
    count() AS connections
FROM system.processes
GROUP BY interface
```

## Summary

Connection pooling with ClickHouse reduces overhead for high-concurrency workloads. Use `clickhouse-connect`'s built-in pool manager for HTTP clients, SQLAlchemy's pool parameters for ORM workloads, and share a single client instance safely across threads for maximum efficiency.
