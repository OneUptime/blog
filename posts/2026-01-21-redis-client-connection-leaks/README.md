# How to Debug Redis Client Connection Leaks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Troubleshooting, Connection Pooling, Memory Leaks, Performance

Description: A comprehensive guide to identifying and fixing Redis client connection leaks, including monitoring techniques, common causes, and best practices for connection management.

---

Connection leaks in Redis occur when client applications open connections but fail to properly close them. Over time, this leads to exhausted connection limits, degraded performance, and eventually service outages. This guide provides systematic approaches to identify, debug, and prevent connection leaks.

## Understanding Connection Leaks

A connection leak happens when:
1. Application code creates a Redis connection
2. The connection is used for operations
3. The connection is never explicitly closed
4. Garbage collection may or may not clean it up
5. Connections accumulate until limits are reached

## Step 1: Detect Connection Problems

### Check Current Connection Count

```bash
# Current connected clients
redis-cli INFO clients

# Key metrics:
# connected_clients: Current number of connections
# blocked_clients: Clients in blocking commands (BLPOP, etc.)
# tracking_clients: Clients in tracking mode
```

### Monitor Connection Growth

```bash
# Watch connections over time
watch -n 1 "redis-cli INFO clients | grep connected"

# Check connection history in stats
redis-cli INFO stats | grep connections
# total_connections_received: Total connections since start
# rejected_connections: Connections rejected due to maxclients
```

### Calculate Connection Rate

```python
import redis
import time

def monitor_connections(host='localhost', port=6379, interval=60):
    """Monitor connection rate and growth"""
    r = redis.Redis(host=host, port=port)

    prev_total = 0
    prev_time = time.time()

    while True:
        info = r.info('stats')
        clients = r.info('clients')

        current_total = info['total_connections_received']
        current_time = time.time()

        if prev_total > 0:
            elapsed = current_time - prev_time
            new_connections = current_total - prev_total
            rate = new_connections / elapsed * 60  # per minute

            print(f"Connected: {clients['connected_clients']}, "
                  f"New/min: {rate:.1f}, "
                  f"Blocked: {clients['blocked_clients']}")

            # Alert on high connection rate with stable client count
            if rate > 100 and clients['connected_clients'] < rate / 10:
                print("WARNING: High connection churn - possible leak pattern")

        prev_total = current_total
        prev_time = current_time
        time.sleep(interval)

monitor_connections()
```

## Step 2: Analyze Active Connections

### List All Clients

```bash
# Detailed client information
redis-cli CLIENT LIST

# Output format:
# id=123 addr=192.168.1.100:54321 fd=5 name= age=3600 idle=0 flags=N ...
```

### Parse Client List Programmatically

```python
import redis
from collections import defaultdict
from datetime import datetime, timedelta

def analyze_clients(host='localhost', port=6379):
    """Analyze connected clients for leak patterns"""
    r = redis.Redis(host=host, port=port, decode_responses=True)

    clients = r.client_list()

    # Group by source IP
    by_ip = defaultdict(list)
    by_age = defaultdict(int)
    idle_connections = []

    for client in clients:
        ip = client['addr'].split(':')[0]
        by_ip[ip].append(client)

        # Age buckets
        age_seconds = client['age']
        if age_seconds < 60:
            by_age['< 1 min'] += 1
        elif age_seconds < 3600:
            by_age['1 min - 1 hour'] += 1
        elif age_seconds < 86400:
            by_age['1 hour - 1 day'] += 1
        else:
            by_age['> 1 day'] += 1

        # Find idle connections
        if client['idle'] > 300:  # Idle > 5 minutes
            idle_connections.append(client)

    print("Connections by Source IP:")
    print("-" * 50)
    for ip, conns in sorted(by_ip.items(), key=lambda x: -len(x[1])):
        print(f"{ip}: {len(conns)} connections")

    print("\nConnection Age Distribution:")
    print("-" * 50)
    for age_bucket, count in by_age.items():
        print(f"{age_bucket}: {count}")

    print(f"\nIdle Connections (>5 min): {len(idle_connections)}")
    if idle_connections:
        print("Top idle connections:")
        for conn in sorted(idle_connections, key=lambda x: -x['idle'])[:10]:
            print(f"  {conn['addr']}: idle {conn['idle']}s, age {conn['age']}s")

analyze_clients()
```

