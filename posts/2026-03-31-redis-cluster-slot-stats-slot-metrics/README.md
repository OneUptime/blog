# How to Use CLUSTER SLOT-STATS in Redis for Slot Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, CLUSTER SLOT-STATS, Monitoring, Performance

Description: Learn how to use CLUSTER SLOT-STATS in Redis to retrieve per-slot metrics for monitoring key distribution and identifying hot slots.

---

`CLUSTER SLOT-STATS`, available in Redis 8.2+, provides per-slot statistics including key counts, CPU usage, memory usage, and network bytes for slots owned by the current node. This enables fine-grained monitoring of slot utilization, helping you identify hot slots and uneven data distribution.

## Syntax

```text
CLUSTER SLOT-STATS ORDERBY { KEY-COUNT | CPU-USEC | MEMORY-BYTES | NETWORK-BYTES-IN | NETWORK-BYTES-OUT } [LIMIT count] [ASC | DESC]
CLUSTER SLOT-STATS SLOTSRANGE start-slot end-slot
```

## Basic Usage - Top Slots by Key Count

```bash
# Get the 10 slots with the most keys, descending
redis-cli -p 7001 CLUSTER SLOT-STATS ORDERBY KEY-COUNT LIMIT 10 DESC
```

Example output:

```text
1) 1) (integer) 500
   2) 1) "key-count"
      2) (integer) 8432
      3) "cpu-usec"
      4) (integer) 124500
      5) "memory-bytes"
      6) (integer) 204800
      7) "network-bytes-in"
      8) (integer) 51200
      9) "network-bytes-out"
      10) (integer) 102400
```

## Getting Stats for a Slot Range

```bash
# Stats for slots 0 through 1000
redis-cli -p 7001 CLUSTER SLOT-STATS SLOTSRANGE 0 1000
```

## Identifying Hot Slots

Use `ORDERBY CPU-USEC` to find the most CPU-intensive slots:

```bash
redis-cli -p 7001 CLUSTER SLOT-STATS ORDERBY CPU-USEC LIMIT 5 DESC
```

Slots with disproportionately high CPU usage may indicate key patterns that generate excessive operations - for example, very large sets or sorted sets being iterated frequently.

## Detecting Key Distribution Imbalance

Compare key counts across slots to spot imbalances:

```bash
# Top 20 most populated slots
redis-cli -p 7001 CLUSTER SLOT-STATS ORDERBY KEY-COUNT LIMIT 20 DESC

# Bottom 20 (least populated)
redis-cli -p 7001 CLUSTER SLOT-STATS ORDERBY KEY-COUNT LIMIT 20 ASC
```

A healthy cluster has relatively uniform key counts across slots, assuming a good key naming strategy.

## Automating Slot Monitoring

```bash
#!/bin/bash
# Alert if any single slot exceeds 10,000 keys
threshold=10000
result=$(redis-cli -p 7001 CLUSTER SLOT-STATS ORDERBY KEY-COUNT LIMIT 1 DESC)
top_slot=$(echo "$result" | grep "key-count" -A1 | tail -1 | tr -d ' ')

if [ "$top_slot" -gt "$threshold" ]; then
  echo "WARNING: A slot has $top_slot keys - potential hot spot"
fi
```

## Availability

`CLUSTER SLOT-STATS` requires Redis 8.2 or later. Check your version:

```bash
redis-cli INFO server | grep redis_version
```

For older versions, use `CLUSTER COUNTKEYSINSLOT` to check individual slots manually.

## Comparison with CLUSTER COUNTKEYSINSLOT

| Feature | CLUSTER SLOT-STATS | CLUSTER COUNTKEYSINSLOT |
|---------|-------------------|------------------------|
| Multiple slots at once | Yes | No (one at a time) |
| CPU, memory, network metrics | Yes | No |
| Sorting and limiting | Yes | No |
| Redis version required | 8.2+ | 3.0+ |

## Summary

`CLUSTER SLOT-STATS` provides rich per-slot metrics for monitoring Redis Cluster health and performance. Use it to identify hot slots, detect distribution imbalances, and guide resharding decisions. It is a significant improvement over manually iterating through slots with `CLUSTER COUNTKEYSINSLOT`.
