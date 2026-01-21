# How to Build a Distributed Semaphore with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Semaphore, Concurrency, Distributed Systems, Resource Limiting

Description: A comprehensive guide to implementing distributed semaphores with Redis for limiting concurrent access to resources across multiple processes and servers.

---

A distributed semaphore controls how many processes can access a shared resource simultaneously. Unlike a lock (which allows only one), a semaphore permits a configurable number of concurrent accessors. Redis provides excellent primitives for building distributed semaphores using sorted sets and atomic operations.

## Understanding Semaphores

| Concept | Mutex/Lock | Semaphore |
|---------|------------|-----------|
| Concurrent Access | 1 | N (configurable) |
| Use Case | Exclusive access | Limited concurrency |
| Example | Database migration | API connection pool |

## Basic Semaphore Implementation

```python
import redis
import uuid
import time
from typing import Optional, List
from contextlib import contextmanager
from dataclasses import dataclass

@dataclass
class SemaphorePermit:
    id: str
    acquired_at: float
    expires_at: float

class DistributedSemaphore:
    """Distributed semaphore using Redis sorted sets."""

    def __init__(self, redis_url='redis://localhost:6379',
                 name: str = 'semaphore',
                 limit: int = 10,
                 timeout: int = 30):
        """
        Initialize semaphore.

        Args:
            name: Semaphore identifier
            limit: Maximum concurrent permits
            timeout: Permit expiration in seconds
        """
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.name = name
        self.limit = limit
        self.timeout = timeout
        self.key = f"semaphore:{name}"
        self.counter_key = f"semaphore:{name}:counter"

    def _cleanup_expired(self):
        """Remove expired permits."""
        now = time.time()
        self.redis.zremrangebyscore(self.key, '-inf', now)

    def acquire(self, blocking: bool = True,
                retry_delay: float = 0.1) -> Optional[SemaphorePermit]:
        """
        Acquire a semaphore permit.

        Args:
            blocking: Wait for permit if none available
            retry_delay: Delay between retries

        Returns:
            SemaphorePermit if acquired, None otherwise
        """
        permit_id = str(uuid.uuid4())
        now = time.time()
        expires_at = now + self.timeout

        while True:
            # Cleanup expired permits
            self._cleanup_expired()

            # Try to acquire permit atomically
            pipe = self.redis.pipeline(True)
            try:
                pipe.watch(self.key)

                # Check current count
                current_count = pipe.zcard(self.key)
                pipe.multi()

                if current_count < self.limit:
                    # Add permit with expiration timestamp as score
                    pipe.zadd(self.key, {permit_id: expires_at})
                    pipe.execute()

                    return SemaphorePermit(
                        id=permit_id,
                        acquired_at=now,
                        expires_at=expires_at
                    )
                else:
                    pipe.unwatch()

            except redis.WatchError:
                # Another client modified, retry
                continue

            if not blocking:
                return None

            time.sleep(retry_delay)

    def release(self, permit: SemaphorePermit) -> bool:
        """Release a semaphore permit."""
        result = self.redis.zrem(self.key, permit.id)
        return result > 0

    def extend(self, permit: SemaphorePermit,
               additional_seconds: int = None) -> Optional[SemaphorePermit]:
        """Extend permit expiration."""
        additional = additional_seconds or self.timeout
        new_expires = time.time() + additional

        # Atomic check-and-update
        lua_script = """
        local score = redis.call('zscore', KEYS[1], ARGV[1])
        if score then
            redis.call('zadd', KEYS[1], ARGV[2], ARGV[1])
            return 1
        end
        return 0
        """

        result = self.redis.eval(lua_script, 1, self.key, permit.id, new_expires)

        if result:
            return SemaphorePermit(
                id=permit.id,
                acquired_at=permit.acquired_at,
                expires_at=new_expires
            )
        return None

    def get_available(self) -> int:
        """Get number of available permits."""
        self._cleanup_expired()
        current = self.redis.zcard(self.key)
        return max(0, self.limit - current)

    def get_holders(self) -> List[str]:
        """Get list of current permit holders."""
        self._cleanup_expired()
        return self.redis.zrange(self.key, 0, -1)

    @contextmanager
    def permit(self, blocking: bool = True):
        """Context manager for permit acquisition."""
        permit = self.acquire(blocking=blocking)
        if permit is None:
            raise SemaphoreError("Could not acquire semaphore permit")

        try:
            yield permit
        finally:
            self.release(permit)


class SemaphoreError(Exception):
    """Exception raised for semaphore errors."""
    pass


class FairSemaphore:
    """Fair semaphore that grants permits in FIFO order."""

    def __init__(self, redis_url='redis://localhost:6379',
                 name: str = 'fair_semaphore',
                 limit: int = 10,
                 timeout: int = 30):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.name = name
        self.limit = limit
        self.timeout = timeout
        self.owners_key = f"semaphore:{name}:owners"
        self.counter_key = f"semaphore:{name}:counter"
        self.waiters_key = f"semaphore:{name}:waiters"

    def acquire(self, blocking: bool = True,
                wait_timeout: float = 30) -> Optional[SemaphorePermit]:
        """Acquire permit with fair ordering."""
        permit_id = str(uuid.uuid4())
        now = time.time()

        # Get position in queue
        counter = self.redis.incr(self.counter_key)

        # Add to waiters
        self.redis.zadd(self.waiters_key, {permit_id: counter})

        deadline = time.time() + wait_timeout

        try:
            while time.time() < deadline:
                # Cleanup expired owners
                self.redis.zremrangebyscore(self.owners_key, '-inf', now)

                # Check if we can acquire
                current_owners = self.redis.zcard(self.owners_key)

                if current_owners < self.limit:
                    # Check if we're next in line
                    waiters = self.redis.zrange(self.waiters_key, 0,
                                                self.limit - current_owners - 1)

                    if permit_id in waiters:
                        # Move to owners
                        expires_at = time.time() + self.timeout
                        pipe = self.redis.pipeline()
                        pipe.zrem(self.waiters_key, permit_id)
                        pipe.zadd(self.owners_key, {permit_id: expires_at})
                        pipe.execute()

                        return SemaphorePermit(
                            id=permit_id,
                            acquired_at=now,
                            expires_at=expires_at
                        )

                if not blocking:
                    break

                time.sleep(0.1)

        finally:
            # Remove from waiters if still there
            self.redis.zrem(self.waiters_key, permit_id)

        return None

    def release(self, permit: SemaphorePermit) -> bool:
        """Release a permit."""
        return self.redis.zrem(self.owners_key, permit.id) > 0


# Example: Database connection pool limiter
class ConnectionPoolLimiter:
    """Limit concurrent database connections."""

    def __init__(self, redis_url: str, pool_name: str, max_connections: int):
        self.semaphore = DistributedSemaphore(
            redis_url=redis_url,
            name=f"db_pool:{pool_name}",
            limit=max_connections,
            timeout=60
        )

    @contextmanager
    def connection(self):
        """Get a connection slot from the pool."""
        with self.semaphore.permit() as permit:
            # Create actual DB connection here
            conn = create_db_connection()
            try:
                yield conn
            finally:
                conn.close()


# Example: API rate limiting with semaphore
class ConcurrentAPILimiter:
    """Limit concurrent API requests to external service."""

    def __init__(self, redis_url: str, api_name: str, max_concurrent: int):
        self.semaphore = DistributedSemaphore(
            redis_url=redis_url,
            name=f"api:{api_name}",
            limit=max_concurrent,
            timeout=30
        )

    async def call_api(self, endpoint: str, data: dict):
        """Make API call with concurrency limiting."""
        with self.semaphore.permit():
            return await make_api_request(endpoint, data)
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class DistributedSemaphore {
    constructor(options = {}) {
        this.redis = new Redis(options.redisUrl || 'redis://localhost:6379');
        this.name = options.name || 'semaphore';
        this.limit = options.limit || 10;
        this.timeout = options.timeout || 30;
        this.key = `semaphore:${this.name}`;
    }

    async _cleanupExpired() {
        const now = Date.now() / 1000;
        await this.redis.zremrangebyscore(this.key, '-inf', now);
    }

    async acquire(options = {}) {
        const { blocking = true, retryDelay = 100 } = options;
        const permitId = uuidv4();
        const now = Date.now() / 1000;
        const expiresAt = now + this.timeout;

        while (true) {
            await this._cleanupExpired();

            // Watch for changes
            await this.redis.watch(this.key);

            const currentCount = await this.redis.zcard(this.key);

            if (currentCount < this.limit) {
                const multi = this.redis.multi();
                multi.zadd(this.key, expiresAt, permitId);

                try {
                    await multi.exec();
                    return {
                        id: permitId,
                        acquiredAt: now,
                        expiresAt
                    };
                } catch (e) {
                    // WatchError, retry
                    continue;
                }
            } else {
                await this.redis.unwatch();
            }

            if (!blocking) {
                return null;
            }

            await new Promise(r => setTimeout(r, retryDelay));
        }
    }

    async release(permit) {
        const result = await this.redis.zrem(this.key, permit.id);
        return result > 0;
    }

    async getAvailable() {
        await this._cleanupExpired();
        const current = await this.redis.zcard(this.key);
        return Math.max(0, this.limit - current);
    }

    async withPermit(callback, options = {}) {
        const permit = await this.acquire(options);
        if (!permit) {
            throw new Error('Could not acquire semaphore permit');
        }

        try {
            return await callback();
        } finally {
            await this.release(permit);
        }
    }

    async close() {
        await this.redis.quit();
    }
}

// Usage example
async function main() {
    const semaphore = new DistributedSemaphore({
        name: 'api-calls',
        limit: 5,
        timeout: 30
    });

    console.log('Available permits:', await semaphore.getAvailable());

    // Acquire multiple permits
    const permits = [];
    for (let i = 0; i < 3; i++) {
        const permit = await semaphore.acquire();
        console.log(`Acquired permit ${i + 1}:`, permit.id);
        permits.push(permit);
    }

    console.log('Available permits:', await semaphore.getAvailable());

    // Release permits
    for (const permit of permits) {
        await semaphore.release(permit);
        console.log('Released permit:', permit.id);
    }

    // Using withPermit
    await semaphore.withPermit(async () => {
        console.log('Inside semaphore-protected section');
        await new Promise(r => setTimeout(r, 1000));
    });

    await semaphore.close();
}

main().catch(console.error);
```

## Use Cases

1. **Database connection pools**: Limit concurrent connections
2. **API rate limiting**: Control concurrent external API calls
3. **File processing**: Limit concurrent file operations
4. **Resource scheduling**: Manage access to limited resources

## Best Practices

1. **Set appropriate timeouts**: Prevent permits from being held indefinitely
2. **Handle failures gracefully**: Always release permits in finally blocks
3. **Monitor availability**: Track permit usage for capacity planning
4. **Consider fairness**: Use fair semaphore for strict ordering requirements
5. **Test under load**: Verify behavior with many concurrent acquisitions

## Conclusion

Distributed semaphores enable controlled concurrent access to shared resources across a distributed system. Redis sorted sets provide an efficient foundation for implementing semaphores with automatic expiration and atomic operations. By carefully managing permit lifecycle and handling edge cases, you can build reliable concurrency controls for your distributed applications.
