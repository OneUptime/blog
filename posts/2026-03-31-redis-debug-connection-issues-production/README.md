# How to Debug Redis Connection Issues in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, Operation

Description: Learn how to systematically debug Redis connection issues in production using Redis CLI, monitoring commands, network tools, and application-level diagnostics.

---

Redis connection issues in production rarely have obvious causes. This guide walks through a systematic debugging process to identify whether the problem is in your application, the network, or Redis itself.

## Step 1: Verify Basic Connectivity

```bash
# Test TCP connectivity from the application server
nc -zv redis-host 6379

# Or with redis-cli
redis-cli -h redis-host -p 6379 ping

# If using TLS
redis-cli -h redis-host -p 6380 --tls ping
```

## Step 2: Check Redis Server State

```bash
# Check connected clients and limits
redis-cli INFO clients

# Check if server is loading (startup)
redis-cli INFO persistence | grep loading

# Check slow commands
redis-cli SLOWLOG GET 25

# Check current operation (what is Redis doing right now?)
redis-cli INFO stats | grep instantaneous_ops
```

## Step 3: Identify Blocked or Slow Clients

```bash
# List all connected clients
redis-cli CLIENT LIST

# Look for clients in state "blocked" or with high idle time
redis-cli CLIENT LIST | grep -i "cmd=blpop\|flags=b"

# Kill a specific problematic client (if needed)
redis-cli CLIENT KILL ID 12345
```

## Step 4: Check Application Pool Metrics

In Python, inspect the pool state:

```python
import redis

pool = redis.ConnectionPool(host="localhost", port=6379, max_connections=50)
client = redis.Redis(connection_pool=pool)

def get_pool_stats(pool):
    return {
        "available": len(pool._available_connections),
        "in_use": len(pool._in_use_connections),
        "max": pool.max_connections,
    }

print(get_pool_stats(pool))
```

## Step 5: Capture Network-Level Evidence

```bash
# Count TIME_WAIT connections (indicates rapid connect/disconnect cycling)
ss -s | grep TIME-WAIT

# Show connections to Redis port
ss -tnp | grep 6379

# Packet capture for TLS issues (capture handshake)
tcpdump -i eth0 -w /tmp/redis.pcap 'host redis-host and port 6379'
```

## Step 6: Enable Redis Logging Temporarily

```bash
# Increase log verbosity in redis.conf
# loglevel debug  (generates a lot of output)

# Or at runtime
redis-cli CONFIG SET loglevel verbose

# Watch the log
tail -f /var/log/redis/redis-server.log | grep -i "error\|fail\|timeout"

# Reset after debugging
redis-cli CONFIG SET loglevel notice
```

## Step 7: Check the MONITOR Stream

```bash
# WARNING: Only use in low-traffic periods - impacts performance
redis-cli MONITOR | head -100
```

## Common Root Causes and Fixes

| Symptom | Likely Cause | Fix |
|---|---|---|
| ERR max number of clients | Pool exhaustion | Increase maxclients or pool size |
| Connection refused | Redis not running | Restart Redis |
| ETIMEDOUT | Network firewall | Check security groups |
| ECONNRESET | Firewall idle timeout | Enable TCP keepalives |
| READONLY | Connected to replica | Redirect writes to primary |

## Summary

Debugging Redis connection issues requires working through layers: first verify TCP connectivity, then check Redis server state with INFO commands, then inspect application pool metrics, and finally capture network-level evidence. Always check `connected_clients` against `maxclients` first - it's the most common cause of production connection failures.
