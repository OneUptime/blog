# How to Use BF.INFO in Redis to Get Bloom Filter Statistics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bloom Filter, RedisBloom, Command, NoSQL

Description: Learn how to use BF.INFO in Redis to retrieve metadata and statistics about a Bloom filter including capacity, size, and number of inserted items.

---

## Overview

`BF.INFO` returns detailed statistics about a Bloom filter stored in Redis. This command is invaluable for monitoring filter health - you can check how full the filter is, how many sub-filters exist, the expansion rate, and the total memory allocated. Understanding these metrics helps you decide when to resize or recreate a filter.

## Prerequisites

Redis Stack or RedisBloom module is required:

```bash
docker run -p 6379:6379 redis/redis-stack:latest
```

## Creating and Populating a Filter

```bash
BF.RESERVE product_ids 0.001 50000
BF.MADD product_ids "prod-1" "prod-2" "prod-3" "prod-4" "prod-5"
```

## Running BF.INFO

```bash
BF.INFO product_ids
```

Example output:

```text
 1) Capacity
 2) (integer) 50000
 3) Size
 4) (integer) 85832
 5) Number of filters
 6) (integer) 1
 7) Number of items inserted
 8) (integer) 5
 9) Expansion rate
10) (integer) 2
```

## Understanding the Fields

| Field | Description |
|-------|-------------|
| Capacity | Maximum number of items before false positive rate degrades |
| Size | Memory used in bytes |
| Number of filters | Sub-filters (increases when capacity is exceeded with expansion) |
| Number of items inserted | Total items added so far |
| Expansion rate | Growth multiplier when filter is full (default: 2) |

## Checking Filter Saturation

A key operational metric is how close the filter is to capacity:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_filter_saturation(filter_name):
    info = r.execute_command('BF.INFO', filter_name)
    # Parse response into dict
    info_dict = dict(zip(info[::2], info[1::2]))
    capacity = info_dict['Capacity']
    inserted = info_dict['Number of items inserted']
    saturation = (inserted / capacity) * 100
    return saturation

pct = get_filter_saturation('product_ids')
print(f"Filter is {pct:.1f}% full")
```

## Using BF.INFO in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.execute_command('BF.RESERVE', 'sessions', 0.01, 10000)
for i in range(100):
    r.execute_command('BF.ADD', 'sessions', f'session-{i}')

info = r.execute_command('BF.INFO', 'sessions')
info_dict = {info[i]: info[i+1] for i in range(0, len(info), 2)}

print(f"Capacity:  {info_dict['Capacity']}")
print(f"Inserted:  {info_dict['Number of items inserted']}")
print(f"Size (bytes): {info_dict['Size']}")
print(f"Sub-filters: {info_dict['Number of filters']}")
```

## Using BF.INFO in Node.js

```javascript
const { createClient } = require('redis');

async function inspectBloomFilter(filterName) {
  const client = createClient();
  await client.connect();

  const raw = await client.sendCommand(['BF.INFO', filterName]);

  // Parse into key-value pairs
  const info = {};
  for (let i = 0; i < raw.length; i += 2) {
    info[raw[i]] = raw[i + 1];
  }

  console.log('Filter info:', info);
  console.log(`Capacity: ${info['Capacity']}`);
  console.log(`Items inserted: ${info['Number of items inserted']}`);

  await client.disconnect();
}

inspectBloomFilter('product_ids');
```

## Monitoring Filter Expansion

When a filter exceeds its capacity with expansion enabled, Redis creates additional sub-filters. You can detect this:

```bash
BF.RESERVE expandable 0.01 10 EXPANSION 2

# Add more items than capacity
BF.MADD expandable a b c d e f g h i j k l m n o

BF.INFO expandable
# Number of filters will be > 1
```

Expansion is convenient but the overall false positive rate increases as more sub-filters are added. For predictable behavior, pre-size your filter appropriately.

## Alerting on High Saturation

```python
def monitor_filters(filter_names, threshold=80):
    for name in filter_names:
        info = r.execute_command('BF.INFO', name)
        info_dict = {info[i]: info[i+1] for i in range(0, len(info), 2)}
        capacity = info_dict['Capacity']
        inserted = info_dict['Number of items inserted']
        pct = (inserted / capacity) * 100
        if pct > threshold:
            print(f"WARNING: {name} is {pct:.1f}% full - consider recreating")
```

## Summary

`BF.INFO` provides key statistics about a Bloom filter including capacity, items inserted, memory size, and expansion state. Monitor the ratio of items inserted to capacity to ensure your filter stays within its designed false positive rate. When a filter is consistently expanding beyond its original capacity, it is time to resize with a fresh `BF.RESERVE` call.
