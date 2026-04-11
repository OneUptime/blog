# How to Reduce Redis Latency in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Latency, Production, Optimization

Description: A practical guide to diagnosing and reducing Redis latency in production through OS tuning, Redis configuration, and application-level best practices.

---

## Understanding Redis Latency Sources

Redis is designed for sub-millisecond response times, but production deployments often experience latency spikes. Latency can originate from several sources:
- **Network latency** - Round-trip time between client and server
- **Slow commands** - O(N) commands like KEYS, SMEMBERS on large sets
- **Memory pressure** - Swapping, fragmentation, or eviction overhead
- **OS interference** - CPU scheduling, THP (Transparent Huge Pages), disk I/O
- **Persistence overhead** - RDB saves or AOF fsync blocking the main thread

## Step 1: Measure Current Latency

Use the built-in latency tools:
```bash
# Check intrinsic latency (OS baseline)
redis-cli --intrinsic-latency 10

# Check network latency to Redis
redis-cli --latency -h redis.host -p 6379

# Get continuous latency history
redis-cli --latency-history -h redis.host -p 6379 -i 5
```

Check the LATENCY LATEST command:
```bash
redis-cli LATENCY LATEST
```
```text
1) 1) "command"
   2) (integer) 1711900800
   3) (integer) 4
   4) (integer) 120
```

## Step 2: Disable Transparent Huge Pages

THP causes latency spikes during memory compaction. Disable it permanently:
```bash
# Check current status
cat /sys/kernel/mm/transparent_hugepage/enabled

# Disable immediately
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Make permanent (add to /etc/rc.local or systemd)
cat >> /etc/rc.local << 'EOF'
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
EOF
```

## Step 3: Prevent Memory Swapping

Swapping is catastrophic for Redis latency. Ensure Redis stays in RAM:
```bash
# Check if Redis is swapping
cat /proc/$(pgrep redis-server)/status | grep VmSwap

# Set vm.swappiness to 0 or 1
echo 0 > /proc/sys/vm/swappiness
# Persist in /etc/sysctl.conf:
echo "vm.swappiness=0" >> /etc/sysctl.conf

# Disable overcommit to avoid background save failures
# echo "vm.overcommit_memory=1" >> /etc/sysctl.conf
```

In `redis.conf`, consider using `maxmemory` to keep Redis well within available RAM:
```text
maxmemory 6gb
maxmemory-policy allkeys-lru
```

## Step 4: Use Slower fsync for AOF

The default `everysec` AOF fsync is performed by a background thread once per second. The main thread can still stall if a previous background fsync has not completed in time. If you can tolerate up to 1 second of data loss, this is already a good trade-off. If you need faster responses and can tolerate more data loss:
```text
appendfsync no
```

Or defer fsync during large rewrites:
```text
no-appendfsync-on-rewrite yes
```

## Step 5: Avoid Blocking Commands

Common blocking operations:
```bash
# NEVER use KEYS in production - use SCAN instead
KEYS user:*  # blocks while scanning entire keyspace

# Use SCAN instead
SCAN 0 MATCH user:* COUNT 100

# SMEMBERS on huge sets blocks - use SSCAN
SSCAN myset 0 COUNT 100

# LRANGE on huge lists - paginate
LRANGE mylist 0 99  # first 100 items only
```

## Step 6: Enable TCP Keep-Alive and Tune Timeout

```text
# redis.conf
tcp-keepalive 300
timeout 0
tcp-backlog 511
```

Increase the Linux TCP backlog:
```bash
echo 65535 > /proc/sys/net/core/somaxconn
echo 65535 > /proc/sys/net/ipv4/tcp_max_syn_backlog
```

## Step 7: Pin Redis to a CPU Core

CPU scheduling interruptions cause latency spikes. Pin Redis to a dedicated core:
```bash
# Get Redis PID
redis_pid=$(pgrep redis-server)

# Pin to CPU core 2
taskset -cp 2 $redis_pid

# Or use numactl for NUMA systems
numactl --cpunodebind=0 --membind=0 redis-server /etc/redis/redis.conf
```

## Step 8: Use Unix Sockets for Local Connections

If your application runs on the same host as Redis, Unix sockets eliminate TCP overhead:
```text
# redis.conf
unixsocket /var/run/redis/redis.sock
unixsocketperm 770
```

Application connection (Python example):
```python
import redis
r = redis.StrictRedis(unix_socket_path='/var/run/redis/redis.sock', decode_responses=True)
```

## Step 9: Use Pipelining and Connection Pooling

Application-level optimizations reduce round trips:
```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  // Connection pool via cluster mode or lazyConnect
});

// Use pipelining to batch commands
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.get('key1');
const results = await pipeline.exec();
```

## Step 10: Monitor and Alert on Latency

Set up continuous latency monitoring with the Redis exporter and Prometheus:
```bash
# Check latency thresholds
redis-cli CONFIG SET latency-monitor-threshold 25  # alert on commands >25ms
redis-cli CONFIG SET latency-tracking yes
redis-cli LATENCY LATEST
redis-cli LATENCY HISTORY command
```

## Summary

Reducing Redis latency in production is a multi-layered effort. Start by disabling THP and preventing swap usage at the OS level, then eliminate blocking commands in your application code, and use pipelining with connection pooling to minimize round trips. Monitor latency continuously with `LATENCY LATEST` and the Redis exporter so you can catch regressions before they impact users.
