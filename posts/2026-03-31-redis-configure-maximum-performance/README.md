# How to Configure Redis for Maximum Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Configuration, Tuning

Description: Configure Redis for maximum throughput and minimum latency by tuning persistence, networking, memory, and Linux kernel settings for production deployments.

---

Redis can achieve over 1 million operations per second with the right configuration. This guide covers the key settings that have the most impact on throughput and latency.

## Disable or Minimize Persistence

Persistence is the largest performance overhead. For a pure cache:

```text
# redis.conf - disable persistence
save ""
appendonly no
```

For workloads that need durability but can tolerate one second of data loss:

```text
save 900 1
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes
```

Never use `appendfsync always` for high-performance workloads.

## Tune the I/O Thread Count (Redis 6+)

Redis 6 introduced I/O threading for read/write operations. Enable it when you have a multi-core CPU and high client concurrency:

```text
# redis.conf
io-threads 4
io-threads-do-reads yes
```

Start with half the CPU core count and benchmark:

```bash
redis-benchmark -n 1000000 -c 200 -q
```

## Increase TCP Backlog and Connection Limits

```text
# redis.conf
tcp-backlog 65535
maxclients 10000
tcp-keepalive 300
```

On the OS level:

```bash
sudo sysctl -w net.core.somaxconn=65535
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535
```

## Optimize Memory Settings

```text
# redis.conf
# Use jemalloc for better memory allocation
# (default on most Linux builds)

# Set memory policy to evict least-recently-used keys
maxmemory 8gb
maxmemory-policy allkeys-lru

# Reduce fragmentation
activedefrag yes
active-defrag-ignore-bytes 100mb
active-defrag-threshold-lower 10
```

## Disable Slow Operations

Slow commands like KEYS block Redis. Rename or disable them:

```text
rename-command KEYS ""
```

Use `SCAN` instead of `KEYS` in application code:

```python
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match='session:*', count=100)
    process(keys)
    if cursor == 0:
        break
```

## Linux Kernel Tuning

```bash
# Enable overcommit for fork-based saves
sudo sysctl -w vm.overcommit_memory=1

# Reduce swappiness
sudo sysctl -w vm.swappiness=0

# Disable transparent huge pages
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag

# Increase file descriptor limit
ulimit -n 65536
echo 'redis soft nofile 65536' | sudo tee -a /etc/security/limits.conf
echo 'redis hard nofile 65536' | sudo tee -a /etc/security/limits.conf
```

## Benchmark Performance

Use `redis-benchmark` to measure current performance:

```bash
# Basic throughput test
redis-benchmark -n 1000000 -q

# Pipeline test (simulates batched operations)
redis-benchmark -n 1000000 -q -P 16

# Test specific command with multiple clients
redis-benchmark -n 100000 -c 50 -q -t get
```

Sample output:

```text
PING_INLINE: 142857.14 requests per second
PING_MBULK: 147058.82 requests per second
SET: 135135.14 requests per second
GET: 153846.16 requests per second
LPUSH: 127389.70 requests per second
```

## Latency Monitoring

```bash
# Measure live latency
redis-cli --latency -h localhost

# View latency history
redis-cli LATENCY HISTORY event

# Enable latency monitoring for slow commands
redis-cli CONFIG SET latency-monitor-threshold 1
redis-cli LATENCY LATEST
```

## Summary

Maximum Redis performance requires disabling or minimizing persistence, enabling I/O threads on multi-core systems, tuning TCP settings for high concurrency, and applying Linux kernel optimizations including overcommit memory, zero swappiness, and disabled THP. Benchmark with `redis-benchmark` after each change to confirm improvements, and use `LATENCY LATEST` to identify any remaining latency sources.
