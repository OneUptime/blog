# How to Troubleshoot Redis Connection Timeout Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Troubleshooting, Networking, Timeout, Performance

Description: Diagnose Redis connection timeout errors caused by network latency, server overload, misconfigured timeouts, or connection pool exhaustion.

---

## What Causes Redis Connection Timeouts

A connection timeout means the client initiated a TCP connection but the server never responded within the configured deadline. Unlike "connection refused" (active rejection), a timeout suggests the server is unreachable, overloaded, or the network is dropping packets.

Common causes:

- Network congestion or packet loss between client and server
- Redis server is overloaded (high CPU, blocked by long commands)
- `tcp-backlog` too small, connections queuing
- Client connection pool exhausted
- Wrong host/port (different from "connection refused" if filtered by firewall)
- Cloud security group or VPC routing misconfiguration

## Step 1 - Check Network Latency

```bash
# Basic latency check
ping <redis-host>

# Measure Redis-specific round-trip latency
redis-cli -h <redis-host> --latency

# Continuous latency history
redis-cli -h <redis-host> --latency-history -i 5
```

Expected Redis latency on a LAN should be under 1ms. Cross-datacenter latency of 20-100ms is normal but should be accounted for in your timeout configuration.

## Step 2 - Check Redis Server Load

```bash
redis-cli -h <redis-host> INFO stats | grep -E 'total_commands|instantaneous_ops'
redis-cli -h <redis-host> INFO clients | grep -E 'connected_clients|blocked_clients'
redis-cli -h <redis-host> SLOWLOG GET 10
```

A high number of blocked clients or slow log entries indicates the server is processing expensive commands. Identify them:

```bash
redis-cli -h <redis-host> MONITOR
# Press Ctrl+C after a few seconds and review output
```

## Step 3 - Check TCP Backlog

The `tcp-backlog` setting controls how many incoming connections Redis will queue before dropping new ones. The kernel limit must also be raised.

```bash
# Check current setting in redis.conf
grep tcp-backlog /etc/redis/redis.conf

# Check kernel limit
cat /proc/sys/net/core/somaxconn
cat /proc/sys/net/ipv4/tcp_max_syn_backlog
```

If the kernel limit is lower than `tcp-backlog`, connections will be silently dropped. Raise both:

```bash
echo 511 > /proc/sys/net/core/somaxconn
echo 511 > /proc/sys/net/ipv4/tcp_max_syn_backlog
```

Make it permanent in `/etc/sysctl.conf`:

```text
net.core.somaxconn = 511
net.ipv4.tcp_max_syn_backlog = 511
```

## Step 4 - Check Connection Pool Configuration

If your application uses a connection pool, timeouts can occur when all connections are in use. Example with redis-py:

```python
import redis

# Default pool size may be too small under load
pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    max_connections=50,      # Increase if exhausted
    socket_connect_timeout=5,  # Seconds to wait for connection
    socket_timeout=5           # Seconds to wait for response
)
r = redis.Redis(connection_pool=pool)
```

Monitor pool usage:

```python
print(f"Pool connections in use: {len(pool._in_use_connections)}")
print(f"Pool connections available: {pool._created_connections - len(pool._in_use_connections)}")
```

## Step 5 - Check Redis timeout Configuration

Redis can forcibly close idle client connections. If your client holds a connection longer than `timeout` seconds without activity, Redis closes it and the next command will time out.

```bash
redis-cli CONFIG GET timeout
```

```bash
# Set to 0 to disable (not recommended for production with many clients)
redis-cli CONFIG SET timeout 300
```

Also check `tcp-keepalive`:

```bash
redis-cli CONFIG GET tcp-keepalive
# Recommended value: 300
redis-cli CONFIG SET tcp-keepalive 300
```

## Step 6 - Test with redis-cli Directly

Isolate whether the issue is the client library or the network:

```bash
# Simple connectivity test with explicit timeout
timeout 5 redis-cli -h <redis-host> -p 6379 PING

# If this hangs, the problem is network or server
# If this succeeds but your app times out, check client library config
```

## Step 7 - Check Cloud and Firewall Rules

AWS, GCP, and Azure security groups may have idle connection timeout rules (AWS NLB default is 350 seconds, ALB is 60 seconds). If Redis connections idle longer than the cloud provider's timeout, the connection is silently dropped but neither side knows until the next command.

Enable `tcp-keepalive` in Redis and configure keepalive in your client library to avoid this.

```python
import redis
import socket

pool = redis.ConnectionPool(
    host='redis-host',
    port=6379,
    socket_keepalive=True,
    socket_keepalive_options={
        socket.TCP_KEEPIDLE: 60,
        socket.TCP_KEEPINTVL: 10,
        socket.TCP_KEEPCNT: 3,
    }
)
```

## Summary

Redis connection timeouts have multiple root causes ranging from network issues to server overload to connection pool exhaustion. Start with latency measurement and server load checks, then verify TCP backlog settings and connection pool limits. Enable TCP keepalive on both the Redis server and client library to prevent silent connection drops from cloud load balancers and NAT gateways.
