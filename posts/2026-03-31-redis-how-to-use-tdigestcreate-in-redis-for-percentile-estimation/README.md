# How to Use TDIGEST.CREATE in Redis for Percentile Estimation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Percentile Estimation, Probabilistic Data Structure

Description: Learn how to use TDIGEST.CREATE in Redis to initialize a T-Digest structure for accurate percentile and quantile estimation over streaming data.

---

## What Is T-Digest in Redis?

T-Digest is a probabilistic data structure that allows you to estimate percentiles (p50, p95, p99) and quantiles with high accuracy, especially at the tails. Redis implements T-Digest through the RedisBloom module, which is included in Redis Stack.

The key advantage of T-Digest over exact sorted arrays is that it requires only a fraction of the memory while delivering accurate estimates for extreme percentiles like p99 or p99.9.

## TDIGEST.CREATE Syntax

```text
TDIGEST.CREATE key [COMPRESSION compression]
```

- `key` - the name of the T-Digest structure
- `COMPRESSION` - controls accuracy vs memory trade-off (default: 100)

## Creating a Basic T-Digest

```bash
# Create with default compression
TDIGEST.CREATE response_times

# Create with higher compression (more accurate, more memory)
TDIGEST.CREATE latency_p99 COMPRESSION 200

# Create with lower compression (less accurate, less memory)
TDIGEST.CREATE rough_latency COMPRESSION 50
```

## Understanding the Compression Parameter

The compression parameter affects the capacity (maximum number of centroids) the T-Digest can hold. In Redis's implementation, the capacity is calculated as:

```text
capacity = compression * 6 + 10
```

For example, a compression of 100 yields a capacity of 610 centroids.

Higher compression:
- More centroids stored
- Better accuracy at all quantiles
- Higher memory usage

Lower compression:
- Fewer centroids
- Acceptable accuracy at median, less accurate at tails
- Lower memory usage

Practical guidance:

```bash
# For p50 estimation only - low compression is fine
TDIGEST.CREATE median_tracker COMPRESSION 50

# For p95 and below - default is good
TDIGEST.CREATE standard_latency COMPRESSION 100

# For p99, p99.9 SLA monitoring - use higher compression
TDIGEST.CREATE sla_latency COMPRESSION 500
```

## Creating T-Digests for Different Use Cases

### API Latency Monitoring

```bash
TDIGEST.CREATE api:latency:get_user COMPRESSION 200
TDIGEST.CREATE api:latency:create_order COMPRESSION 200
TDIGEST.CREATE api:latency:search COMPRESSION 200
```

### Database Query Time Tracking

```bash
TDIGEST.CREATE db:query_time:reads COMPRESSION 150
TDIGEST.CREATE db:query_time:writes COMPRESSION 150
```

### Sliding Window Approach

For time-window analysis, create per-minute or per-hour T-Digests:

```bash
# Name by timestamp or window
TDIGEST.CREATE latency:2026-03-31:14 COMPRESSION 200
TDIGEST.CREATE latency:2026-03-31:15 COMPRESSION 200
```

## Python Example: Initializing T-Digests

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Create T-Digest structures for a web service
endpoints = ["/api/users", "/api/orders", "/api/products", "/api/search"]
for endpoint in endpoints:
    key = f"latency:{endpoint.replace('/', ':').strip(':')}"
    r.execute_command("TDIGEST.CREATE", key, "COMPRESSION", 200)
    print(f"Created T-Digest: {key}")

# Verify creation
info = r.execute_command("TDIGEST.INFO", "latency:api:users")
print(f"Compression: {info[info.index('Compression') + 1]}")
print(f"Capacity: {info[info.index('Capacity') + 1]}")
```

## Verifying the Structure Was Created

After creating a T-Digest, verify it with `TDIGEST.INFO`:

```bash
TDIGEST.CREATE my_digest COMPRESSION 100

TDIGEST.INFO my_digest
# 1) "Compression"
# 2) (integer) 100
# 3) "Capacity"
# 4) (integer) 610
# 5) "Merged nodes"
# 6) (integer) 0
# 7) "Unmerged nodes"
# 8) (integer) 0
# 9) "Merged weight"
# 10) "0"
# 11) "Unmerged weight"
# 12) "0"
# 13) "Total compressions"
# 14) (integer) 0
```

## Checking If a Key Exists Before Creating

Avoid overwriting an existing T-Digest accidentally:

```bash
# Check existence first
EXISTS my_digest
# (integer) 1 - already exists

# Only create if it does not exist
# Use a Lua script for atomic check-and-create
EVAL "
  if redis.call('EXISTS', KEYS[1]) == 0 then
    return redis.call('TDIGEST.CREATE', KEYS[1], 'COMPRESSION', ARGV[1])
  else
    return 'EXISTS'
  end
" 1 my_digest 200
```

## Summary

`TDIGEST.CREATE` initializes a T-Digest structure in Redis for percentile and quantile estimation. The compression parameter is the main tuning knob - use higher values (200-500) for accurate tail percentile tracking in SLA monitoring, and lower values (50-100) when memory is constrained and median estimates suffice. Once created, use `TDIGEST.ADD` to populate it and `TDIGEST.QUANTILE` to query percentiles.
