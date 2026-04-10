# How to Configure Redis Timeout Settings for Idle Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Timeout, Connection, Configuration, Network

Description: Learn how to configure Redis timeout and tcp-keepalive to close idle connections, prevent connection leaks, and tune connection behavior for your environment.

---

By default, Redis never disconnects idle clients. In production, idle connections accumulate from crashed clients, leaked connection pool entries, and load balancer probes, consuming memory and file descriptors. Proper timeout configuration prevents these issues.

## The timeout Setting

The `timeout` parameter closes a client connection after it has been idle for the specified number of seconds. A value of `0` means connections are never closed due to idleness.

```bash
# Check current timeout
CONFIG GET timeout
# Returns: 0 (disabled by default)

# Set a 300-second (5 minute) idle timeout
CONFIG SET timeout 300
```

```bash
# redis.conf
timeout 300
```

## What "Idle" Means

A connection is considered idle when no command has been sent. This includes:
- Clients connected but waiting (e.g., long-polling loops)
- Crashed application processes that did not close their socket
- Connection pool entries that were allocated but not returned

```bash
# View all connected clients and their idle time
CLIENT LIST
# Output: id=... addr=... idle=47 ...
# idle=47 means the client has been idle for 47 seconds
```

## Impact on Connection Pools

If your application uses a connection pool, the `timeout` value must be greater than the pool's maximum idle time, or Redis will close connections that the pool still thinks are valid:

```python
import redis

# Pool keep_alive interval should be less than Redis timeout
pool = redis.ConnectionPool(
    host="localhost",
    port=6379,
    max_connections=50,
    socket_timeout=5,         # Command timeout
    socket_connect_timeout=2  # Connection timeout
)
r = redis.Redis(connection_pool=pool)
```

Most Redis client libraries handle connection validation with health checks. Set `timeout` to at least 2x your pool's idle health check interval.

## Setting Timeout in Different Environments

```bash
# Development: short timeout to catch leaks early
CONFIG SET timeout 60

# Production with connection pools: longer timeout
CONFIG SET timeout 0      # Let pool manage lifecycle

# Production without pools or with many microservices:
CONFIG SET timeout 300    # 5 minutes
```

## tcp-keepalive vs timeout

These two settings work differently:

| Setting | Mechanism | Default |
|---------|-----------|---------|
| `timeout` | Redis-level idle timer | 0 (disabled) |
| `tcp-keepalive` | OS-level TCP keepalive probe | 300 seconds |

```bash
CONFIG GET tcp-keepalive
# Returns: 300 (seconds between keepalive probes)
```

`tcp-keepalive` detects broken TCP connections at the OS level (e.g., network failure, client crash). `timeout` closes connections that are healthy but idle.

## Monitoring Idle Connections

```bash
# Count connected clients
INFO clients | grep connected_clients

# Find clients idle for more than 60 seconds
redis-cli CLIENT LIST | awk -F' ' '{for(i=1;i<=NF;i++) if($i~/^idle=/) print $i}' | sort -t= -k2 -n
```

```python
def find_idle_clients(min_idle_seconds=60):
    """Find clients idle longer than threshold."""
    client_list = r.client_list()
    idle_clients = [
        c for c in client_list
        if c.get("idle", 0) >= min_idle_seconds
    ]
    return idle_clients

idle = find_idle_clients(60)
for c in idle:
    print(f"Client {c['addr']} idle for {c['idle']}s, cmd={c['cmd']}")
```

## Killing Idle Clients Manually

```bash
# Kill a specific client by ID
CLIENT KILL ID 123

# Kill all clients idle more than N seconds
CLIENT NO-EVICT ON  # Protect admin connections first
```

```python
def kill_idle_clients(max_idle_seconds=300):
    """Kill connections idle longer than threshold."""
    clients = r.client_list()
    killed = 0
    for c in clients:
        if c.get("idle", 0) > max_idle_seconds:
            try:
                r.client_kill_filter(_id=c["id"])
                killed += 1
            except redis.ResponseError:
                pass  # Client may have disconnected already
    return killed
```

## Summary

Redis `timeout` closes idle client connections after a configurable number of seconds, preventing connection leaks from crashed clients and unmanaged connection pools. Set `timeout` to 0 when using a well-managed connection pool that handles idle connections itself, or to a reasonable value (300+ seconds) when clients connect directly. Complement `timeout` with `tcp-keepalive` to detect broken TCP connections at the OS level.
