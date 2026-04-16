# How to Use intHash32() and intHash64() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, Integer Hash, Sampling, Bucketing

Description: Learn how to use intHash32() and intHash64() in ClickHouse for fast integer hashing, bucketing integer IDs, and deterministic user sampling.

---

`intHash32()` and `intHash64()` are ClickHouse hash functions specifically designed for integer inputs. They use a mixing algorithm optimized for hash table operations. `intHash32(n)` accepts any integer type and returns a UInt32. `intHash64(n)` accepts any integer type and returns a UInt64. Because they operate on integers natively (without string conversion), they are faster than string-based hash functions when hashing integer columns.

## Basic Usage

```sql
-- Hash an integer to get a UInt32
SELECT intHash32(12345678) AS int_hash32;

-- Hash an integer to get a UInt64
SELECT intHash64(12345678) AS int_hash64;

-- Hash a user_id column
SELECT
    user_id,
    intHash32(user_id) AS hash32,
    intHash64(user_id) AS hash64
FROM users
LIMIT 10;
```

## Sampling by user_id

`intHash32` is the most common way to sample users by their integer ID. Because it takes an integer directly, there is no need to convert `user_id` to a string first.

```sql
-- Sample 10% of users by user_id
SELECT
    user_id,
    email,
    created_at
FROM users
WHERE intHash32(user_id) % 10 = 0
LIMIT 100;

-- Sample 1% of users for a quick count
SELECT count() * 100 AS estimated_user_count
FROM users
WHERE intHash32(user_id) % 100 = 0;
```

## Bucketing Integer IDs

Use `intHash32` or `intHash64` to distribute integer IDs across a fixed number of buckets for parallel processing or sharding.

```sql
-- Assign orders to 8 processing queues
SELECT
    order_id,
    customer_id,
    intHash32(order_id) % 8 AS processing_queue
FROM orders
ORDER BY processing_queue
LIMIT 20;

-- Count orders per processing queue
SELECT
    intHash32(order_id) % 8 AS processing_queue,
    count()                  AS order_count
FROM orders
GROUP BY processing_queue
ORDER BY processing_queue;
```

## Consistent User Routing

Route users consistently to backend services using their integer user_id.

```sql
-- Route users to one of 4 backend instances
SELECT
    user_id,
    intHash64(user_id) % 4 AS backend_instance
FROM active_sessions
LIMIT 20;
```

## Comparing Performance with String Hash Functions

When hashing integer columns, `intHash32` avoids the overhead of string conversion that `xxHash64(toString(user_id))` would require.

```sql
-- Both approaches produce valid hashes but intHash is faster for integers
SELECT
    user_id,
    intHash64(user_id)                   AS int_hash,        -- faster
    xxHash64(toString(user_id))          AS xx_hash_str,     -- slower (string conversion)
    cityHash64(user_id)                  AS city_hash        -- also works with integers
FROM users
LIMIT 5;
```

## A/B Test Assignment for Integer IDs

```sql
-- Assign users to A/B test groups
SELECT
    user_id,
    intHash32(user_id) % 2 AS test_group,
    CASE intHash32(user_id) % 2
        WHEN 0 THEN 'control'
        WHEN 1 THEN 'treatment'
    END AS group_name
FROM users
LIMIT 20;

-- Verify even distribution
SELECT
    intHash32(user_id) % 2 AS test_group,
    count()                 AS user_count
FROM users
GROUP BY test_group;
```

## Sampling Events by user_id

When you want a consistent subset of events (all events for sampled users), hash on `user_id` rather than on `event_id`. This ensures complete user histories are included.

```sql
-- Get all events for 5% of users (consistent user sample)
SELECT
    user_id,
    event_type,
    event_time
FROM events
WHERE intHash32(user_id) % 20 = 0
ORDER BY user_id, event_time
LIMIT 10000;
```

## Summary

`intHash32()` and `intHash64()` are optimized for hashing integer values directly. They are the fastest option in ClickHouse when your hash key is already an integer (such as `user_id`, `order_id`, or `product_id`). Use `intHash32` for compact UInt32 output and `intHash64` for 64-bit output with lower collision probability. Both are ideal for consistent sampling, bucketing, A/B test assignment, and shard routing based on integer keys.
