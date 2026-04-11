# How to Use TDIGEST.ADD in Redis to Add Samples to a T-Digest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Percentile Estimation, Streaming Data

Description: Learn how to use TDIGEST.ADD in Redis to insert numeric samples into a T-Digest structure for real-time percentile tracking.

---

## What Is TDIGEST.ADD?

`TDIGEST.ADD` is the command used to insert one or more numeric values into an existing T-Digest structure in Redis. After adding samples, you can query percentiles, quantiles, and rank estimates using related T-Digest commands.

The T-Digest structure compresses incoming data by grouping nearby values into centroids, maintaining high accuracy at the tails while using minimal memory.

## Syntax

```text
TDIGEST.ADD key value [value ...]
```

- `key` - the T-Digest structure name
- `value` - one or more floating-point numeric values to add

## Basic Usage

Create a T-Digest and add samples:

```bash
# Create the structure first
TDIGEST.CREATE response_times COMPRESSION 200

# Add a single value (milliseconds)
TDIGEST.ADD response_times 45.2

# Add multiple values at once
TDIGEST.ADD response_times 12.5 33.0 88.1 120.4 5.3 210.0 67.8
```

## Adding Measurements Over Time

In a real system, you add measurements as they occur:

```bash
# Simulating API response time recording
TDIGEST.ADD api:latency 23.5
TDIGEST.ADD api:latency 41.2
TDIGEST.ADD api:latency 18.9
TDIGEST.ADD api:latency 350.0   # slow outlier
TDIGEST.ADD api:latency 25.1
```

For higher throughput, batch multiple values into one call:

```bash
# Batch insert 10 values at once
TDIGEST.ADD api:latency 21.3 19.8 22.5 20.1 45.6 18.4 23.9 31.2 19.0 27.8
```

## Adding Negative and Float Values

T-Digest supports any floating-point number, including negatives:

```bash
# Temperature readings (can be negative)
TDIGEST.CREATE temperatures COMPRESSION 100
TDIGEST.ADD temperatures -12.5 -8.3 0.0 5.2 18.7 22.1 -3.4

# Financial returns (percentage, can be negative)
TDIGEST.CREATE portfolio:returns COMPRESSION 150
TDIGEST.ADD portfolio:returns -2.5 1.3 0.8 -0.4 3.1 -1.2 2.7
```

## Practical Example: Tracking Response Times

Here is a complete workflow from adding samples to querying results:

```bash
# Initialize
TDIGEST.CREATE svc:checkout:latency COMPRESSION 200

# Add samples in batches
TDIGEST.ADD svc:checkout:latency 45 52 38 61 44 55 48 67 39 71
TDIGEST.ADD svc:checkout:latency 490 512 480 503 495 88 92 101 87 95
TDIGEST.ADD svc:checkout:latency 1200 980 1450 102 110 89 94 88 77 99

# Query percentiles
TDIGEST.QUANTILE svc:checkout:latency 0.5 0.95 0.99
# p50 ~ 93ms, p95 ~ 503ms, p99 ~ 1450ms
```

## Python Example: Recording Application Metrics

```python
import redis
import time
import random

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Initialize T-Digest
r.execute_command("TDIGEST.CREATE", "app:request_duration", "COMPRESSION", 200)

# Simulate recording 1000 request durations
samples = []
for _ in range(1000):
    # Simulate log-normal distribution (realistic for latencies)
    latency = random.lognormvariate(3.5, 0.8)  # median ~33ms
    samples.append(round(latency, 2))

# Batch insert in chunks of 100
chunk_size = 100
for i in range(0, len(samples), chunk_size):
    chunk = samples[i:i + chunk_size]
    r.execute_command("TDIGEST.ADD", "app:request_duration", *chunk)

print(f"Added {len(samples)} samples")

# Check info
info = r.execute_command("TDIGEST.INFO", "app:request_duration")
info_dict = dict(zip(info[::2], info[1::2]))
print(f"Total weight: {info_dict.get('Merged weight', 0)}")
```

## Node.js Example

```javascript
const { createClient } = require("redis");

const client = createClient();
await client.connect();

// Initialize T-Digest
await client.sendCommand(["TDIGEST.CREATE", "node:latency", "COMPRESSION", "200"]);

// Add response time samples
const latencies = [15, 23, 18, 45, 12, 88, 22, 19, 350, 16, 21, 25];
await client.sendCommand(["TDIGEST.ADD", "node:latency", ...latencies.map(String)]);

// Query p99
const p99 = await client.sendCommand(["TDIGEST.QUANTILE", "node:latency", "0.99"]);
console.log(`p99 latency: ${p99[0]}ms`);
```

## Performance Considerations

- TDIGEST.ADD has O(n) complexity where n is the number of values being added
- Batching multiple values in a single call is more efficient than individual calls
- The T-Digest periodically compresses centroids; this happens automatically
- For high-throughput scenarios, use pipeline or batch inserts

```bash
# Check how many nodes have been compressed vs unmerged
TDIGEST.INFO api:latency
# Look for "Merged nodes" vs "Unmerged nodes"
# High unmerged count means compression will happen soon
```

## Summary

`TDIGEST.ADD` inserts numeric samples into a Redis T-Digest for percentile estimation. You can add single or multiple values per call, and batching is preferred for performance. The structure accepts any floating-point number and automatically manages compression to maintain accuracy. After adding samples, use `TDIGEST.QUANTILE`, `TDIGEST.CDF`, or `TDIGEST.RANK` to analyze the distribution.
