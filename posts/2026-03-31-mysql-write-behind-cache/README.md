# How to Implement Write-Behind Cache with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Cache, Pattern

Description: Learn how to implement the write-behind (write-back) cache pattern with MySQL to improve write performance by batching deferred database writes through Redis.

---

The write-behind cache pattern, also called write-back, writes data to the cache immediately and persists to MySQL asynchronously in the background. This dramatically improves write throughput because the application does not wait for the database write to complete. A background worker drains the cache and writes to MySQL in batches.

## How Write-Behind Works

1. Application writes to Redis (fast).
2. Application returns success to the caller immediately.
3. A background worker reads the pending writes from Redis.
4. Worker persists them to MySQL in batches.
5. Worker confirms persistence and removes the pending entries.

The trade-off is durability: data written to Redis but not yet persisted to MySQL is lost if Redis crashes before the flush.

## Schema: Pending Write Queue

Use a Redis sorted set where the score is the write timestamp:

```python
import redis
import mysql.connector
import json
import time

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
db = mysql.connector.connect(host='localhost', database='myapp', user='app', password='secret')

def write_behind_update_product(product_id, name, price, stock):
    product = {'id': product_id, 'name': name, 'price': str(price), 'stock': stock}

    # Write to cache immediately
    r.hset('products', product_id, json.dumps(product))

    # Queue for async persistence
    r.zadd('pending_product_writes', {product_id: time.time()})

    return product
```

## Background Flush Worker

The worker runs continuously, flushing batches to MySQL:

```python
def flush_pending_writes(batch_size=50, max_age_seconds=5):
    cutoff = time.time() - max_age_seconds

    # Get writes that have been pending at least max_age_seconds
    pending = r.zrangebyscore('pending_product_writes', '-inf', cutoff, start=0, num=batch_size)

    if not pending:
        return

    cursor = db.cursor()

    for product_id in pending:
        cached = r.hget('products', product_id)
        if not cached:
            continue

        product = json.loads(cached)
        cursor.execute(
            'INSERT INTO products (id, name, price, stock) VALUES (%s, %s, %s, %s) AS new '
            'ON DUPLICATE KEY UPDATE name=new.name, price=new.price, stock=new.stock',
            (product['id'], product['name'], product['price'], product['stock'])
        )

    db.commit()

    # Remove from pending queue after successful commit
    r.zrem('pending_product_writes', *pending)
    print(f"Flushed {len(pending)} writes to MySQL")


import threading

def start_flush_worker():
    def run():
        while True:
            try:
                flush_pending_writes()
            except Exception as e:
                print(f"Flush error: {e}")
            time.sleep(1)

    t = threading.Thread(target=run, daemon=True)
    t.start()
```

## Read Path

Reads always come from the cache, which is always up to date:

```python
def get_product(product_id):
    cached = r.hget('products', product_id)
    if cached:
        return json.loads(cached)

    # Cold cache: load from MySQL and populate
    cursor = db.cursor(dictionary=True)
    cursor.execute('SELECT * FROM products WHERE id = %s', (product_id,))
    product = cursor.fetchone()
    if product:
        r.hset('products', product_id, json.dumps(product, default=str))
    return product
```

## Handling Redis Failure

Enable Redis persistence (AOF or RDB) to reduce durability risk:

```bash
# In redis.conf
appendonly yes
appendfsync everysec
```

With AOF, at most one second of writes can be lost if Redis crashes.

## When to Use Write-Behind

Write-behind is appropriate for:
- High-frequency write workloads like counters, view counts, or real-time metrics
- Scenarios where some data loss is acceptable (analytics, non-critical updates)
- Reducing MySQL write IOPS during traffic spikes

Avoid it for financial transactions, order processing, or any write where durability is critical.

## Summary

The write-behind cache pattern improves write performance by accepting writes into Redis immediately and flushing them to MySQL asynchronously via a background worker. This reduces MySQL write latency significantly but introduces a small window of potential data loss. Enable Redis persistence (AOF) to minimize exposure.
