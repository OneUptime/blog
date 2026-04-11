# How to Design Redis for Sub-Millisecond Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Latency

Description: Learn the key configuration and architectural techniques to achieve consistent sub-millisecond Redis latency in production, from CPU pinning to network tuning.

---

Redis is fast by default, but achieving consistent sub-millisecond p99 latency requires careful OS, network, and configuration tuning. The default Redis install can hit microsecond-level latency on modern hardware with the right setup.

## Measure Your Baseline

```bash
# Intrinsic latency - tests OS scheduler jitter
redis-cli --intrinsic-latency 10

# Benchmark with pipelining
redis-benchmark -q -n 100000 -P 16 -c 50

# Latency monitoring (Redis 2.8.13+)
redis-cli LATENCY LATEST
redis-cli LATENCY HISTORY event
```

## Disable Transparent Huge Pages

THP causes memory allocation stalls that spike latency.

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag

# Make persistent
echo 'echo never > /sys/kernel/mm/transparent_hugepage/enabled' | sudo tee -a /etc/rc.local
```

## Pin Redis to a Dedicated CPU Core

```bash
# Pin redis-server to core 2
taskset -c 2 redis-server /etc/redis/redis.conf

# Or use numactl
numactl --cpunodebind=0 --membind=0 redis-server /etc/redis/redis.conf
```

## Tune TCP Stack

```bash
# /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_tw_reuse = 1

sudo sysctl -p
```

Also configure Redis `tcp-backlog`:

```text
# redis.conf
tcp-backlog 511
```

## Disable Save and AOF for Pure Cache Mode

Persistence operations can cause latency spikes:

```text
# redis.conf - disable RDB
save ""

# Disable AOF
appendonly no
```

If you need persistence, use AOF with `appendfsync everysec` and offload to a replica:

```text
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes
```

## Use Pipelining to Batch Commands

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

pipe = r.pipeline(transaction=False)
for i in range(1000):
    pipe.set(f'key:{i}', f'value:{i}')
pipe.execute()
```

## Use Unix Domain Sockets for Local Connections

Unix sockets eliminate TCP overhead entirely for local clients:

```text
# redis.conf
unixsocket /var/run/redis/redis.sock
unixsocketperm 700
```

```python
r = redis.Redis(unix_socket_path='/var/run/redis/redis.sock', decode_responses=True)
```

## Set CPU Frequency to Performance Mode

```bash
sudo cpupower frequency-set --governor performance
```

## Avoid Blocking Commands in Production

Commands like `KEYS *`, `SMEMBERS` on large sets, and `SORT` block the event loop. Use `SCAN` instead:

```bash
redis-cli --scan --pattern 'user:*' | head -20
```

## Summary

Sub-millisecond Redis latency requires disabling THP, pinning CPU, tuning TCP, disabling persistence for hot paths, and using pipelining or Unix sockets. Measure with `--intrinsic-latency` and `LATENCY LATEST` to find bottlenecks. With these changes, p99 latency under 500 microseconds is achievable on commodity hardware.
