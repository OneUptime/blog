# How to Use BF.ADD and BF.MADD in Redis to Add to Bloom Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bloom Filter, RedisBloom, Command, NoSQL

Description: Learn how to use BF.ADD and BF.MADD in Redis to insert one or multiple items into a Bloom filter for fast probabilistic membership testing.

---

## Overview

Bloom filters in Redis are provided by the RedisBloom module. `BF.ADD` inserts a single item into a Bloom filter, while `BF.MADD` inserts multiple items at once. `BF.ADD` is O(k) where k is the number of hash functions, and `BF.MADD` is O(k * n) where n is the number of items. If the filter does not exist, it is created automatically with default settings.

## Prerequisites

RedisBloom must be available. Use Redis Stack:

```bash
docker run -p 6379:6379 redis/redis-stack:latest
```

## Creating a Bloom Filter First

While `BF.ADD` auto-creates a filter, it is best practice to use `BF.RESERVE` to set capacity and error rate explicitly:

```bash
BF.RESERVE myfilter 0.001 10000
```

This creates a filter with 0.1% false positive rate and capacity for 10,000 items.

## Using BF.ADD to Insert a Single Item

```bash
BF.ADD myfilter "user:1001"
```

Returns:
- `1` - item was newly added
- `0` - item already existed (or a false positive match occurred)

```bash
BF.ADD myfilter "user:1001"
# Returns 0 - already exists
BF.ADD myfilter "user:1002"
# Returns 1 - newly added
```

## Using BF.MADD to Insert Multiple Items

`BF.MADD` adds multiple items in one command and returns an array of results:

```bash
BF.MADD myfilter "user:1003" "user:1004" "user:1005"
```

Output:

```text
1) (integer) 1
2) (integer) 1
3) (integer) 1
```

Each value corresponds to whether that item was newly inserted (`1`) or already present (`0`).

## Auto-Creation Behavior

If you use `BF.ADD` without first calling `BF.RESERVE`, Redis creates the filter with defaults:

```bash
BF.ADD newfilter "hello"
# Filter created automatically with default capacity=100 and error_rate=0.01
```

## Using BF.ADD in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.execute_command('BF.RESERVE', 'emails', 0.001, 500000)

# Add single item
result = r.execute_command('BF.ADD', 'emails', 'alice@example.com')
print(f"Added: {result}")  # 1 = new

# Add multiple items
results = r.execute_command('BF.MADD', 'emails',
    'bob@example.com',
    'carol@example.com',
    'dave@example.com'
)
print(f"Results: {results}")  # [1, 1, 1]
```

## Using BF.ADD in Node.js

```javascript
const { createClient } = require('redis');

async function addToBloomFilter() {
  const client = createClient();
  await client.connect();

  await client.sendCommand(['BF.RESERVE', 'userids', '0.001', '1000000']);

  const single = await client.sendCommand(['BF.ADD', 'userids', 'uid-42']);
  console.log('Single add:', single); // 1

  const multi = await client.sendCommand([
    'BF.MADD', 'userids', 'uid-43', 'uid-44', 'uid-45'
  ]);
  console.log('Multi add:', multi); // [1, 1, 1]

  await client.disconnect();
}

addToBloomFilter();
```

## Practical Use Case - Deduplication Pipeline

Suppose you receive a stream of events and want to skip duplicates before persisting to a database:

```python
def process_event(event_id, payload):
    already_seen = r.execute_command('BF.ADD', 'processed_events', event_id)
    if already_seen == 0:
        print(f"Skipping duplicate event {event_id}")
        return
    # Process new event
    save_to_database(event_id, payload)
```

For batch ingestion, use `BF.MADD` to process a chunk of events:

```python
def process_batch(event_ids):
    results = r.execute_command('BF.MADD', 'processed_events', *event_ids)
    new_events = [eid for eid, res in zip(event_ids, results) if res == 1]
    return new_events
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| BF.ADD | O(k) | k = number of hash functions |
| BF.MADD | O(k * n) | n = number of items |

## Summary

`BF.ADD` and `BF.MADD` are the primary commands for populating Redis Bloom filters. Use `BF.ADD` for single-item inserts and `BF.MADD` for batching multiple inserts in one round trip. Always pre-create your filter with `BF.RESERVE` to control capacity and false positive rate for production workloads.
