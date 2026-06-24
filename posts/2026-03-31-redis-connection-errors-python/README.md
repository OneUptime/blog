# How to Handle Redis Connection Errors in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Error Handling, Resilience, redis-py

Description: Handle Redis connection errors in Python with redis-py using exception handling, retry logic, circuit breakers, and health checks for production resilience.

---

Redis is often a critical dependency. Handling connection failures gracefully - with retries, fallbacks, and graceful degradation - prevents cascading failures and improves application resilience.

## Common Exception Types

```python
import redis

# Connection refused or timeout
# redis.exceptions.ConnectionError

# Operation took too long
# redis.exceptions.TimeoutError

# Authentication failed
# redis.exceptions.AuthenticationError

# Server returned an error
# redis.exceptions.ResponseError

# Base class for all redis-py exceptions
# redis.exceptions.RedisError
```

## Basic Exception Handling

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

try:
    value = r.get("my:key")
except redis.exceptions.ConnectionError as e:
    print(f"Could not connect to Redis: {e}")
    value = None
except redis.exceptions.TimeoutError as e:
    print(f"Redis operation timed out: {e}")
    value = None
except redis.exceptions.RedisError as e:
    print(f"Redis error: {e}")
    value = None
```

## Setting Connection and Socket Timeouts

Prevent commands from blocking indefinitely:

```python
r = redis.Redis(
    host="localhost",
    port=6379,
    socket_connect_timeout=2,   # Seconds to wait for a connection
    socket_timeout=1,            # Seconds to wait for a response
    retry_on_timeout=True,       # Auto-retry on timeout
    decode_responses=True,
)
```

## Retry with Exponential Backoff

Use `tenacity` for configurable retry logic:

```bash
pip install tenacity
```

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

@retry(
    retry=retry_if_exception_type((redis.exceptions.ConnectionError, redis.exceptions.TimeoutError)),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=10),
    stop=stop_after_attempt(5),
)
def get_with_retry(key: str) -> str | None:
    return r.get(key)

value = get_with_retry("config:feature_flags")
```

## Health Check Before Use

Add a lightweight ping to verify connectivity:

```python
def redis_is_healthy(r: redis.Redis) -> bool:
    try:
        return r.ping()
    except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
        return False

if not redis_is_healthy(r):
    # Serve from fallback (local cache, default value, etc.)
    pass
```

## Auto-Reconnect with retry_on_error

redis-py supports a `retry` parameter for automatic reconnection:

```python
from redis.retry import Retry
from redis.backoff import ExponentialBackoff

r = redis.Redis(
    host="localhost",
    port=6379,
    retry=Retry(ExponentialBackoff(), retries=3),
    retry_on_error=[redis.exceptions.ConnectionError, redis.exceptions.TimeoutError],
    decode_responses=True,
)
```

## Graceful Degradation Pattern

```python
_local_cache: dict = {}

def cached(key: str, fetch_fn, ttl: int = 60):
    try:
        cached_val = r.get(key)
        if cached_val is not None:
            return cached_val
        value = fetch_fn()
        r.set(key, value, ex=ttl)
        _local_cache[key] = value
        return value
    except redis.exceptions.RedisError:
        # Fall back to in-process cache on Redis failure
        return _local_cache.get(key)
```

## Summary

Handle Redis errors in Python by catching specific exception types (`ConnectionError`, `TimeoutError`), setting socket timeouts, and using exponential backoff retry logic with `tenacity` or redis-py's built-in `Retry` class. Always implement graceful degradation so your application continues to function when Redis is temporarily unavailable.
