# How to Implement Redis Request Coalescing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Request Coalescing, Caching, Performance, Thundering Herd, Single Flight, Concurrency

Description: A comprehensive guide to implementing request coalescing with Redis, covering single-flight patterns, distributed deduplication, cache stampede prevention, and practical implementations for high-concurrency applications.

---

Request coalescing (also known as request deduplication or single-flight) is a technique to prevent duplicate concurrent requests for the same data. When multiple clients request the same key simultaneously during a cache miss, request coalescing ensures only one request fetches the data while others wait for the result. This prevents the "thundering herd" problem and reduces load on both Redis and backend systems.

## The Thundering Herd Problem

When a popular cache key expires or is missing, multiple concurrent requests can trigger simultaneous cache misses:

```
Without Coalescing:
Time 0ms: Request A -> Cache MISS -> Fetch from DB
Time 1ms: Request B -> Cache MISS -> Fetch from DB (duplicate!)
Time 2ms: Request C -> Cache MISS -> Fetch from DB (duplicate!)
Time 3ms: Request D -> Cache MISS -> Fetch from DB (duplicate!)

Result: 4 database queries for the same data

With Coalescing:
Time 0ms: Request A -> Cache MISS -> Acquire lock -> Fetch from DB
Time 1ms: Request B -> Cache MISS -> Wait for A
Time 2ms: Request C -> Cache MISS -> Wait for A
Time 3ms: Request D -> Cache MISS -> Wait for A
Time 50ms: Request A completes -> All requests get same result

Result: 1 database query, all requests served
```

## Local Single-Flight Pattern

### Python Implementation

