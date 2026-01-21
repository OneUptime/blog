# How to Handle Cache Stampede (Thundering Herd) in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, Cache Stampede, Thundering Herd, Performance, Distributed Systems, Python, Node.js

Description: A comprehensive guide to preventing and handling cache stampede (thundering herd) problems in Redis. Learn locking strategies, probabilistic early expiration, and request coalescing techniques.

---

> When a popular cache key expires, hundreds of concurrent requests can simultaneously hit your database - this is the cache stampede problem, also known as "thundering herd" or "dog-pile effect." A single expired key can bring down your entire system.

Understanding and preventing cache stampede is critical for building resilient, high-performance applications that rely on caching.

---

## Understanding Cache Stampede

### The Problem

```
Normal operation:
Request → Cache (HIT) → Return

Cache stampede scenario:
1. Popular key expires
2. 1000 concurrent requests arrive
3. All requests see cache miss
4. All 1000 requests hit database simultaneously
5. Database overwhelmed
6. Cascading failures

Timeline:
─────────────────────────────────────────────────────────
Key expires    All requests    Database     System
at T=0         miss cache      overloaded   fails
               (T=0.001s)      (T=0.1s)     (T=1s)
```

### When It Happens

- **High-traffic keys expire**: Popular product pages, home page data
- **Cache server restart**: All keys lost simultaneously
- **Bulk cache invalidation**: Purging entire cache namespace
- **Cold start**: New application instances with empty local caches

---

## Solution 1: Distributed Locking

### Basic Lock-Based Approach

```python
import redis
import json
import time
import uuid
from typing import Any, Optional, Callable

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_with_lock(
    key: str,
    fetch_fn: Callable,
    ttl: int = 300,
    lock_timeout: int = 10,
    wait_timeout: int = 5
) -> Optional[Any]:
    """
    Get cached value with distributed lock to prevent stampede.
    Only one request fetches from origin on cache miss.
    """
    # Try cache first
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)

    # Cache miss - try to acquire lock
    lock_key = f"lock:{key}"
    lock_value = str(uuid.uuid4())

    # Try to acquire lock (NX = only if not exists)
    acquired = redis_client.set(
        lock_key,
        lock_value,
        nx=True,
        ex=lock_timeout
    )

    if acquired:
        try:
            # Double-check cache (another request may have populated it)
            cached = redis_client.get(key)
            if cached:
                return json.loads(cached)

            # Fetch from origin
            value = fetch_fn()

            # Cache the result
            if value is not None:
                redis_client.setex(key, ttl, json.dumps(value, default=str))

            return value
        finally:
            # Release lock (only if we still own it)
            release_lock(lock_key, lock_value)
    else:
        # Lock not acquired - wait for cache to be populated
        return wait_for_cache(key, wait_timeout)

def release_lock(lock_key: str, lock_value: str):
    """Release lock only if we own it (atomic operation)"""
    script = """
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
    """
    redis_client.eval(script, 1, lock_key, lock_value)

def wait_for_cache(key: str, timeout: float) -> Optional[Any]:
    """Wait for another request to populate the cache"""
    deadline = time.time() + timeout
    poll_interval = 0.05  # 50ms

    while time.time() < deadline:
        cached = redis_client.get(key)
        if cached:
            return json.loads(cached)
        time.sleep(poll_interval)

    # Timeout - fall back to fetching directly
    return None

# Usage
def get_product(product_id: int) -> dict:
    return get_with_lock(
        f"product:{product_id}",
        lambda: fetch_product_from_database(product_id),
        ttl=300,
        lock_timeout=10,
        wait_timeout=5
    )
```

### Improved Lock with Retry

