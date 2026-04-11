# How to Implement Write-Through Cache with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Cache, Pattern

Description: Learn how to implement the write-through cache pattern with MySQL and Redis to keep cache and database in sync by writing to both on every update.

---

The write-through cache pattern writes data to both the cache and the database synchronously on every write operation. Unlike cache-aside where the cache is lazily populated on reads, write-through ensures the cache always reflects the current database state, eliminating the risk of stale reads immediately after a write.

## How Write-Through Works

1. Application receives a write request.
2. Application writes to MySQL.
3. Application writes to the cache.
4. Both writes succeed before the operation is acknowledged.
5. Subsequent reads are served from cache.

The key property is that the cache is always up to date after a write - no invalidation or expiration logic is needed for recently written data.

## Basic Implementation

```python
import redis
import mysql.connector
import json

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
db = mysql.connector.connect(host='localhost', database='myapp', user='app', password='secret')

def update_product(product_id, name, price, stock):
    # Prepare the product data
    product = {
        'id': product_id,
        'name': name,
        'price': str(price),
        'stock': stock
    }

    # Write to MySQL first
    cursor = db.cursor()
    cursor.execute(
        'UPDATE products SET name=%s, price=%s, stock=%s WHERE id=%s',
        (name, price, stock, product_id)
    )
    db.commit()

    # Write to cache (keep in sync)
    r.setex(f'product:{product_id}', 1800, json.dumps(product))

    return product


def create_product(name, price, stock, category_id):
    cursor = db.cursor()
    cursor.execute(
        'INSERT INTO products (name, price, stock, category_id) VALUES (%s, %s, %s, %s)',
        (name, price, stock, category_id)
    )
    db.commit()
    product_id = cursor.lastrowid

    product = {
        'id': product_id,
        'name': name,
        'price': str(price),
        'stock': stock,
        'category_id': category_id
    }

    # Pre-populate cache for new record
    r.setex(f'product:{product_id}', 1800, json.dumps(product))

    return product
```

## Read Path with Write-Through

Reads still use the cache, falling back to MySQL for records not yet cached:

```python
def get_product(product_id):
    key = f'product:{product_id}'

    cached = r.get(key)
    if cached:
        return json.loads(cached)

    # Cache miss: fetch and populate
    cursor = db.cursor(dictionary=True)
    cursor.execute('SELECT * FROM products WHERE id = %s', (product_id,))
    product = cursor.fetchone()

    if product:
        r.setex(key, 1800, json.dumps(product, default=str))

    return product
```

## Using a Redis Pipeline for Atomicity

Write to Redis and MySQL within a consistent sequence using a Redis pipeline:

```python
def bulk_update_prices(updates):
    pipe = r.pipeline()
    cursor = db.cursor()

    for product_id, new_price in updates:
        cursor.execute(
            'UPDATE products SET price=%s WHERE id=%s',
            (new_price, product_id)
        )
        pipe.setex(f'product:{product_id}:price', 1800, str(new_price))

    db.commit()
    pipe.execute()
```

Note that Redis pipelines are not atomic transactions. If MySQL commits but Redis fails, the cache may become stale. For strong consistency requirements, consider a compensating cleanup job.

## Write-Through vs Cache-Aside

```text
Write-Through:
  - Cache always up to date after writes
  - Higher write latency (two writes per operation)
  - Better for read-heavy data that is written frequently

Cache-Aside:
  - Lower write latency (one database write)
  - Cache may serve stale data until TTL expires or invalidation occurs
  - Better for data written rarely but read often
```

## When to Use Write-Through

Write-through is best for hot data that is both read and written frequently, such as user sessions, inventory counts, and configuration settings where stale reads are unacceptable.

## Summary

The write-through cache pattern with MySQL writes to both Redis and the database on every mutation, keeping the cache permanently synchronized. This eliminates stale reads after writes at the cost of higher write latency. It is most effective for read-heavy entities that are also updated regularly.