```python
import threading
import time
from typing import Any, Callable, Dict, Optional
from dataclasses import dataclass
import redis
import hashlib

@dataclass
class PendingRequest:
    """Represents a pending request waiting for result."""
    event: threading.Event
    result: Any = None
    error: Exception = None
    completed: bool = False

class LocalSingleFlight:
    """
    Single-flight implementation for a single process.
    Prevents duplicate concurrent calls for the same key.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._pending: Dict[str, PendingRequest] = {}

    def do(self, key: str, fn: Callable[[], Any]) -> Any:
        """
        Execute fn() for the given key, deduplicating concurrent calls.

        If another call for the same key is in flight, waits for its result
        instead of executing fn() again.
        """
        with self._lock:
            if key in self._pending:
                # Another request is in flight - wait for it
                pending = self._pending[key]
            else:
                # First request - create pending entry
                pending = PendingRequest(event=threading.Event())
                self._pending[key] = pending
                pending = None  # Signal that we're the executor

        if pending is not None:
            # Wait for the other request to complete
            pending.event.wait()
            if pending.error:
                raise pending.error
            return pending.result

        # We're the executor
        try:
            result = fn()
            with self._lock:
                entry = self._pending[key]
                entry.result = result
                entry.completed = True
            return result
        except Exception as e:
            with self._lock:
                entry = self._pending[key]
                entry.error = e
                entry.completed = True
            raise
        finally:
            with self._lock:
                entry = self._pending.get(key)
                if entry:
                    entry.event.set()
                    del self._pending[key]


class SingleFlightCache:
    """
    Redis cache with local single-flight to prevent thundering herd.
    """

    def __init__(self, redis_client: redis.Redis, default_ttl: int = 300):
        self.redis = redis_client
        self.default_ttl = default_ttl
        self._single_flight = LocalSingleFlight()

    def get_or_compute(
        self,
        key: str,
        compute_fn: Callable[[], Any],
        ttl: int = None
    ) -> Any:
        """
        Get value from cache or compute if missing.
        Concurrent cache misses are coalesced.
        """
        # Try cache first
        value = self.redis.get(key)
        if value is not None:
            return value

        # Cache miss - use single-flight to prevent duplicate computation
        def fetch_and_cache():
            # Double-check cache (might have been populated while waiting)
            value = self.redis.get(key)
            if value is not None:
                return value

            # Compute the value
            result = compute_fn()

            # Store in cache
            cache_ttl = ttl or self.default_ttl
            self.redis.setex(key, cache_ttl, result)

            return result

        return self._single_flight.do(key, fetch_and_cache)

    def get_many_or_compute(
        self,
        keys: list,
        compute_fn: Callable[[list], dict],
        ttl: int = None
    ) -> dict:
        """
        Get multiple values, computing missing ones in batch.
        """
        # Check cache for all keys
        cached_values = self.redis.mget(*keys)

        results = {}
        missing_keys = []

        for key, value in zip(keys, cached_values):
            if value is not None:
                results[key] = value
            else:
                missing_keys.append(key)

        if not missing_keys:
            return results

        # Compute missing keys with single-flight
        def fetch_missing():
            # Double-check what's still missing
            still_missing = []
            rechecked = self.redis.mget(*missing_keys)
            for key, value in zip(missing_keys, rechecked):
                if value is not None:
                    results[key] = value
                else:
                    still_missing.append(key)

            if not still_missing:
                return {}

            # Compute missing values
            computed = compute_fn(still_missing)

            # Store in cache
            cache_ttl = ttl or self.default_ttl
            pipe = self.redis.pipeline()
            for key, value in computed.items():
                pipe.setex(key, cache_ttl, value)
            pipe.execute()

            return computed

        # Use hash of missing keys as single-flight key
        sf_key = hashlib.md5(':'.join(sorted(missing_keys)).encode()).hexdigest()
        computed = self._single_flight.do(sf_key, fetch_missing)
        results.update(computed)

        return results


# Usage
client = redis.Redis(decode_responses=True)
cache = SingleFlightCache(client, default_ttl=60)

def expensive_computation():
    print("Computing...")
    time.sleep(0.5)  # Simulate expensive operation
    return "computed_value"

# Multiple concurrent requests for the same key
import concurrent.futures

def make_request():
    return cache.get_or_compute('expensive_key', expensive_computation)

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    futures = [executor.submit(make_request) for _ in range(10)]
    results = [f.result() for f in concurrent.futures.as_completed(futures)]

print(f"Results: {results}")
# "Computing..." is printed only once!
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');

/**
 * Single-flight implementation for Node.js
 * Prevents duplicate concurrent async operations for the same key
 */
class SingleFlight {
    constructor() {
        this.pending = new Map();
    }

    /**
     * Execute fn() with deduplication of concurrent calls
     */
    async do(key, fn) {
        // Check if there's already a pending request for this key
        if (this.pending.has(key)) {
            // Wait for the existing request
            return this.pending.get(key);
        }

        // Create the promise for this request
        const promise = (async () => {
            try {
                return await fn();
            } finally {
                this.pending.delete(key);
            }
        })();

        // Store the promise for other concurrent calls
        this.pending.set(key, promise);

        return promise;
    }

    /**
     * Check if a request is in flight
     */
    isInFlight(key) {
        return this.pending.has(key);
    }
}

/**
 * Redis cache with single-flight support
 */
class SingleFlightCache {
    constructor(redis, options = {}) {
        this.redis = redis;
        this.defaultTTL = options.defaultTTL || 300;
        this.singleFlight = new SingleFlight();
    }

    /**
     * Get value from cache or compute if missing
     */
    async getOrCompute(key, computeFn, ttl = null) {
        // Try cache first
        const cached = await this.redis.get(key);
        if (cached !== null) {
            return cached;
        }

        // Use single-flight for cache miss
        return this.singleFlight.do(key, async () => {
            // Double-check cache
            const rechecked = await this.redis.get(key);
            if (rechecked !== null) {
                return rechecked;
            }

            // Compute value
            const value = await computeFn();

            // Store in cache
            const cacheTTL = ttl || this.defaultTTL;
            await this.redis.setex(key, cacheTTL, value);

            return value;
        });
    }

    /**
     * Get multiple values with batch computation for missing keys
     */
    async getManyOrCompute(keys, computeFn, ttl = null) {
        // Check cache for all keys
        const cachedValues = await this.redis.mget(...keys);

        const results = {};
        const missingKeys = [];

        keys.forEach((key, index) => {
            if (cachedValues[index] !== null) {
                results[key] = cachedValues[index];
            } else {
                missingKeys.push(key);
            }
        });

        if (missingKeys.length === 0) {
            return results;
        }

        // Single-flight key based on missing keys
        const sfKey = `batch:${missingKeys.sort().join(':')}`;

        const computed = await this.singleFlight.do(sfKey, async () => {
            // Double-check what's still missing
            const rechecked = await this.redis.mget(...missingKeys);
            const stillMissing = [];

            missingKeys.forEach((key, index) => {
                if (rechecked[index] !== null) {
                    results[key] = rechecked[index];
                } else {
                    stillMissing.push(key);
                }
            });

            if (stillMissing.length === 0) {
                return {};
            }

            // Compute missing values
            const computedValues = await computeFn(stillMissing);

            // Store in cache
            const cacheTTL = ttl || this.defaultTTL;
            const pipeline = this.redis.pipeline();
            for (const [key, value] of Object.entries(computedValues)) {
                pipeline.setex(key, cacheTTL, value);
            }
            await pipeline.exec();

            return computedValues;
        });

        Object.assign(results, computed);
        return results;
    }
}

// Usage example
async function main() {
    const redis = new Redis();
    const cache = new SingleFlightCache(redis, { defaultTTL: 60 });

    let computeCount = 0;

    async function expensiveComputation() {
        computeCount++;
        console.log(`Computing... (call #${computeCount})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'computed_value';
    }

    // Simulate 10 concurrent requests
    const promises = Array(10).fill(null).map(() =>
        cache.getOrCompute('expensive_key', expensiveComputation)
    );

    const results = await Promise.all(promises);

    console.log(`Results: ${results.length} responses`);
    console.log(`Compute was called ${computeCount} time(s)`);
    // Output: Compute was called 1 time(s)

    await redis.quit();
}

