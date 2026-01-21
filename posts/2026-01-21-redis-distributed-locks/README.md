# How to Implement Distributed Locks with Redis (Redlock)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Distributed Locks, Redlock, Concurrency, Distributed Systems, Mutex

Description: A comprehensive guide to implementing distributed locks with Redis using the Redlock algorithm, including lock safety, automatic expiration, and production-ready patterns for preventing race conditions.

---

Distributed locks are essential for coordinating access to shared resources across multiple processes or servers. Redis provides an excellent foundation for implementing distributed locks with its atomic operations and key expiration. This guide covers single-instance locks, the Redlock algorithm for fault-tolerant locking, and production best practices.

## Why Distributed Locks?

In distributed systems, you need locks when:

- Multiple workers process the same job queue
- Cron jobs run across multiple instances
- Database migrations need single execution
- Inventory updates require serialization
- Payment processing needs idempotency

## Basic Redis Lock

A simple lock using SET with NX and EX options:

```python
import redis
import uuid
import time
from typing import Optional
from contextlib import contextmanager

class SimpleRedisLock:
    """Basic distributed lock using a single Redis instance."""

    def __init__(self, redis_url='redis://localhost:6379'):
        self.redis = redis.from_url(redis_url, decode_responses=True)

    def acquire(self, lock_name: str, timeout: int = 10,
                blocking: bool = True, retry_delay: float = 0.1) -> Optional[str]:
        """
        Acquire a lock.

        Args:
            lock_name: Name of the lock
            timeout: Lock expiration in seconds
            blocking: Wait for lock if not available
            retry_delay: Delay between retries

        Returns:
            Lock token if acquired, None otherwise
        """
        token = str(uuid.uuid4())
        lock_key = f"lock:{lock_name}"

        end_time = time.time() + timeout if blocking else time.time()

        while time.time() < end_time:
            # SET lock_key token NX EX timeout
            if self.redis.set(lock_key, token, nx=True, ex=timeout):
                return token

            if not blocking:
                return None

            time.sleep(retry_delay)

        return None

    def release(self, lock_name: str, token: str) -> bool:
        """
        Release a lock.

        Args:
            lock_name: Name of the lock
            token: Token returned by acquire()

        Returns:
            True if lock was released, False otherwise
        """
        lock_key = f"lock:{lock_name}"

        # Lua script for atomic check-and-delete
        lua_script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        """

        result = self.redis.eval(lua_script, 1, lock_key, token)
        return bool(result)

    def extend(self, lock_name: str, token: str, timeout: int) -> bool:
        """Extend lock expiration."""
        lock_key = f"lock:{lock_name}"

        lua_script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('expire', KEYS[1], ARGV[2])
        else
            return 0
        end
        """

        result = self.redis.eval(lua_script, 1, lock_key, token, timeout)
        return bool(result)

    @contextmanager
    def lock(self, lock_name: str, timeout: int = 10,
             blocking: bool = True):
        """Context manager for lock acquisition."""
        token = self.acquire(lock_name, timeout, blocking)
        if token is None:
            raise LockError(f"Could not acquire lock: {lock_name}")

        try:
            yield token
        finally:
            self.release(lock_name, token)


class LockError(Exception):
    """Exception raised when lock operations fail."""
    pass
```

## Redlock Algorithm

For fault-tolerant locking across multiple Redis instances:

