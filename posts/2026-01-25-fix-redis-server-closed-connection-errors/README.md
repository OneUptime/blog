# How to Fix 'Redis server closed connection' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Troubleshooting, Networking, Connection Management, DevOps

Description: Learn how to diagnose and fix Redis server closed connection errors, understand why connections drop unexpectedly, and implement resilient connection handling.

---

When your Redis client suddenly reports "Connection closed by server" or similar errors, it can be puzzling. The connection was working fine, and now Redis is closing it without explanation. Let us explore the common causes and solutions for this frustrating issue.

## Understanding Connection Closures

Redis might close your connection for several reasons:

1. Client idle timeout
2. Server restart or failover
3. Memory pressure causing client eviction
4. Network issues
5. TCP keepalive failures
6. Maxclient limit reached

## Diagnosing the Issue

### Check Client Statistics

```bash
# Get client connection info
redis-cli INFO clients

# Key metrics to watch:
# connected_clients: 150
# blocked_clients: 5
# tracking_clients: 0
# clients_in_timeout_table: 10
```

### Monitor Client Connections

```bash
# List all connected clients
redis-cli CLIENT LIST

# Sample output shows each client's:
# - id: unique client ID
# - addr: IP and port
# - age: connection duration in seconds
# - idle: seconds since last command
# - flags: client type flags
```

### Check Server Logs

```bash
# Look for connection-related messages
tail -f /var/log/redis/redis-server.log | grep -i "client\|connection"

# Common messages:
# "Client closed connection"
# "Connection reset by peer"
# "Disconnecting timedout client"
```

## Common Causes and Solutions

### 1. Client Idle Timeout

Redis can disconnect idle clients to free up resources.

```bash
# Check current timeout (0 means disabled)
redis-cli CONFIG GET timeout

# Set timeout (seconds, 0 to disable)
redis-cli CONFIG SET timeout 300
```

Client-side solution - keep connections alive:

```python
import redis
import time
import threading

class KeepAliveRedis:
    """Redis client with connection keep-alive."""

    def __init__(self, host='localhost', port=6379, ping_interval=60):
        self.r = redis.Redis(host=host, port=port)
        self.ping_interval = ping_interval
        self._start_keepalive()

    def _start_keepalive(self):
        def ping_loop():
            while True:
                try:
                    self.r.ping()
                except:
                    pass
                time.sleep(self.ping_interval)

        thread = threading.Thread(target=ping_loop, daemon=True)
        thread.start()

    def get(self, key):
        return self.r.get(key)

    def set(self, key, value, **kwargs):
        return self.r.set(key, value, **kwargs)

# Usage
r = KeepAliveRedis(ping_interval=30)
```

### 2. TCP Keepalive Issues

Network devices (firewalls, load balancers) can drop idle TCP connections.

Server-side configuration:

```bash
# In redis.conf
tcp-keepalive 300  # Send keepalive every 300 seconds
```

Client-side configuration:

```python
import redis
import socket

# Python with TCP keepalive options
r = redis.Redis(
    host='redis-host',
    port=6379,
    socket_keepalive=True,
    socket_keepalive_options={
        socket.TCP_KEEPIDLE: 60,    # Start keepalive after 60s idle
        socket.TCP_KEEPINTVL: 15,   # Send keepalive every 15s
        socket.TCP_KEEPCNT: 4       # Close after 4 failed probes
    }
)
```

```javascript
// Node.js with ioredis
const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis-host',
  port: 6379,
  keepAlive: 10000,  // Keepalive interval in ms
  noDelay: true
});
```

### 3. Maxclients Limit

When Redis reaches its connection limit, new connections fail and existing ones might be closed.

```bash
# Check current vs maximum clients
redis-cli INFO clients | grep connected_clients
redis-cli CONFIG GET maxclients

# Increase if needed
redis-cli CONFIG SET maxclients 20000
```

### 4. Memory Pressure - Client Output Buffer

When a client cannot receive data fast enough, its output buffer grows. Redis disconnects clients with oversized buffers.

```bash
# Check client output buffer limits
redis-cli CONFIG GET client-output-buffer-limit

# Format: <class> <hard> <soft> <soft-seconds>
# Default: "normal 0 0 0" means no limit
# Adjust for pubsub clients:
redis-cli CONFIG SET client-output-buffer-limit "pubsub 256mb 64mb 60"
```

### 5. Server Restart or Failover