main().catch(console.error);
```

## Distributed Request Coalescing

For multi-instance deployments, local single-flight isn't enough. We need distributed coordination.

### Using Redis Locks

```python
import redis
import time
import uuid
from typing import Any, Callable, Optional
import threading

class DistributedSingleFlight:
    """
    Distributed single-flight using Redis locks.
    Works across multiple application instances.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        lock_timeout: int = 10,
        wait_timeout: int = 15,
        poll_interval: float = 0.05
    ):
        self.redis = redis_client
        self.lock_timeout = lock_timeout
        self.wait_timeout = wait_timeout
        self.poll_interval = poll_interval

    def _lock_key(self, key: str) -> str:
        return f"singleflight:lock:{key}"

    def _result_key(self, key: str) -> str:
        return f"singleflight:result:{key}"

    def do(
        self,
        key: str,
        fn: Callable[[], Any],
        result_ttl: int = 5
    ) -> Any:
        """
        Execute fn() with distributed deduplication.

        Args:
            key: Unique key for this operation
            fn: Function to execute
            result_ttl: How long to keep result for waiting clients
        """
        lock_key = self._lock_key(key)
        result_key = self._result_key(key)
        lock_value = str(uuid.uuid4())

        # Try to acquire lock
        acquired = self.redis.set(
            lock_key,
            lock_value,
            nx=True,
            ex=self.lock_timeout
        )

        if acquired:
            # We got the lock - execute the function
            try:
                result = fn()

                # Store result for waiting clients
                self.redis.setex(result_key, result_ttl, self._serialize(result))

                return result
            except Exception as e:
                # Store error for waiting clients
                self.redis.setex(
                    result_key,
                    result_ttl,
                    self._serialize({'__error__': str(e)})
                )
                raise
            finally:
                # Release lock (only if we still own it)
                self._release_lock(lock_key, lock_value)
        else:
            # Another instance has the lock - wait for result
            return self._wait_for_result(key)

    def _wait_for_result(self, key: str) -> Any:
        """Wait for another instance to compute the result."""
        result_key = self._result_key(key)
        lock_key = self._lock_key(key)
        deadline = time.time() + self.wait_timeout

        while time.time() < deadline:
            # Check for result
            result = self.redis.get(result_key)
            if result:
                data = self._deserialize(result)
                if isinstance(data, dict) and '__error__' in data:
                    raise Exception(data['__error__'])
                return data

            # Check if lock was released (computation might have failed)
            if not self.redis.exists(lock_key):
                # Lock released but no result - something went wrong
                # Let this instance try
                raise Exception("Computation failed on another instance")

            time.sleep(self.poll_interval)

        raise TimeoutError(f"Timeout waiting for result for key: {key}")

    def _release_lock(self, lock_key: str, lock_value: str):
        """Release lock only if we still own it (compare-and-delete)."""
        lua_script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        """
        self.redis.eval(lua_script, 1, lock_key, lock_value)

    def _serialize(self, value: Any) -> str:
        """Serialize value for storage."""
        import json
        return json.dumps(value)

    def _deserialize(self, data: str) -> Any:
        """Deserialize stored value."""
        import json
        return json.loads(data)