## Step 3: Identify Leak Sources

### Common Leak Patterns

1. **No connection pooling** - New connection per request
2. **Missing close() calls** - Connections not released
3. **Exception handling gaps** - Connections not closed on errors
4. **Long-running connections** - Blocking operations without timeout
5. **Subscription leaks** - Pub/Sub connections never cleaned up

### Check for Pool Exhaustion

```python
import redis
import time

# Example of connection pool monitoring
pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    max_connections=50
)

def get_pool_stats(pool):
    """Get connection pool statistics"""
    return {
        'created': pool._created_connections,
        'available': len(pool._available_connections),
        'in_use': len(pool._in_use_connections),
        'max': pool.max_connections
    }

# Monitor pool usage
r = redis.Redis(connection_pool=pool)

for i in range(100):
    stats = get_pool_stats(pool)
    print(f"Pool: created={stats['created']}, "
          f"available={stats['available']}, "
          f"in_use={stats['in_use']}")

    # Simulate application usage
    r.get('test')
    time.sleep(0.1)
```

## Step 4: Fix Common Leak Patterns

### Pattern 1: Missing Connection Pool

**Bad - Creates new connection each time:**

```python
import redis

def get_user_bad(user_id):
    # BAD: New connection every call
    r = redis.Redis(host='localhost', port=6379)
    return r.get(f'user:{user_id}')

# Each call creates a new connection that may not be closed
for i in range(1000):
    get_user_bad(i)
```

**Good - Use connection pool:**

```python
import redis

# Create pool once at module level
pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    max_connections=50,
    socket_timeout=5,
    socket_connect_timeout=5
)

def get_redis():
    return redis.Redis(connection_pool=pool)

def get_user_good(user_id):
    # GOOD: Uses pooled connection
    r = get_redis()
    return r.get(f'user:{user_id}')
```

### Pattern 2: Missing Error Handling

**Bad - Connection leaks on error:**

```python
import redis

def process_data_bad(data):
    r = redis.Redis(host='localhost', port=6379)

    # If this fails, connection may leak
    result = r.set('key', data)
    processed = r.get('key')

    return processed
```

**Good - Proper cleanup:**

```python
import redis
from contextlib import contextmanager

@contextmanager
def get_redis_connection():
    """Context manager for Redis connections"""
    conn = redis.Redis(host='localhost', port=6379)
    try:
        yield conn
    finally:
        conn.close()

def process_data_good(data):
    with get_redis_connection() as r:
        r.set('key', data)
        return r.get('key')
    # Connection automatically closed, even on error
```

### Pattern 3: Pub/Sub Connection Leaks

**Bad - Subscription without cleanup:**

```python
import redis
import threading

def subscribe_bad(channel):
    r = redis.Redis(host='localhost', port=6379)
    pubsub = r.pubsub()
    pubsub.subscribe(channel)

    # If thread dies, connection leaks
    for message in pubsub.listen():
        print(message)
```

**Good - Managed subscription:**

```python
import redis
import threading
import signal

class ManagedSubscriber:
    def __init__(self, host='localhost', port=6379):
        self.redis = redis.Redis(host=host, port=port)
        self.pubsub = self.redis.pubsub()
        self.running = False
        self.thread = None

    def subscribe(self, channels, callback):
        """Subscribe with proper lifecycle management"""
        self.pubsub.subscribe(**{ch: callback for ch in channels})
        self.running = True
        self.thread = threading.Thread(target=self._listen)
        self.thread.daemon = True
        self.thread.start()

    def _listen(self):
        while self.running:
            message = self.pubsub.get_message(timeout=1.0)
            if message and message['type'] == 'message':
                # Process message
                pass

    def close(self):
        """Clean shutdown"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        self.pubsub.close()
        self.redis.close()

# Usage
subscriber = ManagedSubscriber()
subscriber.subscribe(['channel1'], lambda m: print(m))

# On shutdown
subscriber.close()
```