```python
import random

def get_with_lock_retry(
    key: str,
    fetch_fn: Callable,
    ttl: int = 300,
    max_retries: int = 3
) -> Optional[Any]:
    """
    Lock-based cache with retry and jitter.
    """
    for attempt in range(max_retries):
        # Try cache
        cached = redis_client.get(key)
        if cached:
            return json.loads(cached)

        # Try to acquire lock
        lock_key = f"lock:{key}"
        lock_value = str(uuid.uuid4())

        acquired = redis_client.set(lock_key, lock_value, nx=True, ex=10)

        if acquired:
            try:
                # Double-check cache
                cached = redis_client.get(key)
                if cached:
                    return json.loads(cached)

                # Fetch and cache
                value = fetch_fn()
                if value is not None:
                    redis_client.setex(key, ttl, json.dumps(value, default=str))
                return value
            finally:
                release_lock(lock_key, lock_value)
        else:
            # Wait with jitter before retry
            jitter = random.uniform(0.01, 0.1)
            time.sleep(0.1 + jitter)

    # All retries exhausted - fetch directly (degraded mode)
    return fetch_fn()
```

---

## Solution 2: Probabilistic Early Expiration (PER)

### XFetch Algorithm

```python
import math
import random
import time

def get_with_per(
    key: str,
    fetch_fn: Callable,
    ttl: int = 300,
    beta: float = 1.0
) -> Optional[Any]:
    """
    Probabilistic early expiration (XFetch algorithm).
    Randomly refreshes cache before expiration to prevent stampede.

    Args:
        key: Cache key
        fetch_fn: Function to fetch fresh data
        ttl: Time-to-live in seconds
        beta: Controls early refresh probability (higher = more aggressive)
    """
    cached = redis_client.get(key)

    if cached:
        data = json.loads(cached)
        value = data['value']
        delta = data['delta']  # Time to compute value
        expiry = data['expiry']

        remaining = expiry - time.time()

        # XFetch formula: refresh early with probability that increases as expiry approaches
        # P(refresh) = exp(-remaining / (beta * delta))
        threshold = delta * beta * math.log(random.random())

        if remaining < threshold or remaining <= 0:
            # Early refresh - recompute in foreground
            return refresh_cache(key, fetch_fn, ttl)

        return value

    # Cache miss
    return refresh_cache(key, fetch_fn, ttl)

def refresh_cache(key: str, fetch_fn: Callable, ttl: int) -> Any:
    """Fetch fresh data and cache it"""
    start = time.time()
    value = fetch_fn()
    delta = time.time() - start  # Computation time

    if value is not None:
        data = {
            'value': value,
            'delta': delta,
            'expiry': time.time() + ttl
        }
        redis_client.setex(key, ttl, json.dumps(data, default=str))

    return value

# Usage
def get_product_per(product_id: int) -> dict:
    return get_with_per(
        f"product:{product_id}",
        lambda: fetch_product_from_database(product_id),
        ttl=300,
        beta=1.0
    )
```

### Background Refresh with Stale Data

```python
import threading
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=10)
refreshing_keys = set()

def get_with_background_refresh(
    key: str,
    fetch_fn: Callable,
    ttl: int = 300,
    stale_ttl: int = 600
) -> Optional[Any]:
    """
    Serve stale data while refreshing in background.
    Never blocks on cache miss for warm keys.
    """
    cached = redis_client.hgetall(f"data:{key}")

    if cached:
        value = json.loads(cached.get('value', '{}'))
        cached_at = float(cached.get('cached_at', 0))
        age = time.time() - cached_at

        if age < ttl:
            # Fresh data
            return value

        if age < stale_ttl:
            # Stale but acceptable - return and refresh in background
            trigger_background_refresh(key, fetch_fn, ttl)
            return value

    # Cache miss or too stale - fetch synchronously
    return fetch_and_cache(key, fetch_fn, ttl)

def trigger_background_refresh(key: str, fetch_fn: Callable, ttl: int):
    """Trigger async refresh if not already in progress"""
    if key in refreshing_keys:
        return

    refreshing_keys.add(key)

    def refresh():
        try:
            fetch_and_cache(key, fetch_fn, ttl)
        finally:
            refreshing_keys.discard(key)

    executor.submit(refresh)

def fetch_and_cache(key: str, fetch_fn: Callable, ttl: int) -> Any:
    """Fetch and cache data"""
    value = fetch_fn()

    if value is not None:
        redis_client.hset(f"data:{key}", mapping={
            'value': json.dumps(value, default=str),
            'cached_at': str(time.time())
        })
        redis_client.expire(f"data:{key}", ttl * 2)

    return value
```

