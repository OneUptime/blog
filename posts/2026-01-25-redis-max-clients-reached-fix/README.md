# How to Fix "ERR max number of clients reached"

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Troubleshooting, Connections, Performance, DevOps

Description: Resolve the Redis max clients error by understanding connection limits, implementing connection pooling, and identifying connection leaks in your application.

---

The "ERR max number of clients reached" error occurs when Redis has reached its maximum allowed client connections. This typically indicates either a connection leak in your application or insufficient connection limits for your workload. This guide covers diagnosis and solutions.

## Understanding the Error

```python
# Error message:
# redis.exceptions.ConnectionError: max number of clients reached

import redis

r = redis.Redis(host='localhost', port=6379)
try:
    r.ping()
except redis.ConnectionError as e:
    print(f"Connection error: {e}")
```

## Quick Diagnosis

```bash
# Check current connections
redis-cli INFO clients

# Key metrics:
# connected_clients - Current connections
# blocked_clients - Clients in blocking commands
# maxclients - Maximum allowed

# Check maxclients setting
redis-cli CONFIG GET maxclients

# List all connected clients
redis-cli CLIENT LIST

# Count connections by type
redis-cli CLIENT LIST | wc -l
```

## Solutions

### 1. Increase maxclients

```bash
# Temporary (until restart)
redis-cli CONFIG SET maxclients 20000

# Permanent - add to redis.conf
maxclients 20000

# Check system limits too
# Redis needs file descriptors for each connection
ulimit -n  # Current limit
```

```bash
# Increase system file descriptor limit
# /etc/security/limits.conf
redis soft nofile 65535
redis hard nofile 65535

# Or in systemd service file
# /etc/systemd/system/redis.service
[Service]
LimitNOFILE=65535
```

### 2. Fix Connection Leaks

The most common cause is applications not closing connections:

```python
import redis

# BAD: Connection leak
def get_user_bad(user_id):
    r = redis.Redis()  # New connection each call
    return r.get(f'user:{user_id}')
    # Connection not closed!

# GOOD: Use connection pool
pool = redis.ConnectionPool(host='localhost', port=6379, max_connections=50)

def get_user_good(user_id):
    r = redis.Redis(connection_pool=pool)
    return r.get(f'user:{user_id}')
    # Connection returns to pool automatically

# GOOD: Reuse single client
r = redis.Redis(host='localhost', port=6379)

def get_user_better(user_id):
    return r.get(f'user:{user_id}')
```

### 3. Implement Connection Pooling

```python
import redis
from redis import ConnectionPool

# Create pool with appropriate size
pool = ConnectionPool(
    host='localhost',
    port=6379,
    db=0,
    max_connections=50,  # Adjust based on workload
    socket_timeout=5,
    socket_connect_timeout=5,
    retry_on_timeout=True
)

# Use pool for all Redis operations
r = redis.Redis(connection_pool=pool)

# Monitor pool usage
def check_pool_status():
    in_use = len(pool._in_use_connections)
    available = len(pool._available_connections)
    print(f"Pool: {in_use} in use, {available} available")

check_pool_status()
```

### 4. Node.js Connection Pooling

```javascript
const Redis = require('ioredis');

// ioredis handles pooling internally
// But you should still limit connections

const redis = new Redis({
    host: 'localhost',
    port: 6379,
    // Maximum reconnection attempts
    maxRetriesPerRequest: 3,
    // Connection timeout
    connectTimeout: 5000,
    // Enable offline queue (prevents connection storm)
    enableOfflineQueue: true,
    lazyConnect: true
});

// For multiple connections, use a pool pattern
const connections = new Map();

function getConnection(name = 'default') {
    if (!connections.has(name)) {
        connections.set(name, new Redis({
            host: 'localhost',
            port: 6379
        }));
    }
    return connections.get(name);
}
```

## Identifying Connection Sources

```python
import redis
from collections import Counter

r = redis.Redis(host='localhost', port=6379)

def analyze_connections():
    """Analyze where connections are coming from"""
    clients = r.client_list()

    # Group by address
    by_addr = Counter()
    by_name = Counter()

    for client in clients:
        addr = client.get('addr', '').split(':')[0]
        name = client.get('name', 'unnamed')

        by_addr[addr] += 1
        by_name[name] += 1

    print("Connections by IP:")
    for addr, count in by_addr.most_common(10):
        print(f"  {addr}: {count}")

    print("\nConnections by name:")
    for name, count in by_name.most_common(10):
        print(f"  {name}: {count}")

    # Find idle connections
    print("\nIdle connections (>60s):")
    for client in clients:
        idle = int(client.get('idle', 0))
        if idle > 60:
            print(f"  {client['addr']}: idle {idle}s")

analyze_connections()

# Set client name for easier debugging
r.client_setname('myapp:worker:1')
```

## Connection Management Best Practices

```python
import redis
import atexit
from contextlib import contextmanager

class RedisManager:
    """Centralized Redis connection management"""

    _instance = None
    _pool = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._pool = redis.ConnectionPool(
                host='localhost',
                port=6379,
                max_connections=50,
                socket_timeout=5
            )
        return cls._instance

    @property
    def client(self):
        return redis.Redis(connection_pool=self._pool)

    @contextmanager
    def get_connection(self):
        """Context manager for explicit connection handling"""
        conn = self._pool.get_connection('_')
        try:
            yield conn
        finally:
            self._pool.release(conn)

    def close(self):
        """Close all connections in pool"""
        self._pool.disconnect()

# Register cleanup on exit
@atexit.register
def cleanup():
    RedisManager().close()

# Usage
manager = RedisManager()
r = manager.client

r.set('key', 'value')
print(r.get('key'))
```

## Monitoring Connections

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

def monitor_connections(interval=5, threshold=80):
    """Monitor connection count and alert if high"""
    while True:
        info = r.info('clients')
        current = info['connected_clients']

        config = r.config_get('maxclients')
        max_clients = int(config['maxclients'])

        pct = (current / max_clients) * 100

        print(f"Connections: {current}/{max_clients} ({pct:.1f}%)")

        if pct > threshold:
            print(f"WARNING: Connection usage at {pct:.1f}%!")
            # Send alert, analyze connections, etc.
            analyze_connections()

        time.sleep(interval)

# Run monitoring
# monitor_connections()
```

## Automatic Connection Cleanup

```bash
# Configure client timeout in redis.conf
# Closes idle connections after N seconds
timeout 300

# Or set dynamically
redis-cli CONFIG SET timeout 300

# Kill specific client
redis-cli CLIENT KILL ADDR 192.168.1.100:50000

# Kill idle clients
redis-cli CLIENT KILL TYPE normal SKIPME yes
```

```python
import redis

r = redis.Redis(host='localhost', port=6379)

def cleanup_idle_connections(max_idle_seconds=300):
    """Kill connections idle for too long"""
    clients = r.client_list()
    killed = 0

    for client in clients:
        idle = int(client.get('idle', 0))
        if idle > max_idle_seconds:
            try:
                r.client_kill(client['addr'])
                killed += 1
            except Exception:
                pass

    print(f"Killed {killed} idle connections")
    return killed
```

## Summary

| Cause | Solution |
|-------|----------|
| Low maxclients | Increase limit and file descriptors |
| Connection leak | Use connection pooling |
| No pooling | Implement connection pool |
| Idle connections | Configure timeout |
| Too many workers | Reduce pool size per worker |

Key recommendations:
- Always use connection pooling
- Set appropriate maxclients for your workload
- Configure client timeout for idle connections
- Monitor connection count
- Set client names for debugging
- Calculate pool size: workers x threads x connections
