# How to Configure Redis hz (Server Tick Rate)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Configuration, Performance, TTL, Background Task

Description: Learn what Redis hz controls, how it affects key expiration accuracy and background task frequency, and how to tune it for your workload.

---

The Redis `hz` configuration parameter controls how many times per second the server runs its background cron tasks. These tasks handle key expiration, connection timeout checking, LRU/LFU approximation updates, and other maintenance. Tuning `hz` balances CPU overhead against the timeliness of background operations.

## What hz Controls

Every `1/hz` seconds, Redis runs a set of background tasks:
- Expire a batch of keys with expired TTLs (active expiry)
- Close idle connections that exceed `timeout`
- Update replication and cluster state
- Handle client output buffer management

```bash
# Check current hz
CONFIG GET hz
# Returns: 10 (default)

# Change hz
CONFIG SET hz 20
```

```bash
# redis.conf
hz 10
```

## Active Key Expiry: The Main Reason to Tune hz

Redis uses two mechanisms to expire keys:
1. **Lazy expiry**: check on access - if expired, delete and return nil
2. **Active expiry**: background scan that runs each server tick

At `hz=10`, Redis runs active expiry 10 times per second. Each cycle processes a small sample of keys with TTLs and deletes those that have expired. A higher `hz` means more frequent scans and faster reclaiming of expired keys.

```bash
# Observe expiry behavior
redis-cli INFO stats | grep expired_keys    # Total keys expired since start

# Monitor expiry rate over time (run twice and compare)
redis-cli INFO stats | grep expired_keys
```

## When to Increase hz

Increase `hz` when:
- You have **high-volume short-lived keys** (TTLs of seconds to minutes)
- **Memory pressure** from expired-but-not-yet-collected keys
- **Rate limiting or session keys** with tight expiry requirements

```bash
# For workloads with many short-TTL keys
CONFIG SET hz 50

# For workloads with very high key churn (e.g., rate limiters)
CONFIG SET hz 100
```

## dynamic-hz: Adaptive Tick Rate

Redis 5.0+ supports `dynamic-hz`, which automatically scales the tick rate based on the number of connected clients:

```bash
CONFIG GET dynamic-hz
# Returns: yes (enabled by default)

# With dynamic-hz:
# - Fewer clients = lower effective hz (saves CPU)
# - More clients = higher effective hz (more responsive)
```

When `dynamic-hz yes` is set, Redis increases the effective `hz` based on the number of connected clients, up to the hard cap of 500 (`CONFIG_MAX_HZ`).

```bash
# redis.conf
hz 10
dynamic-hz yes
# Effective hz scales up with client count, capped at 500
```

## CPU Cost of Higher hz

```bash
# Monitor Redis CPU usage at different hz values
INFO cpu | grep used_cpu_sys
INFO cpu | grep used_cpu_user

# Higher hz = more CPU for background tasks
# Typical cost: ~1-2% CPU per 100hz increase on a modern server
```

```python
import redis, time

r = redis.Redis()

# Benchmark: measure how quickly expired keys are cleaned
# Use DBSIZE instead of EXISTS because EXISTS triggers lazy expiry,
# which would delete expired keys on access and skew the results.
r.flushdb()
r.config_set("hz", "10")
for i in range(1000):
    r.set(f"test:{i}", "x", ex=1)  # 1 second TTL

time.sleep(2)
remaining_hz10 = r.dbsize()
print(f"hz=10: {remaining_hz10} keys still in memory after 2s")

# Repeat with hz=100
r.flushdb()
r.config_set("hz", "100")
for i in range(1000):
    r.set(f"test:{i}", "x", ex=1)

time.sleep(2)
remaining_hz100 = r.dbsize()
print(f"hz=100: {remaining_hz100} keys still in memory after 2s")
```

## Recommended hz Values

| Workload | Recommended hz |
|----------|---------------|
| General purpose (default) | 10 |
| Rate limiting, short TTLs | 20-50 |
| Very high key churn | 50-100 |
| Low-traffic, save CPU | 5 |
| Real-time expiry requirements | 100 |

## hz vs aof-rewrite-incremental-fsync

A higher `hz` also affects other periodic tasks. Monitor overall CPU and latency when increasing hz:

```bash
# Check command latency
LATENCY HISTORY event
LATENCY LATEST
```

## Summary

Redis `hz` controls the frequency of background cron tasks including active key expiry, connection timeout checks, and LRU/LFU updates. The default value of 10 is appropriate for most workloads. Increase it to 20-100 when your application uses many short-lived keys and needs expired keys reclaimed quickly. Enable `dynamic-hz yes` to let Redis automatically scale the tick rate based on load, reducing CPU waste during quiet periods.