class DistributedCache:
    """
    Distributed cache with request coalescing across instances.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        default_ttl: int = 300,
        lock_timeout: int = 10
    ):
        self.redis = redis_client
        self.default_ttl = default_ttl
        self.single_flight = DistributedSingleFlight(
            redis_client,
            lock_timeout=lock_timeout
        )

    def get_or_compute(
        self,
        key: str,
        compute_fn: Callable[[], Any],
        ttl: int = None
    ) -> Any:
        """
        Get value from cache or compute if missing.
        Coalesces concurrent requests across all instances.
        """
        # Check cache first
        value = self.redis.get(key)
        if value is not None:
            return value

        # Use distributed single-flight for cache miss
        def fetch_and_cache():
            # Double-check cache
            value = self.redis.get(key)
            if value is not None:
                return value

            # Compute
            result = compute_fn()

            # Cache
            cache_ttl = ttl or self.default_ttl
            self.redis.setex(key, cache_ttl, result)

            return result

        return self.single_flight.do(f"cache:{key}", fetch_and_cache)


# Usage
client = redis.Redis(decode_responses=True)
cache = DistributedCache(client)

def expensive_db_query():
    print(f"Executing expensive query...")
    time.sleep(1)
    return "query_result"

# Works across multiple application instances
result = cache.get_or_compute('user:1001:profile', expensive_db_query)
print(f"Result: {result}")
```

### Using Redis Pub/Sub for Notification

```python
import redis
import threading
import time
import json
import uuid
from typing import Any, Callable, Dict
from dataclasses import dataclass

@dataclass
class WaitingRequest:
    event: threading.Event
    result: Any = None
    error: str = None

class PubSubSingleFlight:
    """
    Single-flight using Pub/Sub for result notification.
    More efficient than polling for high-concurrency scenarios.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        lock_timeout: int = 10,
        wait_timeout: int = 15
    ):
        self.redis = redis_client
        self.lock_timeout = lock_timeout
        self.wait_timeout = wait_timeout

        # Waiting requests
        self._waiting: Dict[str, WaitingRequest] = {}
        self._lock = threading.Lock()

        # Start subscriber thread
        self._pubsub = self.redis.pubsub()
        self._running = True
        self._subscriber_thread = threading.Thread(
            target=self._subscriber_loop,
            daemon=True
        )
        self._subscriber_thread.start()

    def _channel_name(self, key: str) -> str:
        return f"singleflight:result:{key}"

    def _lock_key(self, key: str) -> str:
        return f"singleflight:lock:{key}"

    def _subscriber_loop(self):
        """Background thread to receive result notifications."""
        self._pubsub.psubscribe('singleflight:result:*')

        while self._running:
            message = self._pubsub.get_message(timeout=1)
            if message and message['type'] == 'pmessage':
                channel = message['channel']
                if isinstance(channel, bytes):
                    channel = channel.decode()

                key = channel.replace('singleflight:result:', '')
                data = json.loads(message['data'])

                with self._lock:
                    if key in self._waiting:
                        waiting = self._waiting[key]
                        if 'error' in data:
                            waiting.error = data['error']
                        else:
                            waiting.result = data['result']
                        waiting.event.set()

    def do(self, key: str, fn: Callable[[], Any]) -> Any:
        """Execute fn() with distributed deduplication."""
        lock_key = self._lock_key(key)
        lock_value = str(uuid.uuid4())

        # Try to acquire lock
        acquired = self.redis.set(
            lock_key,
            lock_value,
            nx=True,
            ex=self.lock_timeout
        )

        if acquired:
            # We got the lock - execute
            try:
                result = fn()

                # Publish result
                self.redis.publish(
                    self._channel_name(key),
                    json.dumps({'result': result})
                )

                return result

            except Exception as e:
                # Publish error
                self.redis.publish(
                    self._channel_name(key),
                    json.dumps({'error': str(e)})
                )
                raise

            finally:
                # Release lock
                self._release_lock(lock_key, lock_value)
        else:
            # Wait for result via Pub/Sub
            return self._wait_for_result(key)

    def _wait_for_result(self, key: str) -> Any:
        """Wait for result notification via Pub/Sub."""
        waiting = WaitingRequest(event=threading.Event())

        with self._lock:
            self._waiting[key] = waiting

        try:
            # Wait for notification
            if waiting.event.wait(timeout=self.wait_timeout):
                if waiting.error:
                    raise Exception(waiting.error)
                return waiting.result
            else:
                raise TimeoutError(f"Timeout waiting for {key}")
        finally:
            with self._lock:
                self._waiting.pop(key, None)

    def _release_lock(self, lock_key: str, lock_value: str):
        """Release lock if we still own it."""
        lua_script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        """
        self.redis.eval(lua_script, 1, lock_key, lock_value)

    def close(self):
        """Clean up resources."""
        self._running = False
        self._pubsub.close()
        self._subscriber_thread.join(timeout=5)


# Usage
client = redis.Redis(decode_responses=True)
sf = PubSubSingleFlight(client)

def expensive_operation():
    time.sleep(0.5)
    return "expensive_result"

# Multiple threads calling concurrently
results = []
threads = []

for i in range(10):
    def make_request():
        result = sf.do('expensive_op', expensive_operation)
        results.append(result)

    t = threading.Thread(target=make_request)
    threads.append(t)
    t.start()

for t in threads:
    t.join()

print(f"All results: {results}")
sf.close()
```

## Semaphore-Based Coalescing

Limit concurrent computations while allowing some parallelism.

```python
import redis
import time
import uuid
from typing import Callable, Any

class SemaphoreCoalescing:
    """
    Semaphore-based coalescing that allows limited concurrent computations.
    Useful when you want some parallelism but want to limit load.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        max_concurrent: int = 1,
        wait_timeout: int = 30
    ):
        self.redis = redis_client
        self.max_concurrent = max_concurrent
        self.wait_timeout = wait_timeout

    def _semaphore_key(self, key: str) -> str:
        return f"semaphore:{key}"

    def _token_key(self, key: str, token: str) -> str:
        return f"semaphore:{key}:token:{token}"

    def acquire(self, key: str) -> str:
        """
        Try to acquire a slot in the semaphore.
        Returns a token if acquired, None if semaphore is full.
        """
        sem_key = self._semaphore_key(key)
        token = str(uuid.uuid4())
        now = time.time()

        # Lua script for atomic acquire
        lua_script = """
        local sem_key = KEYS[1]
        local max_concurrent = tonumber(ARGV[1])
        local token = ARGV[2]
        local now = tonumber(ARGV[3])
        local timeout = tonumber(ARGV[4])

        -- Remove expired tokens
        redis.call('ZREMRANGEBYSCORE', sem_key, '-inf', now - timeout)

        -- Check current count
        local count = redis.call('ZCARD', sem_key)

        if count < max_concurrent then
            -- Add our token
            redis.call('ZADD', sem_key, now, token)
            return token
        else
            return nil
        end
        """

        result = self.redis.eval(
            lua_script, 1, sem_key,
            self.max_concurrent, token, now, self.wait_timeout
        )

        return result

    def release(self, key: str, token: str):
        """Release a semaphore slot."""
        sem_key = self._semaphore_key(key)
        self.redis.zrem(sem_key, token)

    def do(
        self,
        key: str,
        fn: Callable[[], Any],
        poll_interval: float = 0.1
    ) -> Any:
        """
        Execute fn() with semaphore-based concurrency limit.
        """
        deadline = time.time() + self.wait_timeout
        token = None

        while time.time() < deadline:
            token = self.acquire(key)
            if token:
                break
            time.sleep(poll_interval)

        if not token:
            raise TimeoutError(f"Timeout acquiring semaphore for {key}")

        try:
            return fn()
        finally:
            self.release(key, token)


