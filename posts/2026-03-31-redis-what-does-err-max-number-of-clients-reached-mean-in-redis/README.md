# What Does 'ERR max number of clients reached' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, Max Clients, Connection Limit, Troubleshooting

Description: Learn why Redis returns 'ERR max number of clients reached', how to diagnose connection exhaustion, and how to fix it with proper connection pooling and configuration.

---

## What Is This Error

When Redis has reached its maximum number of simultaneous client connections, new connection attempts receive:

```text
(error) ERR max number of clients reached
```

Redis enforces a hard limit on concurrent connections controlled by the `maxclients` configuration directive. By default, this is 10,000. When all connection slots are occupied, Redis refuses new connections until an existing one closes.

## Why This Happens

### Connection Leaks

The most common cause is connection leaks - application code that opens Redis connections and never closes them. Each leaked connection holds a slot until the process restarts or the connection times out.

```python
# Bad - creates a new connection per request, never releases it
import redis

def get_user(user_id):
    r = redis.Redis()  # New connection every call
    return r.get(f"user:{user_id}")
```

### Too Many Application Instances

If you have 100 application pods each with a connection pool of 50, you need 5,000 connection slots. Adding more pods or increasing pool sizes can exhaust the limit.

### No Connection Pooling

Using a new connection for every operation without a pool floods Redis with connections.

### Slow Clients Holding Connections

Clients blocked on long operations or slow consumers can hold connections open without actively using them.

## How to Diagnose

### Check Current Client Count

```bash
redis-cli CLIENT LIST | wc -l
redis-cli INFO clients
```

Output from `INFO clients`:

```text
connected_clients:9998
cluster_connections:0
maxclients:10000
client_recent_max_input_buffer:20480
client_recent_max_output_buffer:0
blocked_clients:2
tracking_clients:0
clients_in_timeout_table:0
```

### Identify Which Clients Are Connected

```bash
redis-cli CLIENT LIST
```

Sample output showing client addresses and states:

```text
id=12345 addr=10.0.1.5:52341 fd=10 name= age=3600 idle=0 flags=N db=0 sub=0 psub=0 multi=-1 qbuf=0 qbuf-free=32768 argv-mem=10 obl=0 oll=0 omem=0 events=r cmd=get user=default library-name= library-ver=
```

Look for clients with high `idle` values - these may be leaked connections.

### Count Connections by Source IP

```bash
redis-cli CLIENT LIST | awk -F'[ =]' '{for(i=1;i<=NF;i++) if($i=="addr") print $(i+1)}' | cut -d: -f1 | sort | uniq -c | sort -rn
```

This shows which IP addresses have the most connections.

## How to Fix

### 1. Increase maxclients

Temporarily increase the limit while you fix the root cause:

```bash
# Set at runtime (takes effect immediately)
redis-cli CONFIG SET maxclients 20000

# Set permanently in redis.conf
maxclients 20000
```

### 2. Use Connection Pooling

Replace direct connections with a connection pool:

```python
# Good - shared connection pool
import redis

pool = redis.ConnectionPool(host='localhost', port=6379, max_connections=50)

def get_user(user_id):
    r = redis.Redis(connection_pool=pool)
    return r.get(f"user:{user_id}")
```

In Node.js with ioredis, a single client instance maintains one persistent connection and handles command pipelining automatically:

```javascript
const Redis = require('ioredis');
// Share this single instance across your application
const redis = new Redis({ host: 'localhost', port: 6379 });
```

### 3. Configure TCP Keepalive

Enable TCP keepalive so dead connections are detected and closed:

```bash
# In redis.conf
tcp-keepalive 300
```

This sends keepalive probes to clients that have been idle for 300 seconds and closes connections where the probe fails.

### 4. Set Client Timeout

Close idle connections automatically:

```bash
# In redis.conf - close connections idle for 60 seconds
timeout 60

# Or at runtime
redis-cli CONFIG SET timeout 60
```

### 5. Kill Idle Connections Manually

```bash
# Kill all connections idle for more than 3600 seconds
redis-cli CLIENT LIST | awk '{id="";idle=0;for(i=1;i<=NF;i++){split($i,kv,"=");if(kv[1]=="id")id=kv[2];if(kv[1]=="idle")idle=kv[2]+0}if(idle>3600&&id!="")print id}' | xargs -I{} redis-cli CLIENT KILL ID {}
```

### 6. Monitor Connected Clients in Prometheus

```text
# Alert when connected clients exceed 80% of maxclients
redis_connected_clients / redis_config_maxclients > 0.80
```

## Preventing the Error

- Use connection pools everywhere and size them appropriately
- Set `timeout` in Redis to reclaim idle connections
- Set `tcp-keepalive 300` to detect dead connections
- Monitor `connected_clients` and alert before hitting the limit
- In Kubernetes, tune HPA carefully so pod count does not multiply connections beyond capacity

## Summary

The "ERR max number of clients reached" error means Redis has hit its `maxclients` limit. Fix it immediately by increasing `maxclients`, then address the root cause by implementing connection pooling, enabling `timeout` and `tcp-keepalive` in redis.conf, and monitoring connected clients as a key Redis health metric.
