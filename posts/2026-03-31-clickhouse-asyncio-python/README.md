# How to Use AsyncIO with ClickHouse in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Asyncio, Python, Async, Performance

Description: Learn how to use Python's asyncio with ClickHouse for concurrent queries, async inserts, and building high-throughput non-blocking data pipelines.

---

## Why Async ClickHouse Queries?

When building web APIs or data pipelines that run multiple ClickHouse queries, synchronous code blocks the event loop. Async ClickHouse queries allow your application to execute dozens of queries concurrently without spawning threads, reducing latency for fan-out query patterns.

## Installing the Async Driver

```bash
pip install asynch  # pure async ClickHouse client
# or
pip install clickhouse-connect  # also supports async context
```

The `asynch` library implements the native ClickHouse protocol with full asyncio support.

## Basic Async Query

```python
import asyncio
from asynch import Connection

async def get_event_count():
    async with Connection(
        host="localhost", port=9000,
        user="default", password=""
    ) as conn:
        async with conn.cursor() as cursor:
            await cursor.execute("SELECT count() FROM events")
            result = await cursor.fetchone()
            return result[0]

count = asyncio.run(get_event_count())
print(f"Event count: {count}")
```

## Running Multiple Queries Concurrently

This is where async shines - run independent queries in parallel. A single ClickHouse connection uses one TCP socket and can only handle one query at a time, so we use a `Pool` and acquire a separate connection per task:

```python
import asyncio
from asynch import Pool

async def query_one(pool, sql):
    async with pool.connection() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(sql)
            return await cursor.fetchall()

async def run_dashboard_queries():
    async with Pool(minsize=1, maxsize=3, host="localhost") as pool:
        results = await asyncio.gather(
            query_one(pool, "SELECT count() FROM events WHERE event_date = today()"),
            query_one(pool, "SELECT count(DISTINCT user_id) FROM events WHERE event_date = today()"),
            query_one(pool, "SELECT event_type, count() FROM events GROUP BY event_type LIMIT 5"),
        )
    return results

dau, unique_users, top_events = asyncio.run(run_dashboard_queries())
```

## Async Inserts with Connection Pooling

For high-throughput async inserts, maintain a pool of connections:

```python
import asyncio
from asynch import Connection
from asyncio import Queue

async def insert_worker(queue: Queue, host: str):
    async with Connection(host=host) as conn:
        while True:
            batch = await queue.get()
            if batch is None:
                break
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "INSERT INTO events (user_id, event_type) VALUES",
                    batch
                )
            queue.task_done()

async def producer(queue: Queue, num_workers: int):
    for i in range(100):
        batch = [(j, "click") for j in range(1000)]
        await queue.put(batch)
    for _ in range(num_workers):
        await queue.put(None)  # signal each worker to stop

async def main():
    num_workers = 4
    queue = Queue(maxsize=10)
    workers = [insert_worker(queue, "localhost") for _ in range(num_workers)]
    await asyncio.gather(producer(queue, num_workers), *workers)

asyncio.run(main())
```

## Using asyncio.Semaphore to Limit Concurrency

Prevent overwhelming ClickHouse with too many concurrent connections:

```python
import asyncio
from asynch import Connection

sem = asyncio.Semaphore(10)

async def limited_query(sql):
    async with sem:
        async with Connection(host="localhost") as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(sql)
                return await cursor.fetchall()
```

## Summary

Python's asyncio combined with the `asynch` ClickHouse driver enables concurrent queries without thread overhead. Fan-out dashboard queries run in parallel with `asyncio.gather`, and semaphores prevent connection saturation. Async inserts with bounded queues provide backpressure for high-throughput ingestion pipelines.
