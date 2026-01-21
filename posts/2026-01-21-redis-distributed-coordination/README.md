# How to Use Redis for Distributed Coordination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Distributed Systems, Coordination, Barriers, Latches, Synchronization

Description: A comprehensive guide to using Redis for distributed coordination patterns including barriers, countdown latches, and synchronization primitives for coordinating work across multiple processes.

---

Distributed coordination primitives help synchronize work across multiple processes or servers. Redis provides excellent building blocks for implementing barriers, latches, and other synchronization patterns. This guide covers common coordination patterns with production-ready implementations.

## Coordination Primitives Overview

| Primitive | Purpose | Use Case |
|-----------|---------|----------|
| Barrier | Wait for N participants | Map-reduce synchronization |
| Countdown Latch | Wait for N events | Task completion tracking |
| Rendezvous | Two-party synchronization | Producer-consumer handoff |
| Double Barrier | Enter/exit synchronization | Phased computation |

## Barrier Implementation

A barrier blocks until a specified number of participants arrive:

```python
import redis
import uuid
import time
import threading
from typing import Optional, Callable
from dataclasses import dataclass

class DistributedBarrier:
    """Distributed barrier for synchronizing N participants."""

    def __init__(self, redis_url='redis://localhost:6379',
                 name: str = 'barrier',
                 participants: int = 3,
                 timeout: int = 300):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.name = name
        self.participants = participants
        self.timeout = timeout
        self.key = f"barrier:{name}"
        self.ready_key = f"barrier:{name}:ready"
        self.participant_id = str(uuid.uuid4())

    def wait(self, timeout: int = None) -> bool:
        """
        Wait at the barrier until all participants arrive.

        Returns:
            True if all participants arrived, False on timeout
        """
        timeout = timeout or self.timeout
        deadline = time.time() + timeout

        # Register as participant
        pipe = self.redis.pipeline()
        pipe.sadd(self.key, self.participant_id)
        pipe.expire(self.key, timeout)
        pipe.execute()

        # Wait for all participants
        while time.time() < deadline:
            count = self.redis.scard(self.key)

            if count >= self.participants:
                # All participants arrived, signal ready
                self.redis.set(self.ready_key, '1', ex=60)
                return True

            # Check if barrier was released
            if self.redis.get(self.ready_key):
                return True

            time.sleep(0.1)

        return False

    def reset(self):
        """Reset the barrier for reuse."""
        pipe = self.redis.pipeline()
        pipe.delete(self.key)
        pipe.delete(self.ready_key)
        pipe.execute()

    def get_arrived(self) -> int:
        """Get number of participants that have arrived."""
        return self.redis.scard(self.key)


class CountdownLatch:
    """Countdown latch that triggers when count reaches zero."""

    def __init__(self, redis_url='redis://localhost:6379',
                 name: str = 'latch',
                 count: int = 5,
                 timeout: int = 300):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.name = name
        self.initial_count = count
        self.timeout = timeout
        self.count_key = f"latch:{name}:count"
        self.triggered_key = f"latch:{name}:triggered"

    def initialize(self):
        """Initialize or reset the latch."""
        pipe = self.redis.pipeline()
        pipe.set(self.count_key, self.initial_count, ex=self.timeout)
        pipe.delete(self.triggered_key)
        pipe.execute()

    def count_down(self) -> int:
        """Decrement the count and return new value."""
        lua_script = """
        local count = redis.call('decr', KEYS[1])
        if count <= 0 then
            redis.call('set', KEYS[2], '1', 'EX', ARGV[1])
        end
        return count
        """

        return self.redis.eval(
            lua_script, 2,
            self.count_key, self.triggered_key,
            self.timeout
        )

    def wait(self, timeout: int = None) -> bool:
        """Wait for the latch to trigger."""
        timeout = timeout or self.timeout
        deadline = time.time() + timeout

        while time.time() < deadline:
            if self.redis.get(self.triggered_key):
                return True

            count = self.redis.get(self.count_key)
            if count and int(count) <= 0:
                return True

            time.sleep(0.1)

        return False

    def get_count(self) -> int:
        """Get current count."""
        count = self.redis.get(self.count_key)
        return int(count) if count else 0

    def is_triggered(self) -> bool:
        """Check if latch has triggered."""
        return bool(self.redis.get(self.triggered_key))


class DoubleBarrier:
    """
    Double barrier for phased computation.

    All participants must enter before work begins,
    and all must exit before next phase starts.
    """

    def __init__(self, redis_url='redis://localhost:6379',
                 name: str = 'double_barrier',
                 participants: int = 3,
                 timeout: int = 300):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.name = name
        self.participants = participants
        self.timeout = timeout
        self.enter_key = f"dbarrier:{name}:enter"
        self.exit_key = f"dbarrier:{name}:exit"
        self.ready_key = f"dbarrier:{name}:ready"
        self.done_key = f"dbarrier:{name}:done"
        self.participant_id = str(uuid.uuid4())

    def enter(self, timeout: int = None) -> bool:
        """Enter the barrier, waiting for all participants."""
        timeout = timeout or self.timeout
        deadline = time.time() + timeout

        # Register entry
        pipe = self.redis.pipeline()
        pipe.sadd(self.enter_key, self.participant_id)
        pipe.expire(self.enter_key, timeout)
        pipe.execute()

        while time.time() < deadline:
            if self.redis.scard(self.enter_key) >= self.participants:
                self.redis.set(self.ready_key, '1', ex=timeout)
                return True

            if self.redis.get(self.ready_key):
                return True

            time.sleep(0.1)

        return False

    def leave(self, timeout: int = None) -> bool:
        """Leave the barrier, waiting for all to finish."""
        timeout = timeout or self.timeout
        deadline = time.time() + timeout

        # Register exit
        pipe = self.redis.pipeline()
        pipe.sadd(self.exit_key, self.participant_id)
        pipe.expire(self.exit_key, timeout)
        pipe.execute()

        while time.time() < deadline:
            if self.redis.scard(self.exit_key) >= self.participants:
                self.redis.set(self.done_key, '1', ex=60)
                return True

            if self.redis.get(self.done_key):
                return True

            time.sleep(0.1)

        return False

    def reset(self):
        """Reset for next phase."""
        pipe = self.redis.pipeline()
        pipe.delete(self.enter_key)
        pipe.delete(self.exit_key)
        pipe.delete(self.ready_key)
        pipe.delete(self.done_key)
        pipe.execute()


class TaskCoordinator:
    """Coordinate distributed task execution."""

    def __init__(self, redis_url='redis://localhost:6379',
                 task_name: str = 'task'):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.task_name = task_name
        self.workers_key = f"task:{task_name}:workers"
        self.results_key = f"task:{task_name}:results"
        self.status_key = f"task:{task_name}:status"

    def register_worker(self, worker_id: str, shard_id: int):
        """Register a worker for the task."""
        self.redis.hset(self.workers_key, worker_id, shard_id)

    def submit_result(self, worker_id: str, result: str):
        """Submit result from a worker."""
        self.redis.hset(self.results_key, worker_id, result)

    def wait_for_all(self, timeout: int = 300) -> dict:
        """Wait for all registered workers to submit results."""
        deadline = time.time() + timeout

        while time.time() < deadline:
            workers = self.redis.hkeys(self.workers_key)
            results = self.redis.hkeys(self.results_key)

            if set(workers) == set(results):
                return self.redis.hgetall(self.results_key)

            time.sleep(0.5)

        raise TimeoutError("Not all workers completed in time")

    def reset(self):
        """Reset task state."""
        pipe = self.redis.pipeline()
        pipe.delete(self.workers_key)
        pipe.delete(self.results_key)
        pipe.delete(self.status_key)
        pipe.execute()
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class DistributedBarrier {
    constructor(options = {}) {
        this.redis = new Redis(options.redisUrl || 'redis://localhost:6379');
        this.name = options.name || 'barrier';
        this.participants = options.participants || 3;
        this.timeout = options.timeout || 300;
        this.key = `barrier:${this.name}`;
        this.readyKey = `barrier:${this.name}:ready`;
        this.participantId = uuidv4();
    }

    async wait(timeout = null) {
        timeout = timeout || this.timeout;
        const deadline = Date.now() + timeout * 1000;

        // Register
        await this.redis.pipeline()
            .sadd(this.key, this.participantId)
            .expire(this.key, timeout)
            .exec();

        while (Date.now() < deadline) {
            const count = await this.redis.scard(this.key);

            if (count >= this.participants) {
                await this.redis.set(this.readyKey, '1', 'EX', 60);
                return true;
            }

            if (await this.redis.get(this.readyKey)) {
                return true;
            }

            await new Promise(r => setTimeout(r, 100));
        }

        return false;
    }

    async reset() {
        await this.redis.del(this.key, this.readyKey);
    }

    async close() {
        await this.redis.quit();
    }
}

class CountdownLatch {
    constructor(options = {}) {
        this.redis = new Redis(options.redisUrl || 'redis://localhost:6379');
        this.name = options.name || 'latch';
        this.initialCount = options.count || 5;
        this.timeout = options.timeout || 300;
        this.countKey = `latch:${this.name}:count`;
        this.triggeredKey = `latch:${this.name}:triggered`;

        this.countDownScript = `
        local count = redis.call('decr', KEYS[1])
        if count <= 0 then
            redis.call('set', KEYS[2], '1', 'EX', ARGV[1])
        end
        return count
        `;
    }

    async initialize() {
        await this.redis.pipeline()
            .set(this.countKey, this.initialCount, 'EX', this.timeout)
            .del(this.triggeredKey)
            .exec();
    }

    async countDown() {
        return await this.redis.eval(
            this.countDownScript, 2,
            this.countKey, this.triggeredKey,
            this.timeout
        );
    }

    async wait(timeout = null) {
        timeout = timeout || this.timeout;
        const deadline = Date.now() + timeout * 1000;

        while (Date.now() < deadline) {
            if (await this.redis.get(this.triggeredKey)) {
                return true;
            }

            const count = await this.redis.get(this.countKey);
            if (count && parseInt(count) <= 0) {
                return true;
            }

            await new Promise(r => setTimeout(r, 100));
        }

        return false;
    }

    async close() {
        await this.redis.quit();
    }
}

// Usage example
async function main() {
    // Countdown latch example
    const latch = new CountdownLatch({ name: 'tasks', count: 3 });
    await latch.initialize();

    // Simulate workers counting down
    for (let i = 0; i < 3; i++) {
        setTimeout(async () => {
            const remaining = await latch.countDown();
            console.log(`Worker ${i} done, ${remaining} remaining`);
        }, i * 1000);
    }

    // Wait for all workers
    const completed = await latch.wait(10);
    console.log('All workers completed:', completed);

    await latch.close();
}

main().catch(console.error);
```

## Use Cases

1. **Map-Reduce**: Synchronize reduce phase after all mappers finish
2. **Batch Processing**: Wait for all shards to complete
3. **Testing**: Coordinate concurrent test execution
4. **Migrations**: Ensure all instances ready before cutover

## Best Practices

1. **Set timeouts**: Prevent indefinite waits
2. **Handle partial failures**: Plan for participants that never arrive
3. **Use unique IDs**: Prevent duplicate registrations
4. **Monitor coordination**: Track wait times and failures
5. **Clean up resources**: Reset primitives after use

## Conclusion

Redis provides flexible primitives for building distributed coordination patterns. Barriers, latches, and other synchronization mechanisms enable complex distributed workflows while maintaining simplicity. The key is proper timeout handling and planning for failure scenarios.
