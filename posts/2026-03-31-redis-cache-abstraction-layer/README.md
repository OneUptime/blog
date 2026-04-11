# How to Build a Cache Abstraction Layer Over Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Abstraction, Architecture, Pattern

Description: Build a cache abstraction layer over Redis to decouple business logic from caching implementation, enabling stampede protection, multi-level caching, and backend swapping.

---

Calling Redis directly throughout your codebase makes it hard to add stampede protection, change TTL policies, or swap the backend. A cache abstraction layer wraps Redis behind a clean interface, adding cross-cutting concerns once rather than everywhere.

## The Cache Interface

Define a simple interface your application talks to:

```python
from abc import ABC, abstractmethod
from typing import Optional, Any, Callable

class CacheBackend(ABC):
    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        pass

    @abstractmethod
    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        pass
```

## Redis Implementation

```python
import redis
import pickle

class RedisCache(CacheBackend):
    def __init__(self, redis_client: redis.Redis, key_prefix: str = "cache:"):
        self._r = redis_client
        self._prefix = key_prefix

    def _k(self, key: str) -> str:
        return self._prefix + key

    def get(self, key: str) -> Optional[Any]:
        raw = self._r.get(self._k(key))
        return pickle.loads(raw) if raw else None

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        self._r.setex(self._k(key), ttl, pickle.dumps(value))

    def delete(self, key: str) -> None:
        self._r.delete(self._k(key))

    def exists(self, key: str) -> bool:
        return self._r.exists(self._k(key)) == 1
```

## Cache Stampede Protection

Wrap the fetch logic with a lock to prevent multiple simultaneous fetches of the same key:

```python
import uuid

class StampedeProtectedCache(CacheBackend):
    def __init__(self, backend: CacheBackend, redis_client: redis.Redis):
        self._backend = backend
        self._r = redis_client

    def get_or_compute(self, key: str, compute_fn: Callable, ttl: int = 300) -> Any:
        value = self._backend.get(key)
        if value is not None:
            return value

        lock_key = f"lock:compute:{key}"
        lock_id = str(uuid.uuid4())
        acquired = self._r.set(lock_key, lock_id, nx=True, ex=10)

        if acquired:
            try:
                value = compute_fn()
                self._backend.set(key, value, ttl)
                return value
            finally:
                # Release lock only if we own it
                script = "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end"
                self._r.eval(script, 1, lock_key, lock_id)
        else:
            # Wait briefly and retry
            import time
            time.sleep(0.05)
            return self.get_or_compute(key, compute_fn, ttl)

    def get(self, key): return self._backend.get(key)
    def set(self, key, value, ttl=300): return self._backend.set(key, value, ttl)
    def delete(self, key): return self._backend.delete(key)
    def exists(self, key): return self._backend.exists(key)
```

## Multi-Level Cache

Chain a local in-process cache in front of Redis:

```python
class TieredCache(CacheBackend):
    def __init__(self, l1: CacheBackend, l2: CacheBackend):
        self._l1 = l1
        self._l2 = l2

    def get(self, key: str) -> Optional[Any]:
        value = self._l1.get(key)
        if value is not None:
            return value
        value = self._l2.get(key)
        if value is not None:
            self._l1.set(key, value, ttl=60)  # Warm L1
        return value

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        self._l1.set(key, value, ttl=min(ttl, 60))
        self._l2.set(key, value, ttl=ttl)

    def delete(self, key: str) -> None:
        self._l1.delete(key)
        self._l2.delete(key)

    def exists(self, key: str) -> bool:
        return self._l1.exists(key) or self._l2.exists(key)
```

## Using the Abstraction

Business logic stays cache-agnostic:

```python
cache = StampedeProtectedCache(RedisCache(redis.Redis()), redis.Redis())

def get_product(product_id):
    return cache.get_or_compute(
        f"product:{product_id}",
        lambda: db.query("SELECT * FROM products WHERE id = %s", product_id),
        ttl=600
    )
```

## Summary

A cache abstraction layer decouples business logic from Redis implementation details, making it trivial to add stampede protection, stack multiple caching tiers, or swap Redis for an in-memory backend in tests. The `get_or_compute` method with lock-based protection is the most valuable enhancement over raw Redis calls, preventing thundering herds without changing any calling code.
