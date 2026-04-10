# How to Monitor Redis Connected Clients and Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitoring, Client, Connection, INFO

Description: Learn how to monitor Redis connected clients, detect connection leaks, and track blocked clients using INFO clients and the CLIENT LIST command.

---

Too many connections waste memory and file descriptors; too few cause connection pool exhaustion. Monitoring Redis connections helps you size connection pools correctly and catch leaks before they cause outages.

## INFO clients - Connection Overview

```bash
redis-cli INFO clients
```

```text
connected_clients:127
cluster_connections:0
maxclients:10000
client_recent_max_input_buffer:20480
client_recent_max_output_buffer:0
blocked_clients:3
tracking_clients:0
clients_in_timeout_table:0
total_blocking_keys:2
```

Key fields:

| Field | What It Tells You |
|---|---|
| `connected_clients` | Current open connections |
| `maxclients` | Configured connection limit |
| `blocked_clients` | Clients waiting on BLPOP/BRPOP/etc |
| `tracking_clients` | Clients using client-side caching |

## CLIENT LIST - Per-Connection Details

```bash
redis-cli CLIENT LIST
```

```text
id=12 addr=10.0.1.10:52341 laddr=10.0.1.5:6379 fd=18 name=api-worker age=42 idle=0 flags=N db=0 sub=0 psub=0 ssub=0 multi=-1 watch=0 qbuf=0 qbuf-free=32768 argv-mem=10 multi-mem=0 tot-mem=22370 rbs=16384 rbp=16384 obl=0 oll=0 omem=0 events=r cmd=get user=appuser library-name=redis-py library-ver=5.0.0
```

Focus on:
- `addr`: source IP - identify which app server owns this connection
- `age`: seconds since connection opened
- `idle`: seconds since last command - high idle times suggest connection leaks
- `cmd`: last command executed
- `flags`: `b` = blocked, `x` = MULTI, `S` = replica

## Find Idle Connection Leaks

```bash
redis-cli CLIENT LIST | grep "idle=[1-9][0-9][0-9][0-9]"
```

Connections idle for thousands of seconds are likely leaked. Kill them:

```bash
redis-cli CLIENT KILL ID 12
```

## Set Connection Timeouts

Automatically close idle connections:

```text
# /etc/redis/redis.conf
timeout 300
tcp-keepalive 60
```

`timeout 300` closes connections idle for 5 minutes.

## Track Connections Over Time

```python
import redis
import time

r = redis.Redis()

while True:
    info = r.info("clients")
    stats = r.info("stats")
    print(
        f"Connected: {info['connected_clients']} | "
        f"Blocked: {info['blocked_clients']} | "
        f"Total connections: {stats['total_connections_received']}"
    )
    time.sleep(10)
```

## Alert Thresholds

- `connected_clients / maxclients > 0.8`: approaching connection limit
- `blocked_clients` growing continuously: blocked command accumulation
- `total_connections_received` rate high with low `connected_clients`: short-lived connections, increase pool size

## Summary

Monitor Redis connections with `INFO clients` for aggregate counts and `CLIENT LIST` for per-connection details. Set `timeout` in `redis.conf` to automatically close idle connections and prevent leaks. Alert when connected clients exceed 80% of `maxclients` or when blocked client counts trend upward.