### Pattern 4: Async Connection Leaks

**Bad - Async connections not awaited:**

```python
import asyncio
import aioredis

async def get_data_bad(key):
    # BAD: Creates new connection, never closed
    redis = await aioredis.create_redis_pool('redis://localhost')
    value = await redis.get(key)
    # Missing: redis.close() and await redis.wait_closed()
    return value
```

**Good - Proper async cleanup:**

```python
import asyncio
import aioredis

class AsyncRedisPool:
    _pool = None

    @classmethod
    async def get_pool(cls):
        if cls._pool is None:
            cls._pool = await aioredis.create_redis_pool(
                'redis://localhost',
                minsize=5,
                maxsize=20
            )
        return cls._pool

    @classmethod
    async def close(cls):
        if cls._pool:
            cls._pool.close()
            await cls._pool.wait_closed()
            cls._pool = None

async def get_data_good(key):
    pool = await AsyncRedisPool.get_pool()
    value = await pool.get(key)
    return value

# On application shutdown
async def shutdown():
    await AsyncRedisPool.close()
```

## Step 5: Configure Connection Limits

### Set Redis maxclients

```bash
# Check current limit
redis-cli CONFIG GET maxclients

# Set limit (default is 10000)
redis-cli CONFIG SET maxclients 5000

# Persist
redis-cli CONFIG REWRITE
```

### Configure Client Timeouts

```bash
# Client idle timeout (0 = disabled)
redis-cli CONFIG SET timeout 300  # 5 minutes

# TCP keepalive
redis-cli CONFIG SET tcp-keepalive 60
```

### Kill Idle Connections

```bash
# Kill specific client
redis-cli CLIENT KILL ADDR 192.168.1.100:54321

# Kill by filter
redis-cli CLIENT KILL TYPE normal SKIPME yes

# Kill idle connections older than 1 hour
redis-cli CLIENT KILL IDLE 3600
```

## Step 6: Implement Connection Health Checks

```python
import redis
import threading
import time

class HealthCheckedPool:
    def __init__(self, host='localhost', port=6379, max_connections=50):
        self.pool = redis.ConnectionPool(
            host=host,
            port=port,
            max_connections=max_connections,
            health_check_interval=30
        )
        self._start_health_monitor()

    def _start_health_monitor(self):
        """Start background health monitoring"""
        def monitor():
            while True:
                self._check_pool_health()
                time.sleep(60)

        thread = threading.Thread(target=monitor, daemon=True)
        thread.start()

    def _check_pool_health(self):
        """Check and report pool health"""
        stats = {
            'created': self.pool._created_connections,
            'available': len(self.pool._available_connections),
            'in_use': len(self.pool._in_use_connections)
        }

        utilization = stats['in_use'] / self.pool.max_connections * 100

        if utilization > 80:
            print(f"WARNING: Pool utilization at {utilization:.1f}%")

        return stats

    def get_client(self):
        return redis.Redis(connection_pool=self.pool)

# Usage
pool = HealthCheckedPool()
r = pool.get_client()
```

## Step 7: Monitor with Metrics

### Prometheus Metrics

