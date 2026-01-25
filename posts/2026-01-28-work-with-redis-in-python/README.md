# How to Work with Redis in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Redis, Caching, Database, Performance, Async

Description: Learn how to use Redis with Python for caching, session management, pub/sub messaging, and more. This guide covers redis-py, async operations, and common patterns.

---

> Redis is an in-memory data store that excels at caching, session management, real-time analytics, and message queuing. Python's redis-py library provides a straightforward way to interact with Redis from your applications.

This guide covers Redis fundamentals with Python, from basic operations to advanced patterns like pub/sub and distributed locks.

---

## Getting Started

### Installation

```bash
# Install redis-py
pip install redis

# For async support
pip install redis[hiredis]  # Includes C parser for better performance
```

### Basic Connection

```python
# basic_connection.py
# Connecting to Redis
import redis

# Simple connection
r = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True  # Return strings instead of bytes
)

# Test connection
print(r.ping())  # True

# With connection URL
r = redis.from_url('redis://localhost:6379/0')

# With authentication
r = redis.Redis(
    host='redis.example.com',
    port=6379,
    password='your-password',
    ssl=True
)

# Connection pooling (automatic in redis-py)
pool = redis.ConnectionPool(host='localhost', port=6379, db=0)
r = redis.Redis(connection_pool=pool)
```

---

## Basic Operations

### Strings

```python
# string_operations.py
# Working with Redis strings
import redis
from datetime import timedelta

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Set a value
r.set('user:1:name', 'Alice')

# Get a value
name = r.get('user:1:name')
print(name)  # Alice

# Set with expiration
r.set('session:abc123', 'user_data', ex=3600)  # Expires in 1 hour
r.setex('session:xyz', 3600, 'user_data')  # Alternative syntax

# Set only if not exists
created = r.setnx('user:1:name', 'Bob')  # Returns False - key exists
created = r.setnx('user:2:name', 'Bob')  # Returns True - key created

# Set multiple values
r.mset({
    'user:1:email': 'alice@example.com',
    'user:1:age': '30'
})

# Get multiple values
values = r.mget('user:1:name', 'user:1:email', 'user:1:age')
print(values)  # ['Alice', 'alice@example.com', '30']

# Increment/Decrement
r.set('counter', 0)
r.incr('counter')      # 1
r.incr('counter', 5)   # 6
r.decr('counter')      # 5

# Float operations
r.set('price', '10.50')
r.incrbyfloat('price', 0.25)  # 10.75
```

### Key Operations

```python
# key_operations.py
# Managing Redis keys
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Check if key exists
exists = r.exists('user:1:name')  # Returns count of existing keys
print(f"Key exists: {exists > 0}")

# Delete keys
r.delete('user:1:temp')
r.delete('key1', 'key2', 'key3')  # Delete multiple

# Set expiration
r.expire('session:abc', 3600)  # Expire in 3600 seconds
r.expireat('session:abc', 1735689600)  # Expire at Unix timestamp

# Get time to live
ttl = r.ttl('session:abc')  # Returns seconds until expiration

# Remove expiration
r.persist('session:abc')  # Make key permanent

# Find keys by pattern
keys = r.keys('user:*:name')  # Find all user name keys
# Warning: keys() is slow on large datasets, use scan() instead

# Scan keys (better for production)
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match='user:*:name', count=100)
    for key in keys:
        print(key)
    if cursor == 0:
        break

# Rename key
r.rename('old_key', 'new_key')
```

---

## Data Structures

### Lists

```python
# list_operations.py
# Working with Redis lists
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Add to list
r.lpush('queue:tasks', 'task3', 'task2', 'task1')  # Left push
r.rpush('queue:tasks', 'task4', 'task5')  # Right push

# Get list range
tasks = r.lrange('queue:tasks', 0, -1)  # Get all
print(tasks)  # ['task1', 'task2', 'task3', 'task4', 'task5']

# Pop from list
task = r.lpop('queue:tasks')  # Pop from left
task = r.rpop('queue:tasks')  # Pop from right

# Blocking pop (wait for item)
task = r.blpop('queue:tasks', timeout=30)  # Wait up to 30 seconds
if task:
    queue_name, item = task
    print(f"Got {item} from {queue_name}")

# List length
length = r.llen('queue:tasks')

# Get by index
first = r.lindex('queue:tasks', 0)

# Set by index
r.lset('queue:tasks', 0, 'updated_task')

# Trim list (keep only range)
r.ltrim('queue:tasks', 0, 99)  # Keep first 100 items
```

### Hashes