```python
import redis
import uuid
import time
from typing import List, Optional, Tuple
from dataclasses import dataclass
import threading

@dataclass
class LockResult:
    acquired: bool
    token: str
    validity_time: float  # Remaining time in seconds

class Redlock:
    """
    Redlock distributed lock implementation.

    Uses N Redis instances (recommended: 5) for fault-tolerant locking.
    """

    def __init__(self, redis_urls: List[str], retry_count: int = 3,
                 retry_delay: float = 0.2, drift_factor: float = 0.01):
        """
        Initialize Redlock.

        Args:
            redis_urls: List of Redis URLs (e.g., ['redis://host1:6379', ...])
            retry_count: Number of acquisition retries
            retry_delay: Delay between retries in seconds
            drift_factor: Clock drift factor (0.01 = 1%)
        """
        self.instances = [
            redis.from_url(url, decode_responses=True)
            for url in redis_urls
        ]
        self.quorum = len(self.instances) // 2 + 1
        self.retry_count = retry_count
        self.retry_delay = retry_delay
        self.drift_factor = drift_factor

        # Lua scripts
        self._release_script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        """

        self._extend_script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('pexpire', KEYS[1], ARGV[2])
        else
            return 0
        end
        """

    def _lock_instance(self, instance: redis.Redis, lock_key: str,
                       token: str, ttl_ms: int) -> bool:
        """Try to acquire lock on a single instance."""
        try:
            return bool(instance.set(lock_key, token, nx=True, px=ttl_ms))
        except redis.RedisError:
            return False

    def _unlock_instance(self, instance: redis.Redis, lock_key: str,
                         token: str) -> bool:
        """Release lock on a single instance."""
        try:
            return bool(instance.eval(self._release_script, 1, lock_key, token))
        except redis.RedisError:
            return False

    def acquire(self, lock_name: str, ttl_ms: int = 10000) -> LockResult:
        """
        Acquire a distributed lock.

        Args:
            lock_name: Name of the lock
            ttl_ms: Lock time-to-live in milliseconds

        Returns:
            LockResult with acquisition status and validity time
        """
        token = str(uuid.uuid4())
        lock_key = f"redlock:{lock_name}"
        drift = int(ttl_ms * self.drift_factor) + 2  # Add 2ms for safety

        for attempt in range(self.retry_count):
            n_acquired = 0
            start_time = time.time() * 1000  # Convert to ms

            # Try to acquire lock on all instances
            for instance in self.instances:
                if self._lock_instance(instance, lock_key, token, ttl_ms):
                    n_acquired += 1

            # Calculate validity time
            elapsed = (time.time() * 1000) - start_time
            validity_time = ttl_ms - elapsed - drift

            # Check if we acquired quorum with positive validity
            if n_acquired >= self.quorum and validity_time > 0:
                return LockResult(
                    acquired=True,
                    token=token,
                    validity_time=validity_time / 1000  # Convert to seconds
                )

            # Failed to acquire, release any locks we got
            for instance in self.instances:
                self._unlock_instance(instance, lock_key, token)

            # Wait before retry
            if attempt < self.retry_count - 1:
                time.sleep(self.retry_delay + (self.retry_delay * 0.5 *
                          (2 ** attempt)))  # Exponential backoff

        return LockResult(acquired=False, token=token, validity_time=0)

    def release(self, lock_name: str, token: str) -> bool:
        """Release a distributed lock."""
        lock_key = f"redlock:{lock_name}"

        released_count = 0
        for instance in self.instances:
            if self._unlock_instance(instance, lock_key, token):
                released_count += 1

        return released_count > 0

    def extend(self, lock_name: str, token: str, ttl_ms: int) -> LockResult:
        """Extend lock validity time."""
        lock_key = f"redlock:{lock_name}"
        drift = int(ttl_ms * self.drift_factor) + 2

        n_extended = 0
        start_time = time.time() * 1000

        for instance in self.instances:
            try:
                if instance.eval(self._extend_script, 1, lock_key, token, ttl_ms):
                    n_extended += 1
            except redis.RedisError:
                pass

        elapsed = (time.time() * 1000) - start_time
        validity_time = ttl_ms - elapsed - drift

        if n_extended >= self.quorum and validity_time > 0:
            return LockResult(
                acquired=True,
                token=token,
                validity_time=validity_time / 1000
            )

        return LockResult(acquired=False, token=token, validity_time=0)


class RedlockWithAutoExtend:
    """Redlock with automatic extension for long-running tasks."""

    def __init__(self, redlock: Redlock):
        self.redlock = redlock
        self._extend_threads = {}
        self._stop_events = {}

    def acquire(self, lock_name: str, ttl_ms: int = 10000,
                auto_extend: bool = True) -> LockResult:
        """Acquire lock with optional auto-extension."""
        result = self.redlock.acquire(lock_name, ttl_ms)

        if result.acquired and auto_extend:
            self._start_extend_thread(lock_name, result.token, ttl_ms)

        return result

    def release(self, lock_name: str, token: str) -> bool:
        """Release lock and stop auto-extension."""
        self._stop_extend_thread(lock_name)
        return self.redlock.release(lock_name, token)

    def _start_extend_thread(self, lock_name: str, token: str, ttl_ms: int):
        """Start background thread to extend lock."""
        stop_event = threading.Event()
        self._stop_events[lock_name] = stop_event

        def extend_loop():
            extend_interval = ttl_ms / 3000  # Extend at 1/3 of TTL
            while not stop_event.wait(extend_interval):
                result = self.redlock.extend(lock_name, token, ttl_ms)
                if not result.acquired:
                    break

        thread = threading.Thread(target=extend_loop, daemon=True)
        thread.start()
        self._extend_threads[lock_name] = thread

    def _stop_extend_thread(self, lock_name: str):
        """Stop the extension thread."""
        if lock_name in self._stop_events:
            self._stop_events[lock_name].set()
            del self._stop_events[lock_name]
        if lock_name in self._extend_threads:
            del self._extend_threads[lock_name]
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class SimpleRedisLock {
    constructor(redisUrl = 'redis://localhost:6379') {
        this.redis = new Redis(redisUrl);

        this.releaseScript = `
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        `;

        this.extendScript = `
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('pexpire', KEYS[1], ARGV[2])
        else
            return 0
        end
        `;
    }

    async acquire(lockName, options = {}) {
        const {
            timeout = 10000,
            blocking = true,
            retryDelay = 100
        } = options;

        const token = uuidv4();
        const lockKey = `lock:${lockName}`;
        const endTime = blocking ? Date.now() + timeout : Date.now();

        while (Date.now() < endTime) {
            const acquired = await this.redis.set(
                lockKey, token, 'NX', 'PX', timeout
            );

            if (acquired === 'OK') {
                return token;
            }

            if (!blocking) {
                return null;
            }

            await new Promise(r => setTimeout(r, retryDelay));
        }

        return null;
    }

    async release(lockName, token) {
        const lockKey = `lock:${lockName}`;
        const result = await this.redis.eval(
            this.releaseScript, 1, lockKey, token
        );
        return result === 1;
    }

    async extend(lockName, token, ttlMs) {
        const lockKey = `lock:${lockName}`;
        const result = await this.redis.eval(
            this.extendScript, 1, lockKey, token, ttlMs
        );
        return result === 1;
    }

    async withLock(lockName, callback, options = {}) {
        const token = await this.acquire(lockName, options);
        if (!token) {
            throw new Error(`Could not acquire lock: ${lockName}`);
        }

        try {
            return await callback();
        } finally {
            await this.release(lockName, token);
        }
    }

    async close() {
        await this.redis.quit();
    }
}

class Redlock {
    constructor(redisUrls, options = {}) {
        this.instances = redisUrls.map(url => new Redis(url));
        this.quorum = Math.floor(this.instances.length / 2) + 1;
        this.retryCount = options.retryCount || 3;
        this.retryDelay = options.retryDelay || 200;
        this.driftFactor = options.driftFactor || 0.01;

        this.releaseScript = `
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        `;
    }

    async _lockInstance(instance, lockKey, token, ttlMs) {
        try {
            const result = await instance.set(lockKey, token, 'NX', 'PX', ttlMs);
            return result === 'OK';
        } catch {
            return false;
        }
    }

    async _unlockInstance(instance, lockKey, token) {
        try {
            const result = await instance.eval(this.releaseScript, 1, lockKey, token);
            return result === 1;
        } catch {
            return false;
        }
    }

    async acquire(lockName, ttlMs = 10000) {
        const token = uuidv4();
        const lockKey = `redlock:${lockName}`;
        const drift = Math.floor(ttlMs * this.driftFactor) + 2;

        for (let attempt = 0; attempt < this.retryCount; attempt++) {
            let acquired = 0;
            const startTime = Date.now();

            const results = await Promise.all(
                this.instances.map(instance =>
                    this._lockInstance(instance, lockKey, token, ttlMs)
                )
            );

            acquired = results.filter(Boolean).length;
            const elapsed = Date.now() - startTime;
            const validityTime = ttlMs - elapsed - drift;

            if (acquired >= this.quorum && validityTime > 0) {
                return {
                    acquired: true,
                    token,
                    validityTime: validityTime / 1000
                };
            }

            // Release any locks we acquired
            await Promise.all(
                this.instances.map(instance =>
                    this._unlockInstance(instance, lockKey, token)
                )
            );

            if (attempt < this.retryCount - 1) {
                const delay = this.retryDelay + Math.random() * this.retryDelay;
                await new Promise(r => setTimeout(r, delay));
            }
        }

        return { acquired: false, token, validityTime: 0 };
    }

    async release(lockName, token) {
        const lockKey = `redlock:${lockName}`;
        const results = await Promise.all(
            this.instances.map(instance =>
                this._unlockInstance(instance, lockKey, token)
            )
        );
        return results.some(Boolean);
    }

    async close() {
        await Promise.all(this.instances.map(i => i.quit()));
    }
}

// Usage example
async function main() {
    // Single instance lock
    const lock = new SimpleRedisLock();

    const token = await lock.acquire('my-resource', { timeout: 5000 });
    if (token) {
        try {
            console.log('Lock acquired, doing work...');
            await new Promise(r => setTimeout(r, 1000));
        } finally {
            await lock.release('my-resource', token);
            console.log('Lock released');
        }
    }

    // Using withLock helper
    await lock.withLock('my-resource', async () => {
        console.log('Inside lock');
        await new Promise(r => setTimeout(r, 500));
    });

    await lock.close();
}

main().catch(console.error);
```

