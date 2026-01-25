# How to Use Redis with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Caching, Tutorial, redis-py

Description: A comprehensive guide to using Redis with Python, covering installation, basic operations, data structures, connection pooling, and common patterns for caching and session management.

---

Redis and Python make a powerful combination for building fast, scalable applications. Whether you need caching, session storage, message queues, or real-time analytics, the redis-py library provides a clean, Pythonic interface to Redis. Let us explore how to use Redis effectively in your Python projects.

## Installation and Setup

Install redis-py:

```bash
pip install redis

# For faster parsing (recommended)
pip install redis[hiredis]
```

### Basic Connection

```python
import redis

# Simple connection
r = redis.Redis(host='localhost', port=6379, db=0)

# Test connection
r.ping()  # Returns True if connected

# With password
r = redis.Redis(
    host='localhost',
    port=6379,
    password='your-password',
    decode_responses=True  # Returns strings instead of bytes
)

# Using URL
r = redis.from_url('redis://:password@localhost:6379/0')
```

### Connection Pooling

For production applications, always use connection pooling:

```python
import redis

# Create a connection pool
pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    max_connections=50,
    decode_responses=True
)

# Create client using pool
r = redis.Redis(connection_pool=pool)

# Reuse the same pool across your application
def get_redis_client():
    return redis.Redis(connection_pool=pool)
```

## Basic Operations

### Strings

```python
# Set and get
r.set('name', 'Alice')
name = r.get('name')  # 'Alice'

# Set with expiration
r.setex('session:123', 3600, 'session_data')  # Expires in 1 hour

# Set only if not exists
r.setnx('lock:resource', '1')

# Increment/decrement
r.set('counter', 0)
r.incr('counter')      # 1
r.incrby('counter', 5)  # 6

# Multiple operations
r.mset({'key1': 'value1', 'key2': 'value2'})
values = r.mget(['key1', 'key2'])  # ['value1', 'value2']
```

### Hashes

```python
# Set hash fields
r.hset('user:123', mapping={
    'name': 'Alice',
    'email': 'alice@example.com',
    'age': '30'
})

# Get hash fields
name = r.hget('user:123', 'name')  # 'Alice'
user = r.hgetall('user:123')  # {'name': 'Alice', 'email': '...'}

# Increment hash field
r.hincrby('user:123', 'visits', 1)
```

### Lists

```python
# Push elements
r.lpush('queue', 'task1', 'task2')  # Push to left
r.rpush('queue', 'task3')  # Push to right

# Pop elements
task = r.lpop('queue')  # Get and remove from left
task = r.blpop('queue', timeout=5)  # Blocking pop

# Get range
items = r.lrange('queue', 0, -1)  # Get all items
```

### Sets

```python
# Add members
r.sadd('tags:post:123', 'python', 'redis', 'tutorial')

# Check membership
r.sismember('tags:post:123', 'python')  # True

# Set operations
r.sinter('user:1:interests', 'user:2:interests')  # Intersection
r.sunion('user:1:interests', 'user:2:interests')  # Union
```

### Sorted Sets

```python
# Add with scores
r.zadd('leaderboard', {'alice': 100, 'bob': 85, 'charlie': 92})

# Get by rank (highest first)
r.zrevrange('leaderboard', 0, 2, withscores=True)
# [('alice', 100.0), ('charlie', 92.0), ('bob', 85.0)]

# Increment score
r.zincrby('leaderboard', 10, 'bob')

# Get rank
r.zrevrank('leaderboard', 'alice')  # 0 (first place)
```

## Common Patterns

### Caching with TTL

```python
import json

class Cache:
    def __init__(self, redis_client, default_ttl=300):
        self.r = redis_client
        self.default_ttl = default_ttl

    def get(self, key):
        data = self.r.get(key)
        if data:
            return json.loads(data)
        return None

    def set(self, key, value, ttl=None):
        ttl = ttl or self.default_ttl
        self.r.setex(key, ttl, json.dumps(value))

    def get_or_set(self, key, fetch_func, ttl=None):
        cached = self.get(key)
        if cached is not None:
            return cached
        value = fetch_func()
        self.set(key, value, ttl)
        return value

# Usage
cache = Cache(r)
user = cache.get_or_set(
    f'user:{user_id}',
    lambda: fetch_user_from_db(user_id),
    ttl=600
)
```

### Rate Limiting

```python
import time

class RateLimiter:
    def __init__(self, redis_client):
        self.r = redis_client

    def is_allowed(self, key, max_requests, window_seconds):
        now = time.time()
        window_start = now - window_seconds

        pipe = self.r.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window_seconds)

        results = pipe.execute()
        current_count = results[1]

        return current_count < max_requests

# Usage
limiter = RateLimiter(r)
if limiter.is_allowed('ratelimit:user:123', max_requests=100, window_seconds=60):
    # Process request
    pass
else:
    # Rate limit exceeded
    pass
```

### Session Storage

```python
import uuid

class SessionManager:
    def __init__(self, redis_client, prefix='session:', ttl=3600):
        self.r = redis_client
        self.prefix = prefix
        self.ttl = ttl

    def create_session(self, user_id, data=None):
        session_id = str(uuid.uuid4())
        session_data = {'user_id': user_id, **(data or {})}
        key = f"{self.prefix}{session_id}"
        self.r.setex(key, self.ttl, json.dumps(session_data))
        return session_id

    def get_session(self, session_id):
        key = f"{self.prefix}{session_id}"
        data = self.r.get(key)
        if data:
            self.r.expire(key, self.ttl)  # Extend TTL
            return json.loads(data)
        return None

    def destroy_session(self, session_id):
        return self.r.delete(f"{self.prefix}{session_id}") > 0

# Usage
sessions = SessionManager(r)
session_id = sessions.create_session('user123', {'role': 'admin'})
session = sessions.get_session(session_id)
```

## Error Handling

```python
from redis.exceptions import ConnectionError, TimeoutError, ResponseError

def safe_redis_operation(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ConnectionError:
            print("Could not connect to Redis")
            return None
        except TimeoutError:
            print("Redis operation timed out")
            return None
        except ResponseError as e:
            print(f"Redis error: {e}")
            return None
    return wrapper

@safe_redis_operation
def get_user_data(user_id):
    return r.hgetall(f'user:{user_id}')
```

## Async Redis

```python
import asyncio
import redis.asyncio as redis

async def main():
    r = redis.Redis(host='localhost', port=6379)

    await r.set('key', 'value')
    value = await r.get('key')

    # Pipeline
    async with r.pipeline() as pipe:
        pipe.set('key1', 'value1')
        pipe.set('key2', 'value2')
        results = await pipe.execute()

    await r.close()

asyncio.run(main())
```

---

Redis with Python opens up possibilities for fast, scalable applications. Start with basic caching and session storage, then explore more advanced patterns like rate limiting, pub/sub, and distributed locks. The redis-py library makes it easy to work with all of Redis's data structures while maintaining clean, Pythonic code.