```python
import redis
from prometheus_client import Gauge, Counter, start_http_server
import time

# Metrics
connected_clients = Gauge('redis_connected_clients', 'Number of connected clients')
blocked_clients = Gauge('redis_blocked_clients', 'Number of blocked clients')
total_connections = Counter('redis_total_connections', 'Total connections received')
rejected_connections = Counter('redis_rejected_connections', 'Rejected connections')

def collect_connection_metrics(host='localhost', port=6379):
    r = redis.Redis(host=host, port=port)
    last_total = 0
    last_rejected = 0

    while True:
        try:
            clients = r.info('clients')
            stats = r.info('stats')

            connected_clients.set(clients['connected_clients'])
            blocked_clients.set(clients['blocked_clients'])

            # Counter increments
            current_total = stats['total_connections_received']
            current_rejected = stats['rejected_connections']

            if last_total > 0:
                total_connections.inc(current_total - last_total)
            if last_rejected > 0:
                rejected_connections.inc(current_rejected - last_rejected)

            last_total = current_total
            last_rejected = current_rejected

        except Exception as e:
            print(f"Error collecting metrics: {e}")

        time.sleep(15)

if __name__ == '__main__':
    start_http_server(9092)
    collect_connection_metrics()
```

### Alerting Rules

```yaml
groups:
  - name: redis-connections
    rules:
      - alert: RedisConnectionsHigh
        expr: redis_connected_clients > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis has too many connections"
          description: "{{ $value }} connections, check for leaks"

      - alert: RedisConnectionsRejected
        expr: rate(redis_rejected_connections[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis rejecting connections"
          description: "maxclients limit reached"

      - alert: RedisConnectionChurn
        expr: rate(redis_total_connections[5m]) > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High Redis connection churn"
          description: "Possible connection leak or missing pooling"
```

## Step 8: Debug with Connection Tracking

### Track Connection Origins

```python
import redis
import traceback
import atexit
from weakref import WeakSet

class TrackedConnectionPool(redis.ConnectionPool):
    """Connection pool that tracks where connections are created"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._connection_origins = {}
        self._active_connections = WeakSet()
        atexit.register(self._report_leaks)

    def get_connection(self, command_name, *args, **kwargs):
        conn = super().get_connection(command_name, *args, **kwargs)

        # Record where this connection was requested
        stack = ''.join(traceback.format_stack()[-5:-1])
        self._connection_origins[id(conn)] = stack
        self._active_connections.add(conn)

        return conn

    def release(self, connection):
        if id(connection) in self._connection_origins:
            del self._connection_origins[id(connection)]
        super().release(connection)

    def _report_leaks(self):
        """Report any unreleased connections at shutdown"""
        if self._connection_origins:
            print(f"\nWARNING: {len(self._connection_origins)} leaked connections!")
            for conn_id, origin in list(self._connection_origins.items())[:5]:
                print(f"\nConnection {conn_id} created at:\n{origin}")

# Usage for debugging
pool = TrackedConnectionPool(host='localhost', port=6379)
r = redis.Redis(connection_pool=pool)
```

## Connection Leak Prevention Checklist

1. **Use connection pooling** - Never create ad-hoc connections
2. **Set client timeout** - Redis CONFIG SET timeout
3. **Implement context managers** - Ensure cleanup on errors
4. **Close Pub/Sub connections** - Explicit cleanup required
5. **Handle async properly** - Await close operations
6. **Monitor connection count** - Alert on growth
7. **Track connection churn** - High rate indicates issues
8. **Set maxclients appropriately** - Prevent total exhaustion
9. **Enable TCP keepalive** - Detect dead connections
10. **Regular audits** - Review CLIENT LIST periodically

## Conclusion

Connection leaks are insidious problems that can slowly degrade your Redis infrastructure. The key to preventing them is:

1. **Always use connection pools** rather than creating individual connections
2. **Implement proper cleanup** in all code paths, including error handling
3. **Monitor connection metrics** continuously with alerting
4. **Set appropriate limits** (maxclients, timeout) as safety nets
5. **Audit periodically** using CLIENT LIST and connection analysis

By following these practices, you can maintain healthy connection management and avoid the frustrating debugging sessions that come with connection exhaustion issues.