## Common Use Cases

### Database Migration Lock

```python
def run_migrations():
    """Run database migrations with distributed lock."""
    redlock = Redlock(['redis://redis1:6379', 'redis://redis2:6379',
                       'redis://redis3:6379'])

    result = redlock.acquire('db-migrations', ttl_ms=300000)  # 5 minutes

    if not result.acquired:
        print("Another instance is running migrations")
        return

    try:
        print("Running migrations...")
        # Execute migrations
        perform_migrations()
    finally:
        redlock.release('db-migrations', result.token)
```

### Inventory Management

```python
def reserve_inventory(product_id: str, quantity: int) -> bool:
    """Reserve inventory with lock to prevent overselling."""
    lock = SimpleRedisLock()

    with lock.lock(f"inventory:{product_id}", timeout=5):
        current = get_inventory(product_id)
        if current >= quantity:
            set_inventory(product_id, current - quantity)
            return True
        return False
```

### Scheduled Job Coordination

```python
def scheduled_job():
    """Ensure only one instance runs the job."""
    lock = SimpleRedisLock()
    token = lock.acquire('daily-report-job', timeout=3600, blocking=False)

    if not token:
        print("Job already running on another instance")
        return

    try:
        generate_daily_report()
    finally:
        lock.release('daily-report-job', token)
```

## Best Practices

1. **Always set TTL**: Prevent deadlocks from crashed processes

2. **Use unique tokens**: Ensure only the owner can release the lock

3. **Handle failures gracefully**: Plan for lock acquisition failures

4. **Consider lock extension**: For long-running operations

5. **Use Redlock for critical operations**: When fault tolerance matters

6. **Monitor lock metrics**: Track acquisition times and failures

7. **Avoid lock contention**: Design to minimize lock scope and duration

8. **Test failure scenarios**: Verify behavior when Redis is unavailable

## Conclusion

Redis distributed locks provide essential coordination for distributed systems. Simple locks work well for single Redis instance setups, while Redlock provides fault tolerance across multiple instances. By following best practices around token-based release, automatic expiration, and proper error handling, you can build reliable coordination mechanisms for your distributed applications.
