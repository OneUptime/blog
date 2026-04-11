# How to Use CF.COUNT in Redis to Count Cuckoo Filter Items

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cuckoo Filter, RedisBloom, Command, NoSQL

Description: Learn how to use CF.COUNT in Redis to estimate how many times a specific item has been inserted into a Cuckoo filter.

---

## Overview

`CF.COUNT` returns the estimated number of times a given item has been inserted into a Cuckoo filter. Since Cuckoo filters allow duplicate insertions via `CF.ADD`, this command helps you track how many copies of an item exist. The count is an estimate and may include false positives, but for items that were genuinely inserted multiple times, it provides an accurate count.

## Prerequisites

Redis Stack or RedisBloom module:

```bash
docker run -p 6379:6379 redis/redis-stack:latest
```

## Setting Up a Cuckoo Filter with Duplicates

```bash
CF.RESERVE event_log 500000
CF.ADD event_log "click"
CF.ADD event_log "click"
CF.ADD event_log "click"
CF.ADD event_log "view"
CF.ADD event_log "view"
CF.ADD event_log "purchase"
```

## Using CF.COUNT

```bash
CF.COUNT event_log "click"
# Returns 3

CF.COUNT event_log "view"
# Returns 2

CF.COUNT event_log "purchase"
# Returns 1

CF.COUNT event_log "refund"
# Returns 0 - item was never inserted
```

## Impact of CF.DEL on Count

Each `CF.DEL` decrements the count by 1:

```bash
CF.ADD myfilter "item"
CF.ADD myfilter "item"
CF.ADD myfilter "item"

CF.COUNT myfilter "item"
# Returns 3

CF.DEL myfilter "item"
CF.COUNT myfilter "item"
# Returns 2
```

## Using CF.COUNT in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.execute_command('CF.RESERVE', 'page_views', 1000000)

# Simulate page views
pages = ['home', 'about', 'home', 'products', 'home', 'about']
for page in pages:
    r.execute_command('CF.ADD', 'page_views', page)

# Count views per page
for page in ['home', 'about', 'products', 'contact']:
    count = r.execute_command('CF.COUNT', 'page_views', page)
    print(f"{page}: {count} views")

# Output:
# home: 3 views
# about: 2 views
# products: 1 views
# contact: 0 views
```

## Using CF.COUNT in Node.js

```javascript
const { createClient } = require('redis');

async function countItemInFilter(filterName, item) {
  const client = createClient();
  await client.connect();

  const count = await client.sendCommand(['CF.COUNT', filterName, item]);
  console.log(`"${item}" appears approximately ${count} time(s) in "${filterName}"`);

  await client.disconnect();
  return count;
}

countItemInFilter('event_log', 'click');
```

## Practical Use Case - Event Frequency Tracking

Use a Cuckoo filter to track event frequencies with the ability to decrement counts:

```python
class EventTracker:
    def __init__(self, name, capacity=1000000):
        self.key = f'events:{name}'
        r.execute_command('CF.RESERVE', self.key, capacity)

    def record(self, event_type):
        r.execute_command('CF.ADD', self.key, event_type)

    def undo(self, event_type):
        result = r.execute_command('CF.DEL', self.key, event_type)
        return result == 1

    def count(self, event_type):
        return r.execute_command('CF.COUNT', self.key, event_type)

tracker = EventTracker('login_events')
tracker.record('success')
tracker.record('success')
tracker.record('failure')

print(tracker.count('success'))  # 2
print(tracker.count('failure'))  # 1

tracker.undo('success')
print(tracker.count('success'))  # 1
```

## CF.COUNT vs Other Count Approaches

| Method | Accuracy | Memory | Supports Delete |
|--------|---------|--------|----------------|
| CF.COUNT | Approximate | Low | Yes |
| Redis Hash (HINCRBY) | Exact | Medium | Yes |
| Redis Sorted Set (ZINCRBY) | Exact | Higher | Yes |

Use `CF.COUNT` when approximate counts are acceptable and memory efficiency is a priority.

## Limitations

- False positives mean items never inserted may return a non-zero count
- Deleting an item that was never inserted can cause negative effects
- Count accuracy degrades as the filter approaches capacity

```python
# Check saturation before relying on counts
def check_filter_health(filter_name):
    info = r.execute_command('CF.INFO', filter_name)
    info_dict = {info[i]: info[i+1] for i in range(0, len(info), 2)}
    inserted = info_dict.get('Number of items inserted', 0)
    deleted = info_dict.get('Number of items deleted', 0)
    size = info_dict.get('Size', 0)
    print(f"Items inserted: {inserted}, deleted: {deleted}, filter size: {size} bytes")
```

## Summary

`CF.COUNT` returns the approximate number of times an item has been inserted into a Cuckoo filter. Combined with `CF.ADD` (to increment) and `CF.DEL` (to decrement), it enables memory-efficient frequency counting with deletion support. It is best suited for approximate analytics where absolute accuracy is not required but memory savings are important.
