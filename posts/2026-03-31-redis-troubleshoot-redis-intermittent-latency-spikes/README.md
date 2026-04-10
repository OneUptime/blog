# How to Troubleshoot Redis Intermittent Latency Spikes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Latency, Performance, Troubleshooting, Monitoring

Description: Find and fix the root causes of intermittent Redis latency spikes including AOF fsync, keyspace notifications, large commands, and GC pauses.

---

Intermittent Redis latency spikes cause unpredictable response times in your application. These spikes often last milliseconds to seconds and occur sporadically. This guide shows how to identify and eliminate the root causes.

## Use Redis Latency Monitoring

Redis has built-in latency monitoring:

```bash
# Enable latency monitoring
redis-cli CONFIG SET latency-monitor-threshold 10  # Alert on events >10ms

# View recent latency events
redis-cli LATENCY HISTORY event
redis-cli LATENCY LATEST
redis-cli LATENCY RESET
```

## Common Cause 1 - AOF fsync Delays

If `appendfsync everysec` is configured, Redis fsyncs the AOF file every second. This can cause brief blocking:

```bash
redis-cli CONFIG GET appendfsync
redis-cli LATENCY LATEST | grep aof
```

Switch to `no-appendfsync-on-rewrite yes` to avoid fsync during AOF rewrite:

```bash
redis-cli CONFIG SET no-appendfsync-on-rewrite yes
```

## Common Cause 2 - Blocking Commands

Slow or blocking commands show up in the slow log:

```bash
redis-cli SLOWLOG GET 20
```

Look for:
- `KEYS *` - never use in production; use `SCAN` instead
- `SMEMBERS` on huge sets
- `SORT` on large lists
- `LRANGE` returning thousands of items

## Common Cause 3 - Memory Pressure and Swap

If Redis uses swap, latency will spike severely:

```bash
# Check if Redis is swapping
cat /proc/$(pidof redis-server)/status | grep VmSwap

# Check system swap usage
free -h
```

Prevent Redis from using swap:

```bash
# Ensure maxmemory is set to cap Redis memory usage
redis-cli CONFIG SET maxmemory 4gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Reduce OS swap tendency
sudo sysctl vm.swappiness=1
```

## Common Cause 4 - Fork for BGSAVE

`BGSAVE` and `BGREWRITEAOF` call `fork()`, which can cause a brief latency spike proportional to memory size:

```bash
redis-cli LATENCY HISTORY fork
redis-cli INFO stats | grep latest_fork_usec
```

Reduce fork time by keeping the RSS small and disabling transparent huge pages (THP):

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
```

## Common Cause 5 - Keyspace Notifications

If keyspace notifications are enabled with heavy write workloads, they add processing overhead:

```bash
redis-cli CONFIG GET notify-keyspace-events
```

Disable unused notification types:

```bash
redis-cli CONFIG SET notify-keyspace-events ""
```

## Measure Intrinsic Latency

Measure the base latency of your server hardware:

```bash
redis-cli --intrinsic-latency 60
```

This runs for 60 seconds and reports the maximum observed system latency. Anything above 1ms indicates OS-level latency issues (kernel, NUMA, CPU frequency scaling).

## Summary

Intermittent Redis latency spikes come from AOF fsync operations, blocking commands, memory swapping, fork() calls for persistence, and keyspace notifications. Use `LATENCY HISTORY`, `SLOWLOG`, and `--intrinsic-latency` to pinpoint the cause. Disable THP, keep Redis out of swap, and replace blocking commands with their non-blocking equivalents to achieve consistent sub-millisecond latency.
