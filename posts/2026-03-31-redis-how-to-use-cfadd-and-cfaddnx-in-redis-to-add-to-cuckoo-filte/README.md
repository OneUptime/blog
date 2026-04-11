# How to Use CF.ADD and CF.ADDNX in Redis to Add to Cuckoo Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cuckoo Filter, RedisBloom, Command, NoSQL

Description: Learn how to use CF.ADD and CF.ADDNX in Redis to insert items into a Cuckoo filter, with CF.ADDNX preventing duplicate insertions.

---

## Overview

Cuckoo filters are a probabilistic data structure similar to Bloom filters but with the added ability to delete items. Redis provides `CF.ADD` to insert an item (including duplicates) and `CF.ADDNX` to insert only if the item does not already exist. Both commands are O(k + i), where k is the number of sub-filters and i is maxIterations, and auto-create the filter if it does not exist.

## Prerequisites

Redis Stack or RedisBloom module:

```bash
docker run -p 6379:6379 redis/redis-stack:latest
```

## Creating a Cuckoo Filter

While `CF.ADD` auto-creates a filter, use `CF.RESERVE` for explicit configuration:

```bash
CF.RESERVE myfilter 10000
# Estimated capacity of 10000 items
```

## Using CF.ADD

```bash
CF.ADD myfilter "hello"
# Returns 1 - inserted successfully
```

`CF.ADD` allows adding duplicate entries, which is a key difference from Bloom filters:

```bash
CF.ADD myfilter "hello"
CF.ADD myfilter "hello"
# Each returns 1 - multiple copies can be stored
```

This is useful when you need to track frequency and delete individual occurrences later.

## Using CF.ADDNX

`CF.ADDNX` adds the item only if it is not already present (NX = Not eXists):

```bash
CF.ADDNX myfilter "world"
# Returns 1 - inserted (was not present)

CF.ADDNX myfilter "world"
# Returns 0 - not inserted (already exists)
```

Return values for both commands:
- `1` - item was inserted
- `0` - `CF.ADDNX` only: item already exists, not inserted
- Error if the filter is full

## When to Use CF.ADD vs CF.ADDNX

| Command | Duplicates | Use Case |
|---------|-----------|----------|
| CF.ADD | Allowed | Frequency tracking, multi-delete |
| CF.ADDNX | Not allowed | Unique membership, set-like behavior |

## Using CF.ADD in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.execute_command('CF.RESERVE', 'urls', 50000)

# Insert items
result = r.execute_command('CF.ADD', 'urls', 'https://example.com')
print(f"Added: {result}")  # 1

# Insert duplicate
result2 = r.execute_command('CF.ADD', 'urls', 'https://example.com')
print(f"Duplicate added: {result2}")  # 1 - cuckoo allows duplicates

# ADDNX - only if not present
result3 = r.execute_command('CF.ADDNX', 'urls', 'https://example.com')
print(f"ADDNX result: {result3}")  # 0 - already present

result4 = r.execute_command('CF.ADDNX', 'urls', 'https://other.com')
print(f"ADDNX new: {result4}")  # 1 - was not present
```

## Using CF.ADD in Node.js

```javascript
const { createClient } = require('redis');

async function addToCuckooFilter() {
  const client = createClient();
  await client.connect();

  await client.sendCommand(['CF.RESERVE', 'products', '100000']);

  // Add item
  const r1 = await client.sendCommand(['CF.ADD', 'products', 'prod-001']);
  console.log('Added:', r1); // 1

  // Add duplicate
  const r2 = await client.sendCommand(['CF.ADD', 'products', 'prod-001']);
  console.log('Duplicate:', r2); // 1

  // ADDNX - no duplicate
  const r3 = await client.sendCommand(['CF.ADDNX', 'products', 'prod-001']);
  console.log('ADDNX existing:', r3); // 0

  const r4 = await client.sendCommand(['CF.ADDNX', 'products', 'prod-002']);
  console.log('ADDNX new:', r4); // 1

  await client.disconnect();
}

addToCuckooFilter();
```

## Practical Use Case - Email Unsubscribe Tracking

Use `CF.ADDNX` to track unsubscribed emails without duplicates:

```python
def unsubscribe_user(email):
    result = r.execute_command('CF.ADDNX', 'unsubscribed', email)
    if result == 1:
        print(f"{email} has been unsubscribed")
        update_database_unsubscribe(email)
    else:
        print(f"{email} was already unsubscribed")

def is_subscribed(email):
    from_filter = r.execute_command('CF.EXISTS', 'unsubscribed', email)
    return not from_filter
```

Use `CF.ADD` when you want to count how many times an item appears (and later delete individual occurrences):

```python
def record_download(file_id):
    # Allow multiple downloads per file - track count via duplicates
    r.execute_command('CF.ADD', 'downloads', file_id)

def remove_one_download(file_id):
    r.execute_command('CF.DEL', 'downloads', file_id)
    # Removes one occurrence - others remain
```

## Filter Full Error Handling

```python
def safe_add(filter_name, item):
    try:
        return r.execute_command('CF.ADD', filter_name, item)
    except redis.ResponseError as e:
        if 'Filter is full' in str(e):
            print(f"Filter {filter_name} is full - consider expanding")
            return None
        raise
```

## Summary

`CF.ADD` inserts an item into a Cuckoo filter (allowing duplicates), while `CF.ADDNX` inserts only if the item is not already present. Choose `CF.ADDNX` for set-like unique membership tracking and `CF.ADD` when you need multi-count support with the ability to delete individual occurrences later.
