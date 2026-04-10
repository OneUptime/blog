# How to Tune Redis for 100K+ Operations Per Second

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Throughput, Tuning, Scaling

Description: Learn how to configure Redis and your infrastructure to exceed 100,000 operations per second using pipelining, connection pools, IO threads, and hardware tuning.

---

A single Redis instance can handle 100K-1M+ ops/sec with proper tuning. Achieving this requires optimizing Redis configuration, client behavior, and the underlying OS.

## Verify Your Baseline

First, measure what you currently achieve:

```bash
redis-benchmark -h 127.0.0.1 -p 6379 -n 1000000 -c 100 -t set,get -q
```

```text
SET: 95243.90 requests per second
GET: 98039.22 requests per second
```

## Enable Multi-Threaded I/O

Redis 6+ supports multi-threaded network I/O (command processing stays single-threaded):

```text
# /etc/redis/redis.conf
io-threads 4
```

For a 4-core machine, use 2-3 I/O threads. For an 8-core machine, use up to 6. Redis recommends not exceeding 8 I/O threads regardless of core count.

## Disable Persistence

Persistence is the biggest throughput limiter:

```text
save ""
appendonly no
```

If you need persistence:

```text
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes
```

## Use Pipelining in Your Client

Pipelining is the single most impactful client-side change:

```python
import redis

r = redis.Redis(connection_pool=redis.ConnectionPool(
    host="127.0.0.1", port=6379,
    max_connections=100
))

# Pipeline in batches of 500
pipe = r.pipeline(transaction=False)
for i in range(500):
    pipe.set(f"key:{i}", f"value:{i}")
pipe.execute()
```

## Tune Connection Pool Size

Match connection pool size to concurrency:

```python
import socket

pool = redis.ConnectionPool(
    host="127.0.0.1",
    port=6379,
    max_connections=200,
    socket_keepalive=True,
    socket_keepalive_options={
        socket.TCP_KEEPIDLE: 60,
        socket.TCP_KEEPINTVL: 10,
        socket.TCP_KEEPCNT: 5
    }
)
```

## Optimize Linux Kernel Settings

```bash
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
sysctl -w vm.overcommit_memory=1
echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

## Use Unix Sockets for Local Clients

Unix sockets avoid TCP overhead entirely for same-host clients:

```text
# redis.conf
unixsocket /var/run/redis/redis.sock
unixsocketperm 770
```

```bash
redis-benchmark -s /var/run/redis/redis.sock -n 1000000 -c 100 -t set -q
```

## Verify You're Reaching Target

```bash
# With pipelining enabled
redis-benchmark -h 127.0.0.1 -p 6379 -n 1000000 -c 100 -P 16 -t set,get -q
```

```text
SET: 623441.40 requests per second
GET: 714285.69 requests per second
```

## Summary

Reach 100K+ Redis ops/sec by enabling multi-threaded I/O (`io-threads 4`), disabling or deferring persistence, using client-side pipelining, tuning Linux kernel parameters (TCP backlog, THP, overcommit), and using Unix sockets for local clients. With pipelining, a single Redis instance can easily exceed 500K ops/sec on modern hardware.