class CoalescingCache:
    """
    Cache with semaphore-based coalescing for controlled parallelism.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        default_ttl: int = 300,
        max_concurrent_per_key: int = 1
    ):
        self.redis = redis_client
        self.default_ttl = default_ttl
        self.semaphore = SemaphoreCoalescing(
            redis_client,
            max_concurrent=max_concurrent_per_key
        )

    def get_or_compute(
        self,
        key: str,
        compute_fn: Callable[[], Any],
        ttl: int = None
    ) -> Any:
        """Get from cache or compute with controlled concurrency."""
        # Check cache first
        value = self.redis.get(key)
        if value is not None:
            return value

        # Use semaphore for cache miss
        def fetch_and_cache():
            # Double-check cache
            value = self.redis.get(key)
            if value is not None:
                return value

            # Compute and cache
            result = compute_fn()
            cache_ttl = ttl or self.default_ttl
            self.redis.setex(key, cache_ttl, result)
            return result

        return self.semaphore.do(f"cache:{key}", fetch_and_cache)


# Usage with higher concurrency limit
client = redis.Redis(decode_responses=True)

# Allow up to 3 concurrent computations per key
cache = CoalescingCache(client, max_concurrent_per_key=3)

def database_query(user_id):
    time.sleep(0.1)
    return f"data_for_{user_id}"

# Multiple requests will be limited to 3 concurrent computations
import concurrent.futures

with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    futures = [
        executor.submit(
            cache.get_or_compute,
            'popular_data',
            lambda: database_query('popular')
        )
        for _ in range(20)
    ]
    results = [f.result() for f in futures]

print(f"Completed {len(results)} requests")
```

## Node.js Distributed Implementation

```javascript
const Redis = require('ioredis');
const crypto = require('crypto');

/**
 * Distributed single-flight for Node.js
 */
class DistributedSingleFlight {
    constructor(redis, options = {}) {
        this.redis = redis;
        this.lockTimeout = options.lockTimeout || 10;
        this.waitTimeout = options.waitTimeout || 15;
        this.pollInterval = options.pollInterval || 50;
    }

    lockKey(key) {
        return `singleflight:lock:${key}`;
    }

    resultKey(key) {
        return `singleflight:result:${key}`;
    }

    /**
     * Execute fn with distributed deduplication
     */
    async do(key, fn, resultTTL = 5) {
        const lockKey = this.lockKey(key);
        const resultKey = this.resultKey(key);
        const lockValue = crypto.randomUUID();

        // Try to acquire lock
        const acquired = await this.redis.set(
            lockKey,
            lockValue,
            'NX',
            'EX',
            this.lockTimeout
        );

        if (acquired) {
            // We got the lock - execute
            try {
                const result = await fn();

                // Store result for waiting clients
                await this.redis.setex(
                    resultKey,
                    resultTTL,
                    JSON.stringify({ result })
                );

                return result;
            } catch (err) {
                // Store error
                await this.redis.setex(
                    resultKey,
                    resultTTL,
                    JSON.stringify({ error: err.message })
                );
                throw err;
            } finally {
                // Release lock
                await this.releaseLock(lockKey, lockValue);
            }
        } else {
            // Wait for result
            return this.waitForResult(key);
        }
    }

    async waitForResult(key) {
        const resultKey = this.resultKey(key);
        const lockKey = this.lockKey(key);
        const deadline = Date.now() + this.waitTimeout * 1000;

        while (Date.now() < deadline) {
            const result = await this.redis.get(resultKey);
            if (result) {
                const data = JSON.parse(result);
                if (data.error) {
                    throw new Error(data.error);
                }
                return data.result;
            }

            // Check if lock still exists
            const lockExists = await this.redis.exists(lockKey);
            if (!lockExists) {
                throw new Error('Computation failed on another instance');
            }

            await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        }

        throw new Error(`Timeout waiting for result: ${key}`);
    }

    async releaseLock(lockKey, lockValue) {
        const script = `
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
        `;
        await this.redis.eval(script, 1, lockKey, lockValue);
    }
}

/**
 * Distributed cache with request coalescing
 */
class DistributedCache {
    constructor(redis, options = {}) {
        this.redis = redis;
        this.defaultTTL = options.defaultTTL || 300;
        this.singleFlight = new DistributedSingleFlight(redis, options);
    }

    async getOrCompute(key, computeFn, ttl = null) {
        // Check cache
        const cached = await this.redis.get(key);
        if (cached !== null) {
            return cached;
        }

        // Use single-flight
        return this.singleFlight.do(`cache:${key}`, async () => {
            // Double-check
            const rechecked = await this.redis.get(key);
            if (rechecked !== null) {
                return rechecked;
            }

            // Compute
            const result = await computeFn();

            // Cache
            const cacheTTL = ttl || this.defaultTTL;
            await this.redis.setex(key, cacheTTL, result);

            return result;
        });
    }
}

// Usage
async function main() {
    const redis = new Redis();
    const cache = new DistributedCache(redis, {
        defaultTTL: 60,
        lockTimeout: 10
    });

    let computeCount = 0;

    async function expensiveQuery() {
        computeCount++;
        console.log(`Computing... (${computeCount})`);
        await new Promise(r => setTimeout(r, 500));
        return 'expensive_result';
    }

    // Simulate concurrent requests (even from different instances)
    const promises = Array(10).fill(null).map(() =>
        cache.getOrCompute('shared_key', expensiveQuery)
    );

    await Promise.all(promises);
    console.log(`Total computations: ${computeCount}`);

    await redis.quit();
}

main().catch(console.error);
```

## Best Practices

### Configuration Guidelines

```python
"""
Request coalescing configuration best practices
"""

COALESCING_CONFIG = {
    # Lock timeout - should be longer than expected computation time
    'lock_timeout_seconds': 10,

    # Wait timeout - how long waiters will wait for result
    'wait_timeout_seconds': 15,

    # Poll interval for checking results (lower = more responsive, more Redis calls)
    'poll_interval_ms': 50,

    # Result TTL - how long to keep result for late arrivals
    'result_ttl_seconds': 5,

    # Semaphore max concurrent - for controlled parallelism
    'max_concurrent_per_key': 1,

    # Local cache TTL - for hybrid local + distributed caching
    'local_cache_ttl_seconds': 1
}

# Anti-patterns to avoid
ANTI_PATTERNS = [
    "Lock timeout shorter than computation time",
    "No double-check after acquiring lock",
    "Not handling lock holder failures",
    "Using blocking waits without timeout",
    "Not cleaning up expired locks/results"
]
```

### Monitoring

```python
import redis
import time
from typing import Dict

class CoalescingMetrics:
    """Monitor request coalescing effectiveness."""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self._metrics_key = "coalescing:metrics"

    def record_hit(self, key: str):
        """Record a cache hit (no coalescing needed)."""
        self.redis.hincrby(self._metrics_key, 'cache_hits', 1)

    def record_compute(self, key: str):
        """Record a computation (acquired lock)."""
        self.redis.hincrby(self._metrics_key, 'computes', 1)

    def record_wait(self, key: str):
        """Record a coalesced wait."""
        self.redis.hincrby(self._metrics_key, 'coalesced_waits', 1)

    def record_timeout(self, key: str):
        """Record a timeout while waiting."""
        self.redis.hincrby(self._metrics_key, 'timeouts', 1)

    def get_metrics(self) -> Dict:
        """Get current metrics."""
        raw = self.redis.hgetall(self._metrics_key)

        metrics = {k: int(v) for k, v in raw.items()}

        total_requests = (
            metrics.get('cache_hits', 0) +
            metrics.get('computes', 0) +
            metrics.get('coalesced_waits', 0)
        )

        if total_requests > 0:
            metrics['cache_hit_rate'] = metrics.get('cache_hits', 0) / total_requests
            metrics['coalesce_rate'] = metrics.get('coalesced_waits', 0) / total_requests
            metrics['compute_rate'] = metrics.get('computes', 0) / total_requests

        return metrics

    def reset_metrics(self):
        """Reset metrics."""
        self.redis.delete(self._metrics_key)


# Usage
client = redis.Redis(decode_responses=True)
metrics = CoalescingMetrics(client)

# After some traffic
print(metrics.get_metrics())
# Example output:
# {
#     'cache_hits': 8500,
#     'computes': 100,
#     'coalesced_waits': 1400,
#     'timeouts': 0,
#     'cache_hit_rate': 0.85,
#     'coalesce_rate': 0.14,
#     'compute_rate': 0.01
# }
```

## Summary

Request coalescing is essential for handling cache stampedes:

1. **Local Single-Flight** - Deduplicate within a single process
2. **Distributed Locks** - Coordinate across multiple instances
3. **Pub/Sub Notification** - Efficient result distribution
4. **Semaphore-Based** - Controlled parallelism

Key implementation points:
- Always double-check cache after acquiring lock
- Handle lock holder failures gracefully
- Use appropriate timeouts
- Monitor coalescing effectiveness
- Consider hybrid local + distributed approaches

Request coalescing combined with proper cache TTL management provides robust protection against the thundering herd problem while maintaining high performance.
