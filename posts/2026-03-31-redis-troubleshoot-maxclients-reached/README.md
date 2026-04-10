# How to Troubleshoot Redis Maxclients Reached

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Connection, MaxClients, Troubleshooting, Performance

Description: Fix Redis ERR max number of clients reached errors by tuning maxclients, improving connection pooling, and identifying connection leaks in your application.

---

When Redis hits its `maxclients` limit, new connections are rejected with `ERR max number of clients reached`. This can cascade into application errors quickly. The fix involves both raising the limit where appropriate and fixing connection leaks or inefficient connection usage.

## Identify the Problem

```bash
# Check current connection count vs limit
redis-cli INFO clients | grep -E "connected_clients|maxclients"

# Check maxclients setting
redis-cli CONFIG GET maxclients
# Default: 10000

# See if connections are being rejected
redis-cli INFO stats | grep rejected_connections

# Get a snapshot of connected clients
redis-cli CLIENT LIST | wc -l
```

## Quick Fix: Increase maxclients

```bash
# Increase maxclients at runtime (takes effect immediately)
redis-cli CONFIG SET maxclients 20000

# Make permanent in redis.conf
sudo sed -i 's/^maxclients .*/maxclients 20000/' /etc/redis/redis.conf
# Or add: echo "maxclients 20000" >> /etc/redis/redis.conf

# Persist current runtime config to redis.conf
redis-cli CONFIG REWRITE
```

Note: `maxclients` cannot exceed the OS file descriptor limit minus 32 (reserved for internal use).

## Fix the OS File Descriptor Limit

```bash
# Check current file descriptor limits
ulimit -n  # per-process limit
cat /proc/sys/fs/file-max  # system-wide limit

# Increase per-process limit for Redis
# In /etc/security/limits.conf:
redis soft nofile 65536
redis hard nofile 65536

# Or in the systemd service unit:
sudo systemctl edit redis
# Add:
# [Service]
# LimitNOFILE=65536

sudo systemctl daemon-reload
sudo systemctl restart redis

# Verify
redis-cli CONFIG GET maxclients
```

## Find Connection Leaks

If `connected_clients` keeps growing, you likely have a connection leak:

```bash
# Watch connected clients over time
watch -n2 'redis-cli INFO clients | grep connected_clients'

# Get details about each connection
redis-cli CLIENT LIST

# Sample output fields:
# id=12345 addr=10.0.0.5:52341 fd=23 name= age=3600 idle=3600 flags=N
# "age=3600 idle=3600" means a connection sitting idle for 1 hour = leak

# Find connections idle for more than 5 minutes (300 seconds)
redis-cli CLIENT LIST | awk -F'[ =]' '{
  for(i=1;i<=NF;i++) {
    if($i=="idle") idle_val=$(i+1);
    if($i=="addr") addr_val=$(i+1);
    if($i=="cmd") cmd_val=$(i+1);
  }
  if(idle_val+0 > 300) print idle_val"s idle", addr_val, cmd_val
}'
```

## Set a Client Timeout

Automatically close idle connections:

```bash
# Set timeout in seconds (0 = no timeout)
redis-cli CONFIG SET timeout 300  # close idle connections after 5 minutes

# Set TCP keepalive
redis-cli CONFIG SET tcp-keepalive 60

# Persist
redis-cli CONFIG REWRITE
```

## Fix Connection Pooling in Your Application

Most connection leaks come from improper connection pool configuration. Here are fixes for common clients:

```python
# Python - redis-py with proper connection pool
import redis

# BAD: creating a new connection per request
def get_value(key):
    r = redis.Redis(host="localhost")  # creates new connection every call!
    return r.get(key)

# GOOD: use a shared connection pool
pool = redis.ConnectionPool(
    host="localhost",
    port=6379,
    max_connections=20,  # match your expected concurrency
    decode_responses=True
)
r = redis.Redis(connection_pool=pool)

def get_value(key):
    return r.get(key)  # reuses connections from pool
```

```javascript
// Node.js - ioredis with connection pool
const Redis = require("ioredis");

// BAD: creating connections without limits
const client = new Redis();

// GOOD: configure reasonable limits
const client = new Redis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

// Always close connections properly
process.on("SIGTERM", async () => {
  await client.quit();
});
```

## Kill Stale Connections

```bash
# Kill all idle connections (careful - this disconnects all clients)
redis-cli CLIENT KILL ID $(redis-cli CLIENT LIST | awk -F'[ =]' '{
  for(i=1;i<=NF;i++) {
    if($i=="idle") if($(i+1)+0 > 600) {
      for(j=1;j<=NF;j++) if($j=="id") print $(j+1)
    }
  }
}')

# Kill connections from a specific IP
redis-cli CLIENT KILL ADDR 10.0.0.5:52341

# Kill by client ID
redis-cli CLIENT KILL ID 12345
```

## Monitor Connections Continuously

```bash
# Alert script - warn when connections exceed 80% of maxclients
MAXCLIENTS=$(redis-cli CONFIG GET maxclients | tail -1)
CURRENT=$(redis-cli INFO clients | grep connected_clients | cut -d: -f2 | tr -d '\r')
THRESHOLD=$((MAXCLIENTS * 80 / 100))

if [ "$CURRENT" -gt "$THRESHOLD" ]; then
  echo "WARNING: Redis connections at $CURRENT/$MAXCLIENTS ($(( CURRENT * 100 / MAXCLIENTS ))%)"
fi
```

## Summary

Redis `maxclients` errors are fixed by increasing the limit (with corresponding OS file descriptor limits) and eliminating connection leaks. Set `timeout` to auto-close idle connections, configure proper connection pools in your application with explicit `max_connections` limits, and monitor `connected_clients` and `rejected_connections` metrics to catch growth before it becomes an outage.
