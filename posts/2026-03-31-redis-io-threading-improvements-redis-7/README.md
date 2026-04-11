# How to Use IO Threading Improvements in Redis 7.0+

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Threading, Configuration, Tuning

Description: Configure and use Redis 7.0+ IO threading to offload network reads and writes from the main thread, improving throughput on multi-core systems.

---

Redis is fundamentally single-threaded for command execution, but since Redis 6.0 it has supported multi-threaded IO for reading client requests and writing responses. Redis 7.0 continued to improve overall performance and stability of these features. Here is how to enable and tune it.

## How IO Threading Works

The main event loop still executes all commands sequentially. IO threads handle the slower parts: reading bytes from sockets and writing response bytes back. This frees the main thread to spend more time executing commands rather than waiting on network buffers.

```text
Client --> [IO Thread 1] --> [Command Queue] --> [Main Thread] --> [IO Thread 2] --> Client
```

## Enabling IO Threads in redis.conf

```text
# Enable threaded IO
io-threads 4

# Enable reads on IO threads (Redis 6+, stable in 7+)
io-threads-do-reads yes
```

The official recommendation is to use fewer threads than cores: for a 4-core machine, try 2-3 IO threads; for an 8-core machine, try 6 threads. Using more than 8 threads is unlikely to help.

## Checking if Threads Are Active

```bash
redis-cli INFO stats | grep io_threaded
```

Under load you should see non-zero values for `io_threaded_reads_processed` and `io_threaded_writes_processed`. IO threads are activated dynamically when there are enough pending clients to justify the overhead.

## Benchmarking the Difference

Run a baseline without IO threads:

```bash
redis-benchmark -n 1000000 -c 200 -t get,set -q
```

Then enable IO threads and rerun:

```bash
# In redis.conf
io-threads 4
io-threads-do-reads yes
```

```bash
redis-benchmark -n 1000000 -c 200 -t get,set -q
```

On a 4-core machine with large payloads, you typically see 30-60% higher throughput.

## Tuning for High-Throughput Scenarios

For pipelines or large value workloads, increase the client threshold that triggers IO threads:

```text
# Lower threshold to engage threads sooner (default is 2)
# This is not a direct config key; tune via io-threads and workload
```

Pair IO threading with TCP tuning:

```bash
# System-level TCP buffer tuning
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
```

## Monitoring Thread Utilization

```bash
redis-cli --latency-history -i 1
```

Watch for latency spikes. If they increase with more IO threads, reduce the count - too many threads can cause cache thrashing on small instances.

Use `INFO stats` to track `total_commands_processed` per second and compare across configurations.

## When NOT to Use IO Threads

- On single-core or dual-core VMs: overhead from thread synchronization outweighs gains.
- When your bottleneck is command execution (CPU-bound Lua scripts, large SORT operations).
- On low-latency setups with very few clients where threads add scheduling overhead.

## Summary

Redis 7.0+ IO threading lets you scale network throughput on multi-core machines without changing your application code. Enable it with `io-threads` and `io-threads-do-reads yes` in redis.conf, set the thread count based on your core count (e.g. 6 for 8 cores), and benchmark your specific workload. The gains are most visible with many concurrent clients and large payloads.
