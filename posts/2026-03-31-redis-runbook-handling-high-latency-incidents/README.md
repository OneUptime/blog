# Redis Runbook: Handling High Latency Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Latency, Runbook

Description: Runbook for diagnosing and resolving Redis high latency incidents - covering slow commands, fork overhead, network issues, and persistence impact.

---

Redis is designed for sub-millisecond response times. When latency spikes occur, they almost always have a specific cause. This runbook helps you identify and resolve high latency incidents quickly.

## Step 1: Confirm the Latency Issue

Measure current latency:

```bash
redis-cli --latency -h <redis-host> -p 6379
redis-cli --latency-history -h <redis-host> -p 6379
```

Check intrinsic latency of the system:

```bash
redis-cli --intrinsic-latency 30
```

## Step 2: Check Slow Log

Review recent slow commands:

```bash
redis-cli SLOWLOG GET 20
redis-cli SLOWLOG LEN
```

Identify commands taking over the threshold (default 10ms):

```bash
redis-cli CONFIG GET slowlog-log-slower-than
```

## Step 3: Identify Blocking Commands

Check for currently running slow operations:

```bash
redis-cli COMMAND INFO keys scan
redis-cli LATENCY LATEST
```

Watch for clients blocked on slow commands:

```bash
redis-cli CLIENT LIST | grep -v "cmd=ping"
```

## Step 4: Check for Fork Overhead

BGSAVE and BGREWRITEAOF fork the Redis process, which can cause latency spikes. Check if a fork is in progress:

```bash
redis-cli INFO persistence | grep -E "rdb_bgsave_in_progress|aof_rewrite_in_progress"
redis-cli INFO stats | grep "latest_fork_usec"
```

Fork time over 200ms indicates a large memory footprint or Transparent Huge Pages (THP) being enabled.

## Step 5: Check Memory Fragmentation

High fragmentation causes slowness:

```bash
redis-cli INFO memory | grep "mem_fragmentation_ratio"
```

If above 1.5, enable active defragmentation:

```bash
redis-cli CONFIG SET activedefrag yes
```

## Step 6: Check Network Latency

Measure round-trip time to the Redis server:

```bash
ping <redis-host>
```

Check for network congestion or packet loss that could explain elevated latency.

## Step 7: Check CPU Usage

If Redis is CPU-bound, large Lua scripts or O(N) commands may be the cause:

```bash
redis-cli INFO server | grep "hz"
redis-cli INFO cpu
```

If `hz` has been raised above the default of 10, lower it back to reduce background task CPU overhead:

```bash
redis-cli CONFIG SET hz 10
```

## Step 8: Review and Tune

After resolving the immediate issue, tune configuration:

```bash
# redis.conf
slowlog-log-slower-than 5000
latency-monitor-threshold 20
latency-tracking yes
```

## Summary

Redis high latency incidents are usually caused by slow commands, fork overhead from persistence operations, memory fragmentation, or network issues. Checking the slow log, persistence state, and memory fragmentation ratio in that order resolves most latency incidents quickly.