---

## Solution 3: Request Coalescing (Singleflight)

### Python Singleflight Implementation

```python
import threading
from typing import Any, Dict, Callable
from dataclasses import dataclass
import time

@dataclass
class Call:
    """Represents an in-flight request"""
    result: Any = None
    error: Exception = None
    done: threading.Event = None
    count: int = 0

class Singleflight:
    """
    Singleflight ensures only one execution is in-flight for a given key.
    All concurrent callers wait for the single execution to complete.
    """

    def __init__(self):
        self.calls: Dict[str, Call] = {}
        self.lock = threading.Lock()

    def do(self, key: str, fn: Callable) -> Any:
        """
        Execute fn for key, coalescing concurrent requests.

        If there's already an in-flight request for key, wait for it.
        Otherwise, execute fn and share result with all waiters.
        """
        with self.lock:
            if key in self.calls:
                # Request already in-flight - wait for it
                call = self.calls[key]
                call.count += 1
            else:
                # First request - create new call
                call = Call(done=threading.Event())
                self.calls[key] = call
                call.count = 1

        # If we're not the first, wait for result
        if call.count > 1:
            call.done.wait()
            if call.error:
                raise call.error
            return call.result

        # We're the first - execute function
        try:
            call.result = fn()
        except Exception as e:
            call.error = e
        finally:
            # Signal waiters and cleanup
            call.done.set()
            with self.lock:
                del self.calls[key]

        if call.error:
            raise call.error
        return call.result

# Global singleflight instance
sf = Singleflight()

def get_with_singleflight(key: str, fetch_fn: Callable, ttl: int = 300) -> Any:
    """
    Cache get with singleflight to prevent stampede.
    """
    # Try cache first
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)

    # Use singleflight for the fetch
    def fetch_and_cache():
        # Double-check cache inside singleflight
        cached = redis_client.get(key)
        if cached:
            return json.loads(cached)

        value = fetch_fn()
        if value is not None:
            redis_client.setex(key, ttl, json.dumps(value, default=str))
        return value

    return sf.do(key, fetch_and_cache)

# Usage - concurrent requests are coalesced
def get_product_sf(product_id: int) -> dict:
    return get_with_singleflight(
        f"product:{product_id}",
        lambda: fetch_product_from_database(product_id)
    )
```

### Node.js Singleflight

```javascript
class Singleflight {
    constructor() {
        this.calls = new Map();
    }

    async do(key, fn) {
        // Check if request is in-flight
        if (this.calls.has(key)) {
            return this.calls.get(key);
        }

        // Create promise for this request
        const promise = fn().finally(() => {
            this.calls.delete(key);
        });

        this.calls.set(key, promise);

        return promise;
    }
}

const sf = new Singleflight();

async function getWithSingleflight(key, fetchFn, ttl = 300) {
    // Try cache first
    const cached = await redis.get(key);
    if (cached) {
        return JSON.parse(cached);
    }

    // Coalesce concurrent fetches
    return sf.do(key, async () => {
        // Double-check cache
        const cached = await redis.get(key);
        if (cached) {
            return JSON.parse(cached);
        }

        const value = await fetchFn();
        if (value !== null && value !== undefined) {
            await redis.setEx(key, ttl, JSON.stringify(value));
        }
        return value;
    });
}
```

---

## Solution 4: Warm Cache Before Expiration

### Proactive Cache Refresh

