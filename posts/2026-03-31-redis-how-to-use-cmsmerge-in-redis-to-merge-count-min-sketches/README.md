# How to Use CMS.MERGE in Redis to Merge Count-Min Sketches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Count-Min Sketch, Probabilistic Data Structure, Data Merging

Description: Learn how CMS.MERGE combines multiple Count-Min Sketches in Redis into one, enabling distributed frequency tracking and aggregation.

---

## What Is CMS.MERGE?

`CMS.MERGE` is a RedisBloom command that merges two or more Count-Min Sketches (CMS) into a single destination sketch. This is useful when you collect frequency data in separate sketches - perhaps per-region or per-time-window - and want to aggregate them into a global view.

The merge operation replaces the counters in the destination with the weighted sum of the source sketches' counters, respecting optional weight multipliers.

## Prerequisites

- Redis with RedisBloom module (Redis Stack)
- Source sketches with identical dimensions (same width and depth)
- A destination sketch with the same dimensions as the sources

## Setting Up Source Sketches

All sketches involved in a merge must have the same width and depth. Create them with matching parameters:

```bash
# Create three sketches with identical dimensions
CMS.INITBYDIM region_us 2000 5
CMS.INITBYDIM region_eu 2000 5
CMS.INITBYDIM region_asia 2000 5

# Populate each with regional event data
CMS.INCRBY region_us "product:A" 500 "product:B" 300 "product:C" 120
CMS.INCRBY region_eu "product:A" 280 "product:B" 450 "product:C" 90
CMS.INCRBY region_asia "product:A" 620 "product:B" 150 "product:C" 340
```

## Basic CMS.MERGE Syntax

```text
CMS.MERGE destKey numKeys sourceKey [sourceKey ...] [WEIGHTS weight [weight ...]]
```

Merge all three regional sketches into one global sketch:

```bash
# Create destination sketch with same dimensions
CMS.INITBYDIM global_products 2000 5

# Merge all regional sketches into global
CMS.MERGE global_products 3 region_us region_eu region_asia
```

After the merge, query the global sketch:

```bash
CMS.QUERY global_products "product:A" "product:B" "product:C"
# 1) (integer) 1400   (500 + 280 + 620)
# 2) (integer) 900    (300 + 450 + 150)
# 3) (integer) 550    (120 + 90 + 340)
```

## Using Weights During Merge

The `WEIGHTS` option lets you scale each source sketch's contribution before merging:

```bash
# Weight EU data 2x and Asia data 2x to normalize for timezone differences
CMS.MERGE weighted_global 3 region_us region_eu region_asia WEIGHTS 1 2 2
```

This is useful when different sources have different sampling rates or time windows.

## Merging Time-Window Sketches

A common pattern is collecting per-hour sketches and merging them into a daily view:

```bash
# Create hourly sketches
for hour in 00 01 02 03; do
  CMS.INITBYDIM "events:hour:$hour" 5000 7
done

# Simulate adding events to each hour
CMS.INCRBY events:hour:00 "login" 1200 "search" 3400 "purchase" 89
CMS.INCRBY events:hour:01 "login" 980 "search" 2800 "purchase" 112
CMS.INCRBY events:hour:02 "login" 750 "search" 2100 "purchase" 67
CMS.INCRBY events:hour:03 "login" 640 "search" 1900 "purchase" 45

# Merge into daily sketch
CMS.INITBYDIM events:day:2026-03-31 5000 7
CMS.MERGE events:day:2026-03-31 4 events:hour:00 events:hour:01 events:hour:02 events:hour:03
```

Query the daily totals:

```bash
CMS.QUERY events:day:2026-03-31 "login" "search" "purchase"
# 1) (integer) 3570
# 2) (integer) 10200
# 3) (integer) 313
```

## Python Example: Distributed Aggregation

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Set up per-service sketches
services = ["service_auth", "service_api", "service_worker"]
for svc in services:
    r.execute_command("CMS.INITBYDIM", svc, 3000, 6)

# Add data to each service
r.execute_command("CMS.INCRBY", "service_auth", "user:1001", 45, "user:1002", 12)
r.execute_command("CMS.INCRBY", "service_api", "user:1001", 120, "user:1002", 88)
r.execute_command("CMS.INCRBY", "service_worker", "user:1001", 30, "user:1002", 5)

# Create destination and merge
r.execute_command("CMS.INITBYDIM", "all_services", 3000, 6)
r.execute_command("CMS.MERGE", "all_services", len(services), *services)

# Query aggregated counts
users = ["user:1001", "user:1002"]
counts = r.execute_command("CMS.QUERY", "all_services", *users)
for user, count in zip(users, counts):
    print(f"{user}: {count} total requests")
# user:1001: 195 total requests
# user:1002: 105 total requests
```

## Dimension Mismatch Error

If you attempt to merge sketches with different dimensions, Redis returns an error:

```bash
CMS.INITBYDIM sketch_small 1000 3
CMS.INITBYDIM sketch_large 2000 5
CMS.INITBYDIM dest 2000 5

CMS.MERGE dest 2 sketch_small sketch_large
# (error) CMS: width/depth is not equal
```

Always ensure all sketches share the same width and depth before merging.

## Cleanup After Merge

After merging, you can delete the source sketches to reclaim memory:

```bash
DEL region_us region_eu region_asia
```

## Summary

`CMS.MERGE` enables powerful aggregation patterns by combining Count-Min Sketches from different sources or time windows into a unified view. All participating sketches must share identical dimensions, and optional weights allow proportional scaling of each source. This makes it ideal for distributed systems where frequency data is collected independently and periodically consolidated for analysis.
