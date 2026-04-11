# How to Use TDIGEST.INFO in Redis for T-Digest Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Metadata, Monitoring, Diagnostic

Description: Learn how to use TDIGEST.INFO in Redis to inspect T-Digest structure metadata including compression, node counts, weight, and compression history.

---

## What Is TDIGEST.INFO?

`TDIGEST.INFO` returns diagnostic information about a T-Digest structure, including its compression setting, capacity, current node counts, total weight (number of samples), and how many times compression has occurred.

This command is useful for monitoring the health of your T-Digest structures, estimating memory usage, and understanding how the structure is behaving under load.

## Syntax

```text
TDIGEST.INFO key
```

## Sample Output

```bash
TDIGEST.CREATE api:latency COMPRESSION 200
TDIGEST.ADD api:latency 45 52 38 61 44 55 48 67 39 71

TDIGEST.INFO api:latency
# 1)  "Compression"
# 2)  (integer) 200
# 3)  "Capacity"
# 4)  (integer) 1236
# 5)  "Merged nodes"
# 6)  (integer) 10
# 7)  "Unmerged nodes"
# 8)  (integer) 0
# 9)  "Merged weight"
# 10) "10"
# 11) "Unmerged weight"
# 12) "0"
# 13) "Observations"
# 14) (integer) 10
# 15) "Total compressions"
# 16) (integer) 1
# 17) "Memory usage"
# 18) (integer) 9944
```

## Understanding Each Field

| Field | Description |
|-------|-------------|
| Compression | The compression parameter set at creation |
| Capacity | Maximum number of centroids the structure can hold |
| Merged nodes | Number of currently active centroids |
| Unmerged nodes | Pending centroids not yet compressed |
| Merged weight | Total number of samples that have been merged (compressed) |
| Unmerged weight | Samples added but not yet merged into centroids |
| Observations | Total number of observations added to the sketch |
| Total compressions | How many times compression has run |
| Memory usage | Bytes used by the structure |

## Monitoring T-Digest Health

High unmerged nodes mean a compression pass will happen soon:

```bash
# Add many values quickly
TDIGEST.CREATE busy_digest COMPRESSION 100
for i in $(seq 1 500); do
  TDIGEST.ADD busy_digest $RANDOM
done

TDIGEST.INFO busy_digest
# Check "Unmerged nodes" - if high, next ADD will trigger compression
```

## Python Example: Monitoring T-Digest Structures

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def parse_tdigest_info(key: str) -> dict:
    """Parse TDIGEST.INFO output into a dictionary."""
    raw = r.execute_command("TDIGEST.INFO", key)
    if not raw:
        return {}
    return dict(zip(raw[::2], raw[1::2]))

def print_digest_report(key: str):
    info = parse_tdigest_info(key)
    if not info:
        print(f"Key '{key}' not found")
        return

    total_samples = float(info.get("Merged weight", 0)) + float(info.get("Unmerged weight", 0))
    memory_kb = int(info.get("Memory usage", 0)) / 1024

    print(f"T-Digest Report: {key}")
    print(f"  Compression:       {info.get('Compression')}")
    print(f"  Capacity:          {info.get('Capacity')} max centroids")
    print(f"  Active centroids:  {info.get('Merged nodes')}")
    print(f"  Pending centroids: {info.get('Unmerged nodes')}")
    print(f"  Total samples:     {total_samples}")
    print(f"  Compressions run:  {info.get('Total compressions')}")
    print(f"  Memory used:       {memory_kb:.1f} KB")

# Demo
r.execute_command("TDIGEST.CREATE", "demo:latency", "COMPRESSION", 200)
import random
samples = [random.expovariate(0.05) for _ in range(200)]
r.execute_command("TDIGEST.ADD", "demo:latency", *[str(round(s, 2)) for s in samples])

print_digest_report("demo:latency")
```

## Checking Total Sample Count

The total number of samples is merged weight plus unmerged weight:

```python
def get_sample_count(key: str) -> int:
    info = parse_tdigest_info(key)
    merged = float(info.get("Merged weight", 0))
    unmerged = float(info.get("Unmerged weight", 0))
    return int(merged + unmerged)

count = get_sample_count("api:latency")
print(f"Total samples recorded: {count}")
```

## Memory Usage Estimation

Use the Memory usage field to plan capacity:

```bash
# After adding 1000 samples with COMPRESSION 200
TDIGEST.INFO large_digest
# "Memory usage" -> approximately 9KB-40KB depending on data distribution

# Formula approximation:
# max_memory = compression * 64 bytes (roughly)
# For COMPRESSION 200: ~12.8 KB max
```

## Checking if a T-Digest Is Empty

```python
def is_empty(key: str) -> bool:
    info = parse_tdigest_info(key)
    merged = float(info.get("Merged weight", 0))
    unmerged = float(info.get("Unmerged weight", 0))
    return (merged + unmerged) == 0

# Use before querying to avoid nil responses
if not is_empty("api:latency"):
    p99 = r.execute_command("TDIGEST.QUANTILE", "api:latency", "0.99")
    print(f"p99: {p99[0]}ms")
```

## Automating Health Checks

```python
def audit_all_digests(key_pattern: str):
    """Scan and report on all T-Digest keys matching a pattern."""
    keys = r.keys(key_pattern)
    for key in keys:
        info = parse_tdigest_info(key)
        total = float(info.get("Merged weight", 0))
        memory_kb = int(info.get("Memory usage", 0)) / 1024
        print(f"{key}: {total:.0f} samples, {memory_kb:.1f}KB")

audit_all_digests("*:latency")
```

## Summary

`TDIGEST.INFO` provides detailed metadata about a Redis T-Digest structure, including sample count, compression state, centroid usage, and memory consumption. Use it to monitor T-Digest health, validate data was added successfully, check memory usage for capacity planning, and build automated audit tools. The merged weight field is particularly important as it represents the total number of observations recorded in the structure.
