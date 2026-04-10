# How to Troubleshoot Redis High Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Latency, Performance, Troubleshooting, Monitoring

Description: Diagnose and fix Redis high latency by checking slow log, network issues, memory pressure, blocking commands, and persistence operations.

---

Redis is designed for sub-millisecond response times. When latency increases, the impact on application performance is immediate. This guide walks through a systematic approach to identify and fix the root causes of high Redis latency.

## Step 1: Measure Baseline Latency

```bash
# Built-in latency check (measures round-trip time continuously)
redis-cli --latency -i 1
# Output: min: 0, max: 2, avg: 0.21 (1484 samples)

# Latency history - captures latency spikes over time
redis-cli --latency-history -i 5

# Latency monitoring (Redis 2.8.13+)
redis-cli LATENCY HISTORY event
redis-cli LATENCY LATEST
redis-cli LATENCY RESET
```

## Step 2: Check the Slow Log

```bash
# Show last 25 slow commands
redis-cli SLOWLOG GET 25

# Output format: [id, timestamp, microseconds, command, client_info]
# Example:
# 1) 1) (integer) 5
#    2) (integer) 1711900000
#    3) (integer) 15432        <- 15ms execution time
#    4) 1) "KEYS"
#       2) "user:*"

# Configure slow log threshold (in microseconds)
redis-cli CONFIG GET slowlog-log-slower-than
redis-cli CONFIG SET slowlog-log-slower-than 1000  # log commands > 1ms

redis-cli CONFIG SET slowlog-max-len 256
```

## Step 3: Identify Blocking Commands

Certain commands block all other operations:

```bash
# KEYS with a pattern blocks the server
redis-cli KEYS "*"  # NEVER use in production - use SCAN instead

# Large SMEMBERS, LRANGE, ZRANGE blocking
redis-cli LLEN big-list-key  # check size first
redis-cli LRANGE big-list-key 0 -1  # returns ALL items - can block for ms

# SORT without ALPHA on large sets
redis-cli SORT large-set  # scans and sorts in-place

# Replace blocking commands:
# KEYS * -> SCAN with cursor
# SMEMBERS -> SSCAN
# HGETALL on large hashes -> HSCAN
```

```bash
# Use SCAN instead of KEYS
redis-cli SCAN 0 MATCH "user:*" COUNT 100
# Repeat with returned cursor until cursor = 0
```

## Step 4: Check for Memory Pressure and Eviction

```bash
# Check if Redis is hitting maxmemory limit
redis-cli INFO memory | grep -E "maxmemory|used_memory_human"

# Check eviction activity
redis-cli INFO stats | grep evicted_keys
# Rising evicted_keys means Redis is actively evicting - causes latency spikes

# Check memory fragmentation (high fragmentation = slow allocations)
redis-cli INFO memory | grep mem_fragmentation_ratio
# > 1.5 is high - enable active defragmentation
redis-cli CONFIG SET activedefrag yes
```

## Step 5: Check Persistence Operations

RDB saves and AOF rewrite fork a child process. The fork itself can cause a latency spike on large datasets:

```bash
# Check last RDB save timing
redis-cli INFO persistence | grep -E "rdb_last_bgsave_time|rdb_current_bgsave_time"

# Check AOF status
redis-cli INFO persistence | grep -E "aof_enabled|aof_rewrite_in_progress|aof_last_rewrite_time"

# Disable frequent RDB saves to reduce fork latency
redis-cli CONFIG SET save ""

# Use AOF with fsync every second instead of always
redis-cli CONFIG GET appendfsync
redis-cli CONFIG SET appendfsync everysec
```

## Step 6: Check Network Issues

```bash
# Test network latency to Redis host
ping redis-host

# Check for dropped packets or high network latency
redis-cli --latency-dist -i 1

# Check client connection count
redis-cli INFO clients | grep -E "connected_clients|blocked_clients"

# Check if connection pooling is configured correctly in your application
redis-cli INFO clients | grep client_recent_max_input_buffer
```

## Step 7: Check CPU and System

```bash
# Check Redis CPU usage
redis-cli INFO cpu | grep -E "used_cpu_sys|used_cpu_user"

# Check which memory allocator Redis is using (jemalloc recommended)
redis-cli INFO memory | grep mem_allocator

# On the server - check if Redis is swapping (causes huge latency)
cat /proc/$(pgrep redis-server)/status | grep VmSwap
# If VmSwap is > 0, Redis is swapping to disk - critical issue

# Disable swap or lock Redis in memory
sudo sysctl -w vm.swappiness=0
```

## Fix: Transparent Huge Pages (THP)

THP causes latency spikes during fork operations:

```bash
# Check THP status
cat /sys/kernel/mm/transparent_hugepage/enabled
# If [always] is shown, THP is enabled

# Disable THP permanently
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag

# Add to /etc/rc.local for persistence
```

## Latency Monitoring with OneUptime

Set up an alert that fires when Redis latency exceeds your SLO threshold. Measure latency with:

```bash
# Script to measure and report Redis latency
while true; do
  LATENCY=$(timeout 2 redis-cli --latency-history -i 1 2>&1 | tail -1 | awk '{print $6}')
  echo "$(date -u +%FT%T) latency_avg=${LATENCY}ms"
  sleep 10
done
```

## Summary

Redis high latency is most commonly caused by blocking commands like `KEYS`, memory pressure triggering eviction, RDB/AOF fork operations, system swap usage, or Transparent Huge Pages. Start with the slow log to find problematic commands, then check memory and persistence metrics. Replace `KEYS` with `SCAN`, disable THP, and ensure Redis never touches swap memory.
