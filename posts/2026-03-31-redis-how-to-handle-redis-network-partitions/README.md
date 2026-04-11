# How to Handle Redis Network Partitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Network Partition, High Availability, Sentinel, Cluster, Resilience

Description: Learn how Redis Sentinel and Cluster behave during network partitions, how to configure split-brain protection, and how to write resilient application code.

---

## What Is a Network Partition

A network partition (split-brain scenario) occurs when one or more Redis nodes become unreachable from others due to network failure, not process failure. The nodes are running but cannot communicate. This can lead to inconsistent state if both sides continue accepting writes.

## Redis Sentinel Behavior During Partitions

### Majority-Based Failover

Redis Sentinel requires a majority of sentinel instances to agree before promoting a replica to primary. With 3 sentinels, 2 must agree. This prevents split-brain:

```text
Sentinel 1 (AZ-A) -- can reach Primary
Sentinel 2 (AZ-B) -- cannot reach Primary (partition)
Sentinel 3 (AZ-C) -- cannot reach Primary (partition)

Result: 2/3 sentinels agree Primary is down -> Failover occurs
```

With only 1 sentinel, a single sentinel can promote a replica, leading to split-brain if the original primary is still serving traffic.

### min-slaves-to-write Configuration

Configure the primary to refuse writes if it cannot reach a minimum number of replicas:

```text
# redis.conf on primary
min-replicas-to-write 1
min-replicas-max-lag 10
```

This means: if the primary cannot replicate to at least 1 replica within 10 seconds, it stops accepting writes. This prevents the primary side of a partition from diverging:

```bash
redis-cli CONFIG GET min-replicas-to-write
redis-cli CONFIG GET min-replicas-max-lag
```

### Testing Sentinel Partition Handling

```bash
# Simulate primary failure (iptables drop)
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP

# Watch sentinel logs
sudo tail -f /var/log/redis/sentinel.log

# Restore
sudo iptables -D INPUT -p tcp --dport 6379 -j DROP
```

## Redis Cluster Partition Behavior

### Cluster Availability with Replicas

Redis Cluster requires all 16,384 slots to be covered. If a primary node becomes unreachable:

1. Cluster detects the node as `PFAIL` (possible failure)
2. Enough nodes agree -> node marked `FAIL`
3. If a replica exists, it promotes itself to primary
4. Cluster resumes serving all slots

Without a replica, the slots from that shard are uncovered and `CLUSTERDOWN` occurs.

### cluster-require-full-coverage

```text
# redis.conf
cluster-require-full-coverage yes  # Default
```

With `yes`: if any slot is uncovered, the entire cluster returns errors.
With `no`: the cluster continues serving available slots even if some are uncovered.

For availability-critical applications:

```bash
redis-cli CONFIG SET cluster-require-full-coverage no
```

### cluster-node-timeout

Controls how long before a node is considered down:

```text
# redis.conf
cluster-node-timeout 5000  # 5 seconds (default is 15000)
```

Lower values mean faster detection but more false positives on slow networks.

## Application-Level Partition Handling

### Circuit Breaker Pattern

```python
import redis
import time

class RedisCircuitBreaker:
    def __init__(self, redis_client, failure_threshold=5, timeout=60):
        self.r = redis_client
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF-OPEN

    def call(self, command, *args, **kwargs):
        if self.state == 'OPEN':
            if time.time() - self.last_failure_time > self.timeout:
                self.state = 'HALF-OPEN'
            else:
                raise Exception("Circuit breaker is OPEN - Redis unavailable")

        try:
            result = getattr(self.r, command)(*args, **kwargs)
            if self.state == 'HALF-OPEN':
                self.state = 'CLOSED'
                self.failure_count = 0
            return result
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError) as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = 'OPEN'
            raise

r = redis.Redis()
cb = RedisCircuitBreaker(r)

try:
    value = cb.call('get', 'mykey')
except Exception as e:
    # Fall back to database or return cached response
    value = get_from_fallback()
```

### Retry with Exponential Backoff

```python
import time
import random
import redis

def with_retry(func, max_retries=3, base_delay=0.1):
    for attempt in range(max_retries):
        try:
            return func()
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError) as e:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt) + random.uniform(0, 0.1)
            time.sleep(delay)
```

### Read-Through with Fallback

```python
import json
import redis

r = redis.Redis()
CACHE_AVAILABLE = True

def get_user(user_id):
    global CACHE_AVAILABLE

    if CACHE_AVAILABLE:
        try:
            cached = r.get(f'user:{user_id}')
            if cached:
                return json.loads(cached)
            CACHE_AVAILABLE = True
        except redis.exceptions.ConnectionError:
            CACHE_AVAILABLE = False
            # Fall through to database

    # Fall back to database
    return db.query('SELECT * FROM users WHERE id = %s', user_id)
```

## Configuring Timeouts for Partition Resilience

Short timeouts detect partitions faster but may cause false positives on slow networks:

```python
# Python - configure socket timeouts
r = redis.Redis(
    host='localhost',
    port=6379,
    socket_connect_timeout=2,    # Connection timeout (seconds)
    socket_timeout=2,            # Read/write timeout
    retry_on_timeout=True,
    health_check_interval=30     # Periodic PING to detect failures
)
```

In Node.js (ioredis):

```javascript
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  connectTimeout: 2000,         // 2 seconds
  commandTimeout: 2000,
  lazyConnect: true,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconnect after READONLY error (failover)
    }
    return false;
  }
});
```

## Sentinel Event Monitoring

Subscribe to Sentinel events to detect partitions:

```bash
redis-cli -h sentinel-host -p 26379 SUBSCRIBE +sdown +odown +switch-master
```

Or in Python:

```python
from redis import StrictRedis

sentinel_r = StrictRedis(host='sentinel-host', port=26379)
pubsub = sentinel_r.pubsub()
pubsub.subscribe('+switch-master', '+sdown', '+odown', '-odown')

for message in pubsub.listen():
    if message['type'] == 'message':
        print(f"Sentinel event: {message['channel']}: {message['data']}")
```

## Summary

Handle Redis network partitions by configuring `min-replicas-to-write` on the primary to stop accepting writes when replicas are unreachable, using at least 3 Sentinel instances for majority-based failover, and implementing circuit breakers and retry logic in application code. In Redis Cluster, set `cluster-node-timeout` appropriately and consider `cluster-require-full-coverage no` for availability-over-consistency deployments.
