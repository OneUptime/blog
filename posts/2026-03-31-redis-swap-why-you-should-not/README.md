# How to Configure Redis Swap (and Why You Should Not)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Linux, Configuration

Description: Understand why Redis and Linux swap memory are a dangerous combination, how to disable or limit swap, and what to do when Redis starts swapping.

---

Redis is designed as an in-memory data store. When the Linux kernel swaps Redis memory pages to disk, latency spikes dramatically - operations that normally complete in microseconds can take hundreds of milliseconds or more. This post explains how swap affects Redis and how to configure your system to prevent it.

## Why Swap is Dangerous for Redis

Redis keeps all data in RAM by design. When the OS swaps Redis pages to disk:

1. A client sends a GET request
2. Redis tries to access the key data
3. The memory page is on disk (swapped out)
4. The kernel reads the page from disk (milliseconds)
5. Redis returns the value

This causes unpredictable latency spikes that can cascade into timeouts across your entire application.

## Checking if Redis is Swapping

```bash
# Check swap usage for the Redis process
PID=$(pidof redis-server)
cat /proc/$PID/status | grep -i vmswap
```

```text
VmSwap:     102400 kB
```

Any non-zero `VmSwap` value means Redis is actively using swap. Also check:

```bash
redis-cli INFO memory | grep mem_allocator
redis-cli INFO memory | grep used_memory_rss
redis-cli INFO memory | grep used_memory
```

If `used_memory_rss` is significantly less than `used_memory`, Redis pages are likely swapped out. If `used_memory_rss` significantly exceeds `used_memory`, memory fragmentation is the cause.

## Disabling Swap Entirely

On a dedicated Redis server, disabling swap forces the OOM killer to act before Redis starts swapping:

```bash
# Disable swap immediately
sudo swapoff -a

# Verify
free -h
```

To make this permanent, comment out swap entries in `/etc/fstab`:

```bash
sudo nano /etc/fstab
# Comment out or remove lines like:
# /dev/sda2 none swap sw 0 0
```

## Limiting Swap Use with vm.swappiness

If you cannot disable swap entirely (e.g., on a shared server), set `vm.swappiness` to 0:

```bash
# Apply immediately
sudo sysctl -w vm.swappiness=0

# Make permanent
echo 'vm.swappiness=0' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

`vm.swappiness=0` tells the kernel to avoid swapping unless absolutely necessary (out of memory). This reduces (but does not eliminate) the chance of Redis pages being swapped.

## Setting a Redis Memory Limit

To prevent Redis from running out of memory in the first place, configure `maxmemory`:

```text
# redis.conf
maxmemory 4gb
maxmemory-policy allkeys-lru
```

This ensures Redis evicts keys when memory is full rather than allowing the OS to swap:

```bash
redis-cli CONFIG SET maxmemory 4gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## Checking System Memory Pressure

Monitor overall system memory to catch swap issues before they affect Redis:

```bash
vmstat -s | grep -E "swap|memory"
watch -n 5 'free -h && echo --- && redis-cli INFO memory | grep -E "used_memory_human|mem_fragmentation_ratio"'
```

Set up an alert if `VmSwap` for the Redis process exceeds a threshold:

```bash
#!/bin/bash
PID=$(pidof redis-server)
VMSWAP=$(awk '/VmSwap/{print $2}' /proc/$PID/status)
if [ "$VMSWAP" -gt 0 ]; then
    echo "ALERT: Redis is swapping ${VMSWAP} kB"
fi
```

## When Swap Cannot Be Avoided

If Redis must run on a shared system with swap enabled, ensure:

1. `maxmemory` is set well below total RAM
2. `vm.swappiness` is set to 0 or 1
3. The Redis process is monitored for `VmSwap` growth
4. You have alerting on `latency` increases via `redis-cli LATENCY HISTORY`

## Summary

Swap and Redis are fundamentally incompatible for performance-sensitive workloads. Disable swap on dedicated Redis servers, or set `vm.swappiness=0` on shared servers to minimize swapping. Always configure `maxmemory` with an eviction policy so Redis manages its own memory ceiling rather than relying on the OS. Monitor `VmSwap` in the Redis process's `/proc` status to catch swap usage early.