```python
# hash_operations.py
# Working with Redis hashes
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Set hash fields
r.hset('user:1', 'name', 'Alice')
r.hset('user:1', 'email', 'alice@example.com')

# Set multiple fields
r.hset('user:1', mapping={
    'age': 30,
    'city': 'Boston',
    'role': 'developer'
})

# Get single field
name = r.hget('user:1', 'name')

# Get multiple fields
values = r.hmget('user:1', 'name', 'email', 'age')

# Get all fields and values
user = r.hgetall('user:1')
print(user)  # {'name': 'Alice', 'email': 'alice@example.com', 'age': '30', ...}

# Check field exists
exists = r.hexists('user:1', 'name')

# Delete field
r.hdel('user:1', 'temp_field')

# Increment field
r.hincrby('user:1', 'login_count', 1)

# Get all field names
fields = r.hkeys('user:1')

# Get all values
values = r.hvals('user:1')
```

### Sets

```python
# set_operations.py
# Working with Redis sets
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Add to set
r.sadd('user:1:tags', 'python', 'redis', 'programming')

# Check membership
is_member = r.sismember('user:1:tags', 'python')  # True

# Get all members
tags = r.smembers('user:1:tags')
print(tags)  # {'python', 'redis', 'programming'}

# Remove from set
r.srem('user:1:tags', 'programming')

# Set operations
r.sadd('user:2:tags', 'python', 'javascript', 'web')

# Intersection
common = r.sinter('user:1:tags', 'user:2:tags')  # {'python'}

# Union
all_tags = r.sunion('user:1:tags', 'user:2:tags')

# Difference
unique_to_1 = r.sdiff('user:1:tags', 'user:2:tags')

# Random member
random_tag = r.srandmember('user:1:tags')

# Pop random member
removed = r.spop('user:1:tags')
```

### Sorted Sets

```python
# sorted_set_operations.py
# Working with Redis sorted sets
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Add with scores
r.zadd('leaderboard', {
    'player1': 100,
    'player2': 250,
    'player3': 175
})

# Get by rank (lowest to highest)
top_players = r.zrange('leaderboard', 0, -1, withscores=True)
print(top_players)  # [('player1', 100.0), ('player3', 175.0), ('player2', 250.0)]

# Get by rank (highest to lowest)
top_players = r.zrevrange('leaderboard', 0, 2, withscores=True)

# Get by score range
mid_tier = r.zrangebyscore('leaderboard', 100, 200, withscores=True)

# Get rank of member
rank = r.zrank('leaderboard', 'player2')  # 0-based, lowest first
rank = r.zrevrank('leaderboard', 'player2')  # 0-based, highest first

# Increment score
r.zincrby('leaderboard', 50, 'player1')

# Count in score range
count = r.zcount('leaderboard', 100, 200)

# Remove members
r.zrem('leaderboard', 'player3')
```

---

## Caching Patterns

### Function Result Caching

```python
# caching.py
# Caching function results with Redis
import redis
import json
import hashlib
from functools import wraps
from typing import Any

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def cache(ttl: int = 300, prefix: str = "cache"):
    """Decorator to cache function results in Redis."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key_data = f"{func.__name__}:{args}:{sorted(kwargs.items())}"
            cache_key = f"{prefix}:{hashlib.md5(key_data.encode()).hexdigest()}"

            # Try to get from cache
            cached = r.get(cache_key)
            if cached is not None:
                return json.loads(cached)

            # Call function and cache result
            result = func(*args, **kwargs)
            r.setex(cache_key, ttl, json.dumps(result))

            return result
        return wrapper
    return decorator

# Usage
@cache(ttl=3600)
def get_user_data(user_id: int) -> dict:
    """Expensive database query - results cached for 1 hour."""
    # Simulate database query
    return {"id": user_id, "name": f"User {user_id}"}

user = get_user_data(123)  # First call - queries database
user = get_user_data(123)  # Second call - returns cached result
```

### Cache Invalidation

```python
# cache_invalidation.py
# Strategies for cache invalidation
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class CacheManager:
    """Manage cache with invalidation support."""

    def __init__(self, redis_client, prefix: str = "cache"):
        self.r = redis_client
        self.prefix = prefix

    def get(self, key: str) -> str:
        return self.r.get(f"{self.prefix}:{key}")

    def set(self, key: str, value: str, ttl: int = 300, tags: list = None):
        """Set cache with optional tags for group invalidation."""
        full_key = f"{self.prefix}:{key}"
        self.r.setex(full_key, ttl, value)

        # Store key in tag sets for group invalidation
        if tags:
            for tag in tags:
                self.r.sadd(f"{self.prefix}:tag:{tag}", full_key)
                self.r.expire(f"{self.prefix}:tag:{tag}", ttl)

    def invalidate(self, key: str):
        """Invalidate a single cache key."""
        self.r.delete(f"{self.prefix}:{key}")

    def invalidate_by_tag(self, tag: str):
        """Invalidate all keys with a specific tag."""
        tag_key = f"{self.prefix}:tag:{tag}"
        keys = self.r.smembers(tag_key)
        if keys:
            self.r.delete(*keys)
        self.r.delete(tag_key)

# Usage
cache = CacheManager(r)

# Cache user data with tags
cache.set("user:123", '{"name": "Alice"}', tags=["user", "user:123"])
cache.set("user:124", '{"name": "Bob"}', tags=["user", "user:124"])

# Invalidate all user caches
cache.invalidate_by_tag("user")

# Invalidate specific user
cache.invalidate_by_tag("user:123")
```