```python
import schedule
import time
from typing import List, Callable

class ProactiveCacheWarmer:
    """
    Proactively refresh cache before expiration.
    Prevents stampede by ensuring keys never actually expire.
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self.refresh_registry: Dict[str, dict] = {}

    def register(
        self,
        key: str,
        fetch_fn: Callable,
        ttl: int,
        refresh_before: int = 60
    ):
        """
        Register a key for proactive refresh.

        Args:
            key: Cache key
            fetch_fn: Function to fetch fresh data
            ttl: Time-to-live in seconds
            refresh_before: Refresh this many seconds before expiry
        """
        self.refresh_registry[key] = {
            'fetch_fn': fetch_fn,
            'ttl': ttl,
            'refresh_before': refresh_before
        }

        # Initial cache population
        self._refresh_key(key)

    def _refresh_key(self, key: str):
        """Refresh a single key"""
        config = self.refresh_registry.get(key)
        if not config:
            return

        try:
            value = config['fetch_fn']()
            if value is not None:
                self.redis.setex(
                    key,
                    config['ttl'],
                    json.dumps(value, default=str)
                )
        except Exception as e:
            print(f"Error refreshing {key}: {e}")

    def run_refresh_loop(self):
        """Check and refresh keys approaching expiration"""
        while True:
            for key, config in self.refresh_registry.items():
                ttl_remaining = self.redis.ttl(key)

                # Refresh if TTL is below threshold
                if ttl_remaining < config['refresh_before']:
                    self._refresh_key(key)

            time.sleep(10)  # Check every 10 seconds

    def get(self, key: str) -> Optional[Any]:
        """Get value - should always hit cache"""
        cached = self.redis.get(key)
        return json.loads(cached) if cached else None

# Usage
warmer = ProactiveCacheWarmer(redis_client)

# Register keys for proactive refresh
warmer.register(
    "homepage:featured",
    lambda: fetch_featured_products(),
    ttl=300,
    refresh_before=60
)

warmer.register(
    "categories:all",
    lambda: fetch_all_categories(),
    ttl=3600,
    refresh_before=120
)

# Start refresh loop in background
threading.Thread(target=warmer.run_refresh_loop, daemon=True).start()

# Get values - should always hit cache
featured = warmer.get("homepage:featured")
```

---

## Solution 5: Semaphore-Based Throttling

```python
import asyncio
from asyncio import Semaphore

class ThrottledCache:
    """
    Limit concurrent cache rebuilds using semaphores.
    Allows controlled stampede rather than complete prevention.
    """

    def __init__(self, redis_client, max_concurrent_rebuilds: int = 10):
        self.redis = redis_client
        self.semaphore = Semaphore(max_concurrent_rebuilds)
        self.rebuild_semaphores: Dict[str, Semaphore] = {}

    async def get(
        self,
        key: str,
        fetch_fn: Callable,
        ttl: int = 300,
        per_key_concurrency: int = 1
    ) -> Any:
        """
        Get with throttled rebuilds.
        Limits both total and per-key concurrency.
        """
        # Try cache first
        cached = await asyncio.to_thread(self.redis.get, key)
        if cached:
            return json.loads(cached)

        # Get or create per-key semaphore
        if key not in self.rebuild_semaphores:
            self.rebuild_semaphores[key] = Semaphore(per_key_concurrency)

        key_semaphore = self.rebuild_semaphores[key]

        # Try to acquire per-key semaphore (non-blocking)
        if key_semaphore.locked():
            # Another request is rebuilding - wait for cache
            for _ in range(50):  # 5 second timeout
                await asyncio.sleep(0.1)
                cached = await asyncio.to_thread(self.redis.get, key)
                if cached:
                    return json.loads(cached)
            # Timeout - proceed anyway

        async with self.semaphore:  # Global concurrency limit
            async with key_semaphore:  # Per-key concurrency limit
                # Double-check cache
                cached = await asyncio.to_thread(self.redis.get, key)
                if cached:
                    return json.loads(cached)

                # Fetch and cache
                value = await fetch_fn()
                if value is not None:
                    await asyncio.to_thread(
                        self.redis.setex,
                        key,
                        ttl,
                        json.dumps(value, default=str)
                    )
                return value
```

---

## Combining Strategies

### Production-Ready Implementation

