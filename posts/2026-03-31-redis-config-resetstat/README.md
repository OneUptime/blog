# How to Use CONFIG RESETSTAT in Redis to Reset Statistics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CONFIG RESETSTAT, Monitoring, Statistics, Performance

Description: Learn how to use CONFIG RESETSTAT in Redis to reset runtime statistics counters, useful for benchmarking and establishing fresh performance baselines.

---

## What Is CONFIG RESETSTAT?

`CONFIG RESETSTAT` resets the statistical counters that Redis tracks at runtime. After calling this command, metrics like total commands processed, keyspace hits and misses, and connected clients statistics are reset to zero.

This is useful when you want to measure performance over a specific window of time or establish a fresh baseline after making configuration changes.

## Basic Usage

```bash
redis-cli CONFIG RESETSTAT
```

Returns:

```text
OK
```

## What Gets Reset

Running `CONFIG RESETSTAT` resets the following fields visible in `INFO stats` and `INFO all`:

- `total_commands_processed`
- `total_connections_received`
- `keyspace_hits` and `keyspace_misses`
- `expired_keys`
- `evicted_keys`
- `rejected_connections`
- `latest_fork_usec`
- `aof_delayed_fsync`
- `active_defrag_hits`, `active_defrag_misses`, etc.

## Checking Statistics Before and After

Before reset:

```bash
redis-cli INFO stats | grep keyspace
```

```text
keyspace_hits:145032
keyspace_misses:8421
```

After reset:

```bash
redis-cli CONFIG RESETSTAT
redis-cli INFO stats | grep keyspace
```

```text
keyspace_hits:0
keyspace_misses:0
```

## Use Case: Benchmarking After Configuration Change

When tuning Redis settings like `maxmemory-policy` or `hz`, reset stats first to get clean before/after measurements:

```bash
# Apply new config
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Reset stats for clean measurement
redis-cli CONFIG RESETSTAT

# Run your workload
# ...

# Measure the outcome
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses|evicted_keys"
```

## Calculating Cache Hit Rate

```bash
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

```text
keyspace_hits:9200
keyspace_misses:800
```

Hit rate = 9200 / (9200 + 800) = 92%

Reset before each test run to compare configurations fairly.

## Automating with Shell Scripts

```bash
#!/bin/bash
echo "Resetting Redis stats..."
redis-cli CONFIG RESETSTAT

echo "Running benchmark..."
redis-benchmark -n 100000 -q

echo "Stats after benchmark:"
redis-cli INFO stats | grep -E "keyspace|evicted|expired"
```

## What Is NOT Reset

`CONFIG RESETSTAT` does NOT reset:

- The keyspace itself (your data is untouched)
- Replication offset or lag
- Connected replica information
- The server uptime

## Summary

`CONFIG RESETSTAT` is a lightweight tool for establishing clean statistical baselines in Redis. Use it before benchmarks, after configuration changes, or whenever you need fresh counters for cache hit rate calculations and performance analysis.
