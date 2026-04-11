# How to Use Redis Pipelining in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Pipelining, Performance, redis-py

Description: Learn how to use Redis pipelining in Python with redis-py to batch multiple commands and dramatically improve throughput by reducing network round trips.

---

## What Is Redis Pipelining?

Without pipelining, each Redis command requires a full network round trip: the client sends a command, waits for the response, then sends the next command. With pipelining, multiple commands are buffered and sent in a single network call, with all responses returned together.

Benefits of pipelining:
- Significantly reduces network latency overhead
- Increases throughput for bulk operations
- Particularly effective in high-latency networks

## Basic Pipelining with redis-py

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Create a pipeline
pipe = r.pipeline()

# Queue commands (no network call yet)
pipe.set('key1', 'value1')
pipe.set('key2', 'value2')
pipe.set('key3', 'value3')
pipe.get('key1')
pipe.get('key2')

# Execute all commands at once
results = pipe.execute()
print(results)
# [True, True, True, 'value1', 'value2']
```

## Using the Context Manager

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

with r.pipeline() as pipe:
    pipe.set('user:1:name', 'Alice')
    pipe.set('user:1:email', 'alice@example.com')
    pipe.incr('user:count')
    results = pipe.execute()

print(results)  # [True, True, 1]
```

## Performance Comparison

Without pipelining:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

start = time.time()
for i in range(1000):
    r.set(f'key:{i}', f'value:{i}')
elapsed = time.time() - start
print(f"Without pipeline: {elapsed:.3f}s")
```

With pipelining:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

start = time.time()
with r.pipeline() as pipe:
    for i in range(1000):
        pipe.set(f'key:{i}', f'value:{i}')
    pipe.execute()
elapsed = time.time() - start
print(f"With pipeline: {elapsed:.3f}s")
# Typically 10-50x faster depending on network latency
```

## Pipelining with Mixed Command Types

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

with r.pipeline() as pipe:
    # String ops
    pipe.set('product:1:name', 'Widget')
    pipe.set('product:1:price', '9.99')

    # Hash ops
    pipe.hset('user:100', mapping={'name': 'Bob', 'role': 'admin'})

    # List ops
    pipe.rpush('events', 'login', 'view_page', 'add_to_cart')

    # Counter
    pipe.incr('page:views')

    # TTL
    pipe.expire('session:abc123', 3600)

    results = pipe.execute()

print(results)
# [True, True, 2, 3, 1, True]
```

## Chunking Large Pipelines

For very large datasets, process in chunks to avoid memory buildup:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def bulk_set(data: dict, chunk_size: int = 500):
    items = list(data.items())
    total_set = 0

    for i in range(0, len(items), chunk_size):
        chunk = items[i:i + chunk_size]
        with r.pipeline() as pipe:
            for key, value in chunk:
                pipe.set(key, value)
            pipe.execute()
        total_set += len(chunk)
        print(f"Processed {total_set}/{len(items)}")

# Usage
data = {f'item:{i}': f'data_{i}' for i in range(10000)}
bulk_set(data)
```

## Reading Data in Bulk with Pipelines

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

keys = [f'key:{i}' for i in range(100)]

with r.pipeline() as pipe:
    for key in keys:
        pipe.get(key)
    values = pipe.execute()

# Zip keys with values
result = dict(zip(keys, values))
print(result)
```

## Important Notes

Pipelines in redis-py default to `transaction=True`, which wraps commands in a `MULTI/EXEC` block for atomicity. If you only need pipelining without atomicity, use `pipeline(transaction=False)`:

```python
# Non-transactional pipeline (pure pipelining, no MULTI/EXEC)
with r.pipeline(transaction=False) as pipe:
    pipe.set('key1', 'value1')
    pipe.set('key2', 'value2')
    results = pipe.execute()

# Transactional pipeline (default behavior)
with r.pipeline() as pipe:
    pipe.incr('counter')
    pipe.incr('counter')
    results = pipe.execute()
```

## Summary

Redis pipelining in Python with redis-py batches multiple commands into a single network request, dramatically reducing latency for bulk operations. Use the context manager pattern with `r.pipeline()`, process large datasets in chunks to manage memory, and note that redis-py pipelines default to `transaction=True` with MULTI/EXEC semantics - use `pipeline(transaction=False)` when you only need pipelining without atomicity. Pipelining is one of the simplest and most impactful performance optimizations for Redis-heavy applications.
