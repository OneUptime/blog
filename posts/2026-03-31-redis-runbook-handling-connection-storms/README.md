# Redis Runbook: Handling Connection Storms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Connection, Runbook

Description: Runbook for diagnosing and mitigating Redis connection storms - covering detection, client limits, connection pooling, and graceful recovery steps.

---

A connection storm occurs when a large number of clients simultaneously try to connect to Redis, often after a restart or failover. This overwhelms the server and causes cascading failures. This runbook covers how to detect and recover from connection storms.

## Step 1: Detect the Storm

Check current connection count:

```bash
redis-cli INFO clients | grep -E "connected_clients|blocked_clients|tracking_clients"
```

Check the maximum configured connections:

```bash
redis-cli CONFIG GET maxclients
```

Check for rejected connections:

```bash
redis-cli INFO stats | grep "rejected_connections"
```

## Step 2: Identify Top Clients

List all connected clients:

```bash
redis-cli CLIENT LIST
```

Look for clients from the same IP flooding connections:

```bash
redis-cli CLIENT LIST | awk -F'addr=' '{print $2}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

## Step 3: Kill Idle or Problematic Clients

Kill a specific client by ID:

```bash
redis-cli CLIENT KILL ID <client-id>
```

Kill all clients from a specific IP:

```bash
redis-cli CLIENT LIST | grep "addr=<ip>:" | awk '{print $1}' | cut -d= -f2 | xargs -I{} redis-cli CLIENT KILL ID {}
```

Set a timeout for idle clients to prevent accumulation:

```bash
redis-cli CONFIG SET timeout 300
```

## Step 4: Raise the maxclients Limit Temporarily

If the limit is too low:

```bash
redis-cli CONFIG SET maxclients 10000
```

Also raise the OS file descriptor limit to support more connections:

```bash
ulimit -n 65535
```

## Step 5: Enable Connection Rate Limiting at the Proxy

If you use a proxy like HAProxy or Twemproxy in front of Redis, configure connection limits there to prevent storms from reaching Redis directly.

## Step 6: Fix Application-Side Connection Pooling

Most connection storms are caused by applications that create a new connection per request instead of using a connection pool. Fix this in your application:

```python
import redis

pool = redis.ConnectionPool(host='localhost', port=6379, max_connections=50)
r = redis.Redis(connection_pool=pool)
```

## Step 7: Add Backoff and Jitter for Reconnects

Applications should not reconnect immediately after a Redis restart. Implement exponential backoff with jitter:

```python
import redis
import time
import random

def connect_with_backoff(max_retries=5):
    for attempt in range(max_retries):
        try:
            r = redis.Redis(host='localhost', port=6379)
            r.ping()
            return r
        except redis.ConnectionError:
            sleep_time = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(sleep_time)
```

## Summary

Redis connection storms are best prevented by enforcing connection pooling in applications and implementing reconnection backoff. During an active storm, kill idle connections, raise the maxclients limit, and identify the source application to fix the root cause.
