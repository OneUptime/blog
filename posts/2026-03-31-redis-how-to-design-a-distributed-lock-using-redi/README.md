# How to Design a Distributed Lock Using Redis in a System Design Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, Distributed Lock, Interview, Redlock, Concurrency

Description: A system design walkthrough for implementing distributed locks with Redis, covering SET NX, Redlock algorithm, lock expiry, and safety guarantees.

---

## Problem Statement

Design a distributed lock system that:
- Prevents multiple services from executing the same critical section simultaneously
- Handles lock holder crashes without causing deadlock
- Works correctly across multiple Redis nodes
- Supports lock renewal for long-running operations

## Why Distributed Locks Are Hard

In a distributed system, you cannot use in-process mutexes. Services on different machines need a shared coordination mechanism. Challenges include:

- **Deadlock** - Lock holder crashes before releasing
- **Race conditions** - Two nodes acquire lock at the same time
- **Clock skew** - Different machines have different timestamps
- **Network partitions** - Lock holder disconnects from Redis

## Basic Redis Lock with SET NX EX

The foundation: SET with NX (only if not exists) and EX (TTL for auto-expiry):

```bash
# Acquire lock: succeed only if key doesn't exist
SET lock:payment-processor "owner-uuid-123" NX EX 30
# OK = acquired, nil = lock already held

# Release lock (check owner first!)
GET lock:payment-processor
# If value == "owner-uuid-123", then:
DEL lock:payment-processor
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const redis = new Redis({ host: 'localhost', port: 6379 });

class DistributedLock {
  constructor(key, ttlSeconds = 30) {
    this.key = `lock:${key}`;
    this.ttl = ttlSeconds;
    this.ownerId = null;
  }

  async acquire(retries = 3, retryDelayMs = 100) {
    const ownerId = uuidv4();

    for (let i = 0; i <= retries; i++) {
      const acquired = await redis.set(this.key, ownerId, 'NX', 'EX', this.ttl);

      if (acquired === 'OK') {
        this.ownerId = ownerId;
        return true;
      }

      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * (i + 1)));
      }
    }

    return false; // Could not acquire lock
  }

  async release() {
    if (!this.ownerId) return false;

    // Atomic check-and-delete with Lua script
    const releaseLua = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redis.eval(releaseLua, 1, this.key, this.ownerId);
    this.ownerId = null;
    return result === 1;
  }

  async extend(ttlSeconds) {
    if (!this.ownerId) return false;

    const extendLua = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("EXPIRE", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await redis.eval(extendLua, 1, this.key, this.ownerId, ttlSeconds);
    return result === 1;
  }
}
```

## Using the Lock

```javascript
async function processPayment(paymentId) {
  const lock = new DistributedLock(`payment:${paymentId}`, 30);

  const acquired = await lock.acquire(3, 200);
  if (!acquired) {
    throw new Error('Could not acquire lock - payment already being processed');
  }

  try {
    // Only one service processes this payment at a time
    const result = await chargeCard(paymentId);
    await savePaymentResult(result);
    return result;
  } finally {
    await lock.release();
  }
}
```

## Python Implementation

```python
import redis
import uuid
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

RELEASE_SCRIPT = """
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
"""

class DistributedLock:
    def __init__(self, key: str, ttl: int = 30):
        self.key = f"lock:{key}"
        self.ttl = ttl
        self.owner_id = None

    def acquire(self, retries: int = 3, delay: float = 0.1) -> bool:
        owner_id = str(uuid.uuid4())

        for attempt in range(retries + 1):
            acquired = r.set(self.key, owner_id, nx=True, ex=self.ttl)
            if acquired:
                self.owner_id = owner_id
                return True
            if attempt < retries:
                time.sleep(delay * (attempt + 1))

        return False

    def release(self) -> bool:
        if not self.owner_id:
            return False
        result = r.eval(RELEASE_SCRIPT, 1, self.key, self.owner_id)
        self.owner_id = None
        return result == 1

    def __enter__(self):
        if not self.acquire():
            raise RuntimeError(f"Could not acquire lock: {self.key}")
        return self

    def __exit__(self, *args):
        self.release()

# Usage as context manager
with DistributedLock('resource:42', ttl=30):
    process_critical_section()
```

## The Redlock Algorithm (Multi-Node Safety)

For higher safety guarantees, acquire the lock on multiple independent Redis nodes:

```javascript
class Redlock {
  constructor(redisClients, options = {}) {
    this.clients = redisClients;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 200;
    this.clockDrift = options.clockDrift || 0.01;
  }

  async lock(resource, ttl) {
    const ownerId = uuidv4();
    const quorum = Math.floor(this.clients.length / 2) + 1;

    for (let attempt = 0; attempt < this.retries; attempt++) {
      const start = Date.now();
      let acquired = 0;

      for (const client of this.clients) {
        try {
          const result = await client.set(resource, ownerId, 'NX', 'PX', ttl);
          if (result === 'OK') acquired++;
        } catch (e) {
          // Node unavailable - continue
        }
      }

      const elapsed = Date.now() - start;
      const validity = ttl - elapsed - Math.floor(ttl * this.clockDrift);

      if (acquired >= quorum && validity > 0) {
        return { resource, ownerId, validity };
      }

      // Failed - release all acquired locks
      await this.unlock({ resource, ownerId });
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }

    throw new Error('Could not acquire Redlock');
  }

  async unlock({ resource, ownerId }) {
    const releaseLua = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;

    await Promise.all(
      this.clients.map(client =>
        client.eval(releaseLua, 1, resource, ownerId).catch(() => {})
      )
    );
  }
}
```

## Safety Guarantees and Limitations

```text
Guarantee                       Single-node Redis   Redlock (5 nodes)
---------                       -----------------   -----------------
Mutual exclusion                Yes (if no failover)  Yes
No deadlock (TTL)               Yes                 Yes
Fault tolerance                 No (SPOF)           Yes (tolerates N/2 failures)
Works under network partition   No                  Partial

Known limitation: Redlock is debated in literature (Martin Kleppmann critique).
For financial systems, use a database-level lock or a dedicated lock service (etcd, ZooKeeper).
```

## Interview Discussion Points

```text
Q: Why use a Lua script for release instead of GET + DEL?
A: GET + DEL is two separate commands - not atomic. Another process
   could acquire the lock between GET and DEL.

Q: What if the lock holder crashes after processing but before releasing?
A: The TTL ensures the lock expires automatically, preventing deadlock.

Q: What is the risk of a short TTL?
A: If processing takes longer than TTL, lock expires while holder is still
   working. Use lock renewal (EXPIRE extend) for long operations.
```

## Summary

Redis distributed locks use SET NX EX for atomic acquisition with automatic TTL-based expiry to prevent deadlock. Always use a Lua script for release to atomically verify ownership before deletion. For single-node Redis, this provides strong mutual exclusion. For higher safety in distributed deployments, the Redlock algorithm acquires locks on a majority of independent Redis nodes. In system design interviews, discuss the tradeoffs between simplicity (single-node) and fault tolerance (Redlock).
