# How to Configure Redis IO Threads for Multi-Threading

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IO Thread, Multi-Threading, Performance, Configuration

Description: Learn how to enable and configure Redis IO threads to parallelize network I/O across CPU cores, improving throughput for high-connection, large-payload workloads.

---

Redis has a single-threaded command execution model, but since Redis 6.0 it can use multiple threads for reading and writing network I/O. This allows Redis to saturate multi-core CPUs when the bottleneck is network I/O rather than command processing.

## The Threading Model

Redis execution remains single-threaded for command processing to avoid locking complexity. IO threads add parallelism only at the network layer:

```text
Without IO threads:
  Main thread: Read req -> Parse -> Execute -> Write resp -> Repeat

With IO threads (io-threads=4):
  IO thread 1: Read req from client 1-250
  IO thread 2: Read req from client 251-500
  ...
  Main thread: Parse + Execute all requests -> Signal IO threads
  IO thread 1: Write resp to client 1-250
  IO thread 2: Write resp to client 251-500
```

## Enabling IO Threads

IO threads are disabled by default. Enable them in `redis.conf`:

```bash
# redis.conf
io-threads 4
io-threads-do-reads yes   # Also use threads for reads (not just writes)
```

```bash
# Or at runtime (requires restart to take effect)
# io-threads cannot be changed at runtime via CONFIG SET
# Requires redis.conf edit + restart
```

## Choosing the Right Thread Count

```bash
# Recommended values from the Redis documentation:
# 4-core server: io-threads 2 or 3
# 8-core server: io-threads 6
# Using more than 8 threads is unlikely to help much.
```

Do not exceed CPU core count:

```bash
# Check CPU cores
nproc --all
# Example output: 8

# Recommended for 8 cores (per Redis docs):
io-threads 6
```

## When IO Threads Help (and When They Don't)

IO threading improves performance primarily when:
- High number of concurrent connections (100+)
- Large request/response payloads (e.g., `MGET` with many keys, large string values)
- Network I/O is the bottleneck (not CPU-bound command processing)

IO threading does **not** help when:
- Commands are CPU-intensive (e.g., large `SORT`, Lua scripts)
- Very few clients with small payloads
- The main thread is the bottleneck

```bash
# Check if you're network-bound or CPU-bound
redis-cli INFO stats | grep instantaneous_ops_per_sec
redis-cli INFO cpu | grep used_cpu_sys

# Network-bound: high ops/sec but CPU is not pegged
# CPU-bound: CPU at 100%, ops/sec limited
```

## Benchmarking With and Without IO Threads

```bash
# Without IO threads (baseline)
redis-server --io-threads 1 --daemonize yes --port 6380
redis-benchmark -h 127.0.0.1 -p 6380 -n 1000000 -c 100 --pipeline 16

# With IO threads
redis-server --io-threads 4 --io-threads-do-reads yes --daemonize yes --port 6381
redis-benchmark -h 127.0.0.1 -p 6381 -n 1000000 -c 100 --pipeline 16
```

## Monitoring IO Thread Performance

```bash
# Check Redis server info
redis-cli INFO server | grep redis_version

# Monitor with redis-cli --stat
redis-cli --stat

# Expected improvement with IO threads: 2-4x throughput increase
# for high-concurrency, large-payload workloads
```

## TLS and IO Threads

In Redis 6.x and 7.x, IO threads do not work when TLS is enabled because TLS handling cannot be safely parallelized in those versions. Starting with Redis 8.0, IO threads fully support TLS connections.

```bash
# Redis 6.x/7.x: io-threads has no effect when TLS is enabled
# Redis 8.0+: io-threads works with TLS
# redis.conf
tls-port 6380
tls-cert-file /path/to/cert.pem
tls-key-file /path/to/key.pem
```

## io-threads-do-reads

```bash
# io-threads-do-reads yes (default: no)
# Enables using IO threads for both reading AND writing
# Usually provides additional throughput improvement
io-threads-do-reads yes
```

With `io-threads-do-reads no`, threads are only used for writes. With `yes`, threads handle both reads and writes.

## Example redis.conf for High-Throughput

```bash
# /etc/redis/redis.conf - High-throughput production config
bind 0.0.0.0
port 6379
maxmemory 32gb
maxmemory-policy allkeys-lru

# IO threading for multi-core
io-threads 6           # 8-core server (per Redis docs)
io-threads-do-reads yes

# Connection tuning
tcp-backlog 511
tcp-keepalive 60
timeout 300
hz 20
```

## Summary

Redis IO threads (available since Redis 6.0) parallelize network reads and writes across multiple CPU cores, enabling Redis to fully utilize multi-core hardware for high-concurrency and large-payload workloads. Set `io-threads` based on the Redis documentation recommendations for your core count (e.g., 2-3 for 4 cores, 6 for 8 cores) and enable `io-threads-do-reads yes` for maximum throughput. In Redis 6.x and 7.x, IO threads have no effect with TLS enabled (this limitation was removed in Redis 8.0). IO threads provide little benefit for low-concurrency or CPU-bound command workloads.
