# How to Use BF.CARD in Redis to Estimate Bloom Filter Cardinality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bloom Filter, RedisBloom, Command, NoSQL

Description: Learn how to use BF.CARD in Redis to estimate the number of unique items inserted into a Bloom filter without scanning all members.

---

## Overview

`BF.CARD` returns the cardinality estimate of a Bloom filter - that is, the approximate number of unique items that have been inserted. This command was introduced in RedisBloom 2.4.4. It provides a quick way to gauge how many items are in the filter without iterating through elements (which is not possible with Bloom filters by design). The estimate may differ slightly from the actual count due to the probabilistic nature of Bloom filters.

## Prerequisites

Redis Stack with RedisBloom 2.4.4 or later:

```bash
docker run -p 6379:6379 redis/redis-stack:latest
```

## Creating a Filter and Adding Items

```bash
BF.RESERVE visitors 0.01 100000
BF.MADD visitors "user-1" "user-2" "user-3" "user-4" "user-5"
```

## Using BF.CARD

```bash
BF.CARD visitors
```

Output:

```text
(integer) 5
```

Adding more items and rechecking:

```bash
BF.MADD visitors "user-6" "user-7" "user-8"
BF.CARD visitors
# Returns 8
```

## Behavior with Duplicate Insertions

Adding the same item multiple times does not inflate the cardinality count:

```bash
BF.ADD visitors "user-1"
BF.ADD visitors "user-1"
BF.ADD visitors "user-1"

BF.CARD visitors
# Still returns 8 - duplicates are not counted
```

## BF.CARD vs BF.INFO

Both commands give item count information, but serve different purposes:

| Command | Information Returned | Use Case |
|---------|---------------------|----------|
| BF.CARD | Estimated item count only | Quick cardinality check |
| BF.INFO | Full metadata (capacity, size, etc.) | Operational monitoring |

```bash
BF.CARD visitors
# Fast single integer response

BF.INFO visitors
# Full stats: capacity, size, inserted count, etc.
```

## Using BF.CARD in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.execute_command('BF.RESERVE', 'seen_ips', 0.001, 1000000)

# Simulate adding IP addresses
ips = [f'10.0.0.{i}' for i in range(200)]
r.execute_command('BF.MADD', 'seen_ips', *ips)

count = r.execute_command('BF.CARD', 'seen_ips')
print(f"Approximately {count} unique IPs seen")
```

## Using BF.CARD in Node.js

```javascript
const { createClient } = require('redis');

async function estimateFilterSize(filterName) {
  const client = createClient();
  await client.connect();

  const count = await client.sendCommand(['BF.CARD', filterName]);
  console.log(`Filter "${filterName}" has approximately ${count} items`);

  await client.disconnect();
  return count;
}

estimateFilterSize('visitors');
```

## Practical Use Case - Rate Limiting Unique Users

Use `BF.CARD` to track approximate unique visitor counts across time windows:

```python
import time

def track_visitor(user_id, window_minutes=60):
    window = int(time.time() // (window_minutes * 60))
    key = f'visitors:{window}'
    r.execute_command('BF.ADD', key, user_id)
    r.expire(key, window_minutes * 60 * 2)  # Keep for 2 windows

def get_unique_visitor_count(window_minutes=60):
    window = int(time.time() // (window_minutes * 60))
    key = f'visitors:{window}'
    try:
        return r.execute_command('BF.CARD', key)
    except Exception:
        return 0

# Track visitors
track_visitor('user-abc')
track_visitor('user-def')
track_visitor('user-abc')  # Duplicate - not counted twice

print(f"Unique visitors this hour: {get_unique_visitor_count()}")
# Output: Unique visitors this hour: 2
```

## Cardinality Estimate Accuracy

The count from `BF.CARD` is based on a stored internal counter that is incremented each time an insertion causes at least one new bit to be set. For a well-configured filter (not over-capacity), the count is usually very close to the actual number of unique items inserted. The count can diverge slightly because Bloom filters may treat a genuinely new item as already present (a false positive during insertion), causing the counter not to increment.

```python
def check_filter_accuracy(filter_name, expected_count):
    estimated = r.execute_command('BF.CARD', filter_name)
    error_pct = abs(estimated - expected_count) / expected_count * 100
    print(f"Expected: {expected_count}, Estimated: {estimated}, Error: {error_pct:.2f}%")
```

## Summary

`BF.CARD` provides a fast, O(1) estimate of how many unique items have been inserted into a Bloom filter. It is useful for monitoring filter utilization and tracking approximate unique counts for use cases like visitor analytics. The estimate is accurate when the filter is within its designed capacity, and duplicates are not double-counted.