Handle reconnection gracefully:

```python
import redis
from redis.exceptions import ConnectionError
import time

class ResilientRedis:
    """Redis client with automatic reconnection."""

    def __init__(self, host='localhost', port=6379, max_retries=5):
        self.host = host
        self.port = port
        self.max_retries = max_retries
        self.r = None
        self._connect()

    def _connect(self):
        self.r = redis.Redis(
            host=self.host,
            port=self.port,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True
        )

    def _execute_with_retry(self, func, *args, **kwargs):
        last_error = None

        for attempt in range(self.max_retries):
            try:
                return func(*args, **kwargs)
            except ConnectionError as e:
                last_error = e
                print(f"Connection lost, retry {attempt + 1}/{self.max_retries}")
                time.sleep(min(2 ** attempt, 30))  # Exponential backoff
                self._connect()

        raise last_error

    def get(self, key):
        return self._execute_with_retry(self.r.get, key)

    def set(self, key, value, **kwargs):
        return self._execute_with_retry(self.r.set, key, value, **kwargs)

# Usage
r = ResilientRedis()
value = r.get('mykey')  # Automatically reconnects if needed
```

### 6. Blocking Commands Timeout

Long-running blocking commands can cause timeout issues.

```python
# Bad: Blocking without timeout
value = r.blpop('queue', timeout=0)  # Blocks forever

# Good: Use reasonable timeout
value = r.blpop('queue', timeout=30)  # 30 second timeout
```

## Connection Pool Best Practices

### Python (redis-py)

```python
import redis

# Create a connection pool with proper settings
pool = redis.ConnectionPool(
    host='redis-host',
    port=6379,
    max_connections=50,
    socket_timeout=5,
    socket_connect_timeout=5,
    socket_keepalive=True,
    health_check_interval=30,  # Check connection health periodically
    retry_on_timeout=True
)

r = redis.Redis(connection_pool=pool)
```

### Node.js (ioredis)

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis-host',
  port: 6379,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) {
      return null;  // Stop retrying
    }
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET'];
    if (targetErrors.some(e => err.message.includes(e))) {
      return true;  // Reconnect
    }
    return false;
  }
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});
```

## Monitoring Connection Health

```python
import redis
import time

def monitor_connections(redis_client, interval=10):
    """Continuously monitor Redis connection health."""
    while True:
        try:
            info = redis_client.info('clients')
            stats = redis_client.info('stats')

            print(f"Connected clients: {info['connected_clients']}")
            print(f"Blocked clients: {info['blocked_clients']}")
            print(f"Rejected connections: {stats['rejected_connections']}")
            print(f"Total connections received: {stats['total_connections_received']}")

            # Alert on concerning metrics
            if info['connected_clients'] > 1000:
                print("WARNING: High connection count")

            if stats['rejected_connections'] > 0:
                print("WARNING: Connections being rejected")

        except redis.ConnectionError as e:
            print(f"Connection error: {e}")

        time.sleep(interval)

# Run in background
import threading
r = redis.Redis()
thread = threading.Thread(target=monitor_connections, args=(r,), daemon=True)
thread.start()
```

## Using Sentinel for High Availability

With Sentinel, connection closures during failover are handled automatically:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ('sentinel-1', 26379),
    ('sentinel-2', 26379),
    ('sentinel-3', 26379)
], socket_timeout=0.5)

# Get master connection (follows failover automatically)
master = sentinel.master_for('mymaster', socket_timeout=0.5)

# Get replica for reads
replica = sentinel.slave_for('mymaster', socket_timeout=0.5)

# Usage is transparent
master.set('key', 'value')
value = replica.get('key')
```

## Debugging Connection Issues

### Enable Debug Logging

```python
import logging
import redis

# Enable debug logging for redis-py
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('redis')
logger.setLevel(logging.DEBUG)

r = redis.Redis()
r.get('test')  # Will show connection debug info
```

### Check Network Path

```bash
# Test connectivity
telnet redis-host 6379

# Check for packet loss
ping redis-host

# Trace network path
traceroute redis-host

# Monitor TCP connections
netstat -an | grep 6379
ss -tn | grep 6379
```

---

Connection closures are often symptoms of underlying issues like network instability, resource limits, or configuration mismatches. The key is to implement proper error handling, use connection pools with health checks, and configure both client and server for resilience. With the right setup, your application can recover gracefully from any connection interruption.
