# How to Use CMS.INITBYDIM in Redis to Create a Count-Min Sketch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Count-Min Sketch, RedisBloom, Command, NoSQL

Description: Learn how to use CMS.INITBYDIM in Redis to create a Count-Min Sketch data structure with explicit width and depth dimensions for frequency estimation.

---

## Overview

A Count-Min Sketch (CMS) is a probabilistic data structure used to estimate the frequency of events in a stream. `CMS.INITBYDIM` creates a new Count-Min Sketch by specifying its width (number of counters per row) and depth (number of hash functions). Larger width reduces the overestimation error; greater depth reduces the probability of error. This command gives you precise control over memory vs accuracy tradeoffs.

## Prerequisites

Redis Stack or RedisBloom module:

```bash
docker run -p 6379:6379 redis/redis-stack:latest
```

## Understanding Width and Depth

- **Width**: Number of counters in each row. Higher width means lower error margin.
- **Depth**: Number of hash functions (rows). Higher depth means lower probability of error.

Memory usage = `width * depth * 4 bytes`

## Using CMS.INITBYDIM

```bash
CMS.INITBYDIM my_sketch 2000 5
```

This creates a sketch with width=2000 and depth=5, using 40KB of memory.

```bash
CMS.INITBYDIM large_sketch 10000 10
# 400KB - very accurate, low error rate
```

## CMS.INITBYDIM vs CMS.INITBYPROB

There are two ways to create a Count-Min Sketch:

| Command | Parameters | Use Case |
|---------|-----------|----------|
| CMS.INITBYDIM | width, depth | Direct control over memory |
| CMS.INITBYPROB | error_rate, probability | Set accuracy targets |

```bash
# Equivalent sketches (approximately)
CMS.INITBYDIM sketch1 2000 7
CMS.INITBYPROB sketch2 0.001 0.01
```

## Using CMS.INITBYDIM in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Create a sketch for tracking URL click frequencies
# Width=5000 gives ~0.04% error, Depth=7 gives ~99% confidence
r.execute_command('CMS.INITBYDIM', 'url_clicks', 5000, 7)

print("Count-Min Sketch created")

# Verify creation with CMS.INFO
info = r.execute_command('CMS.INFO', 'url_clicks')
info_dict = {info[i]: info[i+1] for i in range(0, len(info), 2)}
print(f"Width: {info_dict.get('width')}")
print(f"Depth: {info_dict.get('depth')}")
print(f"Count: {info_dict.get('count')}")
```

## Using CMS.INITBYDIM in Node.js

```javascript
const { createClient } = require('redis');

async function createCountMinSketch(name, width, depth) {
  const client = createClient();
  await client.connect();

  await client.sendCommand(['CMS.INITBYDIM', name, width.toString(), depth.toString()]);
  console.log(`Count-Min Sketch "${name}" created (${width}x${depth})`);

  // Check info
  const info = await client.sendCommand(['CMS.INFO', name]);
  const infoMap = {};
  for (let i = 0; i < info.length; i += 2) {
    infoMap[info[i]] = info[i + 1];
  }
  console.log('Sketch info:', infoMap);

  await client.disconnect();
}

createCountMinSketch('api_calls', 2000, 5);
```

## Practical Use Case - API Call Frequency Tracking

Create a CMS to track which API endpoints are called most frequently:

```python
# Create sketch for 10,000 distinct endpoints with low error
r.execute_command('CMS.INITBYDIM', 'api_freq', 10000, 7)

def record_api_call(endpoint):
    r.execute_command('CMS.INCRBY', 'api_freq', endpoint, 1)

def get_endpoint_frequency(endpoint):
    result = r.execute_command('CMS.QUERY', 'api_freq', endpoint)
    return result[0]

# Record some calls
record_api_call('/api/users')
record_api_call('/api/users')
record_api_call('/api/products')
record_api_call('/api/users')

print(get_endpoint_frequency('/api/users'))    # ~3
print(get_endpoint_frequency('/api/products')) # ~1
```

## Choosing Width and Depth

As a rule of thumb (using the formulas that RedisBloom applies internally):
- `width = ceil(2 / error)` where error = desired max error fraction
- `depth = ceil(log2(1 / delta))` where delta = desired failure probability

Common configurations:

```bash
# Low memory, acceptable error (~2%)
CMS.INITBYDIM small_sketch 100 5

# Medium accuracy (~0.2% error)
CMS.INITBYDIM medium_sketch 1000 7

# High accuracy (~0.02% error)
CMS.INITBYDIM precise_sketch 10000 10
```

## Memory Estimation

```python
def estimate_cms_memory_bytes(width, depth):
    return width * depth * 4  # 4 bytes per counter

configs = [(100, 5), (1000, 7), (10000, 10)]
for w, d in configs:
    mem = estimate_cms_memory_bytes(w, d)
    print(f"Width={w}, Depth={d}: {mem / 1024:.1f} KB")
```

Output:

```text
Width=100, Depth=5: 1.9 KB
Width=1000, Depth=7: 27.3 KB
Width=10000, Depth=10: 390.6 KB
```

## Summary

`CMS.INITBYDIM` creates a Count-Min Sketch with explicit control over width and depth, directly determining memory usage and accuracy. Use larger width to reduce per-query error and greater depth to reduce the probability that an error occurs. After initialization, use `CMS.INCRBY` to add counts and `CMS.QUERY` to estimate frequencies.