---

## Pub/Sub Messaging

```python
# pubsub.py
# Redis publish/subscribe messaging
import redis
import threading
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Publisher
def publish_events():
    """Publish events to a channel."""
    for i in range(5):
        r.publish('events', f'Event {i}')
        time.sleep(1)

# Subscriber
def subscribe_events():
    """Subscribe to events channel."""
    pubsub = r.pubsub()
    pubsub.subscribe('events')

    for message in pubsub.listen():
        if message['type'] == 'message':
            print(f"Received: {message['data']}")

# Run in threads
subscriber_thread = threading.Thread(target=subscribe_events, daemon=True)
subscriber_thread.start()

publisher_thread = threading.Thread(target=publish_events)
publisher_thread.start()
publisher_thread.join()


# Pattern subscription
def subscribe_with_pattern():
    """Subscribe to multiple channels using patterns."""
    pubsub = r.pubsub()
    pubsub.psubscribe('user:*:events')  # Match any user events

    for message in pubsub.listen():
        if message['type'] == 'pmessage':
            channel = message['channel']
            data = message['data']
            print(f"Channel {channel}: {data}")

# Publish to pattern-matched channels
r.publish('user:123:events', 'user logged in')
r.publish('user:456:events', 'user updated profile')
```

---

## Async Redis

```python
# async_redis.py
# Async Redis operations with redis-py
import asyncio
import redis.asyncio as redis

async def main():
    # Async connection
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)

    # Basic operations
    await r.set('async_key', 'async_value')
    value = await r.get('async_key')
    print(f"Value: {value}")

    # Pipeline for multiple operations
    async with r.pipeline() as pipe:
        pipe.set('key1', 'value1')
        pipe.set('key2', 'value2')
        pipe.get('key1')
        pipe.get('key2')
        results = await pipe.execute()
        print(f"Results: {results}")

    # Pub/sub
    pubsub = r.pubsub()
    await pubsub.subscribe('channel')

    # Process messages
    async def reader():
        async for message in pubsub.listen():
            if message['type'] == 'message':
                print(f"Got: {message['data']}")
                break

    # Close connection
    await r.close()

asyncio.run(main())
```

---

## Distributed Locks

```python
# distributed_lock.py
# Implementing distributed locks with Redis
import redis
import uuid
import time
from contextlib import contextmanager

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class RedisLock:
    """Distributed lock using Redis."""

    def __init__(self, redis_client, name: str, timeout: int = 10):
        self.redis = redis_client
        self.name = f"lock:{name}"
        self.timeout = timeout
        self.token = str(uuid.uuid4())

    def acquire(self, blocking: bool = True, blocking_timeout: float = None) -> bool:
        """Acquire the lock."""
        start = time.time()

        while True:
            # Try to set the lock
            acquired = self.redis.set(
                self.name,
                self.token,
                nx=True,  # Only set if not exists
                ex=self.timeout
            )

            if acquired:
                return True

            if not blocking:
                return False

            if blocking_timeout is not None:
                if time.time() - start >= blocking_timeout:
                    return False

            time.sleep(0.1)

    def release(self):
        """Release the lock."""
        # Use Lua script to ensure we only delete our lock
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        self.redis.eval(script, 1, self.name, self.token)

    @contextmanager
    def __call__(self, blocking: bool = True, blocking_timeout: float = None):
        """Context manager for using the lock."""
        acquired = self.acquire(blocking, blocking_timeout)
        try:
            yield acquired
        finally:
            if acquired:
                self.release()

# Usage
lock = RedisLock(r, "my_resource", timeout=30)

with lock():
    # Critical section - only one process can run this at a time
    print("Processing...")
```

---

## Conclusion

Redis with Python provides:

- Fast key-value storage with strings, hashes, lists, sets, and sorted sets
- Caching with automatic expiration
- Pub/sub messaging for real-time communication
- Distributed locks for coordination
- Async support for high-performance applications

Use Redis when you need fast data access, caching, or real-time features.

---

*Building Redis-powered applications? [OneUptime](https://oneuptime.com) helps you monitor Redis performance, track cache hit rates, and alert on connection issues.*