```python
class StampedeResistantCache:
    """
    Combines multiple stampede prevention strategies:
    1. Singleflight for request coalescing
    2. Probabilistic early expiration
    3. Background refresh for stale data
    4. Distributed locking as fallback
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self.singleflight = Singleflight()
        self.refreshing = set()

    def get(
        self,
        key: str,
        fetch_fn: Callable,
        ttl: int = 300,
        stale_ttl: int = 600,
        beta: float = 1.0
    ) -> Any:
        """
        Get with comprehensive stampede protection.
        """
        cached = self.redis.hgetall(f"cache:{key}")

        if cached:
            value = json.loads(cached.get('value', '{}'))
            delta = float(cached.get('delta', 1))
            cached_at = float(cached.get('cached_at', 0))
            age = time.time() - cached_at

            # Fresh data
            if age < ttl:
                # Check for probabilistic early refresh
                remaining = ttl - age
                threshold = delta * beta * math.log(random.random())

                if remaining > threshold:
                    return value

                # Early refresh - do in background
                self._background_refresh(key, fetch_fn, ttl)
                return value

            # Stale but acceptable
            if age < stale_ttl:
                self._background_refresh(key, fetch_fn, ttl)
                return value

        # Cache miss or too stale - fetch with singleflight
        return self.singleflight.do(
            key,
            lambda: self._fetch_and_cache(key, fetch_fn, ttl)
        )

    def _fetch_and_cache(self, key: str, fetch_fn: Callable, ttl: int) -> Any:
        """Fetch from origin and cache"""
        start = time.time()
        value = fetch_fn()
        delta = time.time() - start

        if value is not None:
            self.redis.hset(f"cache:{key}", mapping={
                'value': json.dumps(value, default=str),
                'delta': str(delta),
                'cached_at': str(time.time())
            })
            self.redis.expire(f"cache:{key}", ttl * 2)

        return value

    def _background_refresh(self, key: str, fetch_fn: Callable, ttl: int):
        """Refresh in background thread"""
        if key in self.refreshing:
            return

        self.refreshing.add(key)

        def refresh():
            try:
                self._fetch_and_cache(key, fetch_fn, ttl)
            finally:
                self.refreshing.discard(key)

        threading.Thread(target=refresh, daemon=True).start()

# Usage
cache = StampedeResistantCache(redis_client)

def get_product(product_id: int) -> dict:
    return cache.get(
        f"product:{product_id}",
        lambda: fetch_product_from_database(product_id),
        ttl=300,
        stale_ttl=600,
        beta=1.0
    )
```

---

## Monitoring Stampede Protection

```python
from prometheus_client import Counter, Histogram, Gauge

# Metrics
cache_requests = Counter(
    'cache_requests_total',
    'Cache requests',
    ['result']  # hit, miss, stale, early_refresh
)

singleflight_coalesced = Counter(
    'singleflight_coalesced_total',
    'Requests coalesced by singleflight'
)

concurrent_rebuilds = Gauge(
    'cache_concurrent_rebuilds',
    'Number of concurrent cache rebuilds'
)

rebuild_duration = Histogram(
    'cache_rebuild_duration_seconds',
    'Time to rebuild cache entries'
)

class InstrumentedStampedeCache(StampedeResistantCache):
    def get(self, key: str, fetch_fn: Callable, **kwargs) -> Any:
        cached = self.redis.hgetall(f"cache:{key}")

        if cached:
            age = time.time() - float(cached.get('cached_at', 0))
            ttl = kwargs.get('ttl', 300)

            if age < ttl:
                cache_requests.labels(result='hit').inc()
            else:
                cache_requests.labels(result='stale').inc()
        else:
            cache_requests.labels(result='miss').inc()

        return super().get(key, fetch_fn, **kwargs)
```

---

## Best Practices

1. **Layer your defenses**: Use multiple strategies together
2. **Monitor rebuild rates**: Track concurrent rebuilds and coalescing
3. **Tune TTLs**: Balance freshness vs rebuild frequency
4. **Use background refresh**: Return stale data while refreshing
5. **Set fallback timeouts**: Don't wait forever for locks or singleflight

---

## Conclusion

Cache stampede can bring down even well-architected systems. Key prevention strategies:

- **Distributed locking**: Serialize rebuilds for each key
- **Probabilistic early expiration**: Spread out refreshes before expiry
- **Singleflight/request coalescing**: Share results across concurrent requests
- **Background refresh**: Never block on stale data

Combine these strategies based on your traffic patterns and consistency requirements.

---

*Need to monitor your caching layer for stampede events? [OneUptime](https://oneuptime.com) provides comprehensive Redis monitoring with concurrent rebuild tracking, hit rate alerts, and performance dashboards.*
