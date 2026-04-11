# How to Use CMS.INCRBY in Redis to Increment Count-Min Sketch Counts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Count-Min Sketch, RedisBloom, Command, NoSQL

Description: Learn how to use CMS.INCRBY in Redis to increment frequency counts for one or more items in a Count-Min Sketch for stream frequency estimation.

---

## Overview

`CMS.INCRBY` increments the count of one or more items in a Count-Min Sketch (CMS). You can increment multiple items in a single command by providing alternating item-increment pairs. The command returns the new estimated count for each item. This is the primary write command for CMS, used to record event occurrences in real time.

## Prerequisites

Redis Stack or RedisBloom module:

```bash
docker run -p 6379:6379 redis/redis-stack:latest
```

## Creating a Count-Min Sketch

Initialize the CMS before use:

```bash
CMS.INITBYDIM event_counts 2000 5
```

Or use probability-based initialization:

```bash
CMS.INITBYPROB event_counts 0.001 0.99
```

## Using CMS.INCRBY - Single Item

```bash
CMS.INCRBY event_counts "page_view" 1
# Returns estimated new count: (integer) 1

CMS.INCRBY event_counts "page_view" 1
CMS.INCRBY event_counts "page_view" 1
# Returns 2, then 3
```

## Using CMS.INCRBY - Multiple Items

Increment multiple items in one command with item-count pairs:

```bash
CMS.INCRBY event_counts "click" 5 "view" 3 "purchase" 1
```

Output:

```text
1) (integer) 5
2) (integer) 3
3) (integer) 1
```

Each return value is the updated estimated count for that item.

## Incrementing by Arbitrary Values

You can increment by any positive integer, useful for batch recording:

```bash
CMS.INCRBY hourly_stats "login" 47 "logout" 32 "error" 3
```

## Using CMS.INCRBY in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.execute_command('CMS.INITBYDIM', 'search_terms', 5000, 7)

def record_search(term, count=1):
    result = r.execute_command('CMS.INCRBY', 'search_terms', term, count)
    return result[0]

# Record individual searches
record_search('python tutorial')
record_search('redis commands')
record_search('python tutorial')
record_search('python tutorial')

# Batch record
terms_batch = {'docker guide': 15, 'kubernetes tutorial': 8, 'python tutorial': 20}
args = []
for term, count in terms_batch.items():
    args.extend([term, count])
results = r.execute_command('CMS.INCRBY', 'search_terms', *args)
print(f"Updated counts: {results}")
```

## Using CMS.INCRBY in Node.js

```javascript
const { createClient } = require('redis');

async function trackEvents() {
  const client = createClient();
  await client.connect();

  await client.sendCommand(['CMS.INITBYDIM', 'api_calls', '3000', '7']);

  // Single increment
  const count = await client.sendCommand(['CMS.INCRBY', 'api_calls', '/api/users', '1']);
  console.log('New count for /api/users:', count[0]);

  // Multiple increments
  const counts = await client.sendCommand([
    'CMS.INCRBY', 'api_calls',
    '/api/products', '5',
    '/api/orders', '3',
    '/api/users', '2'
  ]);
  console.log('Updated counts:', counts);

  await client.disconnect();
}

trackEvents();
```

## Querying Counts After Incrementing

Use `CMS.QUERY` to retrieve the current estimate for any item:

```bash
CMS.QUERY event_counts "page_view"
# Returns current estimated count
```

```python
def get_frequency(term):
    result = r.execute_command('CMS.QUERY', 'search_terms', term)
    return result[0]

print(get_frequency('python tutorial'))
```

## Practical Use Case - Real-Time Trending Topics

Track trending hashtags in a social feed using CMS:

```python
class TrendingTracker:
    def __init__(self, sketch_name, width=10000, depth=7):
        self.key = sketch_name
        r.execute_command('CMS.INITBYDIM', self.key, width, depth)

    def record_mentions(self, hashtag_counts):
        # hashtag_counts: dict of {hashtag: count}
        args = []
        for tag, count in hashtag_counts.items():
            args.extend([tag, count])
        if args:
            return r.execute_command('CMS.INCRBY', self.key, *args)

    def get_count(self, hashtag):
        result = r.execute_command('CMS.QUERY', self.key, hashtag)
        return result[0]

tracker = TrendingTracker('trending')

# Process a batch of posts
batch = {'#python': 42, '#redis': 27, '#devops': 15}
tracker.record_mentions(batch)

print(f"#python mentions: {tracker.get_count('#python')}")   # ~42
print(f"#redis mentions: {tracker.get_count('#redis')}")     # ~27
print(f"#unknown: {tracker.get_count('#unknown')}")          # ~0
```

## CMS.INCRBY vs Other Frequency Tracking Methods

| Method | Accuracy | Memory | Write Speed | Delete |
|--------|---------|--------|------------|--------|
| CMS.INCRBY | Approximate | Very low | O(depth) | No |
| HINCRBY (Hash) | Exact | Medium | O(1) | Yes |
| ZINCRBY (Sorted Set) | Exact | Higher | O(log N) | Yes |

## Summary

`CMS.INCRBY` is the core write command for Count-Min Sketches in Redis, allowing you to increment event counts for one or multiple items in a single round trip. The estimated counts are updated in O(depth) time and returned immediately. Pair it with `CMS.QUERY` for reads and use it in real-time analytics, trending detection, and frequency estimation workloads where approximate counts and minimal memory usage are priorities.
