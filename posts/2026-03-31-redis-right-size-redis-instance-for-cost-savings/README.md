# How to Right-Size Your Redis Instance for Cost Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cost Optimization, Cloud, Performance, DevOps

Description: Learn how to analyze Redis memory usage, CPU load, and connection counts to choose the right instance size and avoid paying for capacity you do not need.

---

Over-provisioned Redis instances are one of the most common and expensive infrastructure mistakes. A few hours of analysis can cut your Redis bill significantly without impacting performance.

## Step 1: Measure Actual Memory Usage

Connect to your Redis instance and check real memory consumption:

```bash
redis-cli INFO memory
```

Key fields to examine:

```text
used_memory_human: 1.23G
used_memory_peak_human: 1.45G
mem_fragmentation_ratio: 1.12
maxmemory_human: 4.00G
```

If `used_memory_peak_human` is consistently less than 60% of your allocated memory, you are over-provisioned. The `mem_fragmentation_ratio` above 1.5 suggests fragmentation is inflating apparent usage.

## Step 2: Measure CPU and Connection Load

```bash
redis-cli INFO stats
redis-cli INFO clients
```

Watch for:

```text
instantaneous_ops_per_sec: 4200
connected_clients: 38
blocked_clients: 0
```

If operations per second and client counts are well within limits of a smaller instance tier, you can downsize.

## Step 3: Capture Peak Usage Over Time

Use `redis-cli --stat` to poll metrics every second and log to a file:

```bash
redis-cli --stat -i 1 | tee /tmp/redis-stats.log
```

Run this during your busiest period (typically business hours or peak traffic). Then analyze:

```bash
awk '{print $2}' /tmp/redis-stats.log | sort -n | tail -5
```

This shows your peak memory usage values over the monitoring window. You can also use `awk '{print $1}'` to check peak key counts.

## Step 4: Estimate Required Instance Size

Use these rules of thumb:

```text
Required memory = used_memory_peak * 1.3   (30% headroom)
Required CPU    = peak ops/sec / 100,000   (per core)
Required conns  = max_connected_clients * 1.5
```

For example, if peak memory is 900MB, you need an instance with at least 1.2GB of Redis memory - not a 4GB instance.

## Step 5: Choose the Right Instance Type

| Peak Memory | Recommended AWS ElastiCache | Monthly Cost (approx) |
|-------------|----------------------------|-----------------------|
| < 1.5 GB    | cache.t4g.medium (1.58 GB) | ~$25                  |
| < 3 GB      | cache.t4g.large (3.09 GB)  | ~$50                  |
| < 6 GB      | cache.m7g.large (6.38 GB)  | ~$110                 |

Always choose an instance size where your peak usage is under 70-75% of capacity, leaving room for growth and unexpected traffic spikes.

## Step 6: Set maxmemory to Enforce Limits

Prevent runaway memory growth with a memory policy:

```bash
redis-cli CONFIG SET maxmemory 1200mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

This ensures Redis stays within your instance size and evicts the least recently used keys rather than crashing or returning errors.

## Monitor After Resizing

After downsizing, set up monitoring in OneUptime to alert if memory usage climbs above 80% of `maxmemory`, which would indicate you need to scale back up or investigate key growth.

## Summary

Right-sizing Redis requires measuring actual peak memory, CPU, and connection counts - then choosing an instance that provides 25-30% headroom above those peaks. Setting `maxmemory` and an eviction policy prevents surprise overages. Regular monitoring with OneUptime ensures you catch growth before it becomes a production problem.
