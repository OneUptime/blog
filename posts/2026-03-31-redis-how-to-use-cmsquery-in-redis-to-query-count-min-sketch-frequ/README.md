# How to Use CMS.QUERY in Redis to Query Count-Min Sketch Frequencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Count-Min Sketch, Probabilistic Data Structure, Frequency Estimation

Description: Learn how to use CMS.QUERY in Redis to retrieve frequency estimates for items in a Count-Min Sketch without scanning all data.

---

## What Is CMS.QUERY?

`CMS.QUERY` is a command in the Redis probabilistic data structures module (RedisBloom) that retrieves frequency estimates for one or more items stored in a Count-Min Sketch. A Count-Min Sketch (CMS) is a probabilistic data structure that tracks approximate frequencies using a fixed-size matrix of counters.

Unlike exact frequency counters, a CMS trades precision for memory efficiency. `CMS.QUERY` returns the estimated count for each queried item, which is always greater than or equal to the true count - never less.

## Prerequisites

Before using `CMS.QUERY`, you need:

- Redis with the RedisBloom module (version 2.0.0 or later) loaded (comes bundled with Redis Stack)
- A Count-Min Sketch already created with `CMS.INITBYDIM` or `CMS.INITBYPROB`

## Creating a Count-Min Sketch

First, initialize a CMS with the desired dimensions:

```bash
# Initialize by dimensions: width=2000, depth=5
CMS.INITBYDIM my_sketch 2000 5

# Or initialize by target error rate and probability
# error=0.001 (0.1%), probability=0.999
CMS.INITBYPROB my_sketch 0.001 0.999
```

## Adding Items with CMS.INCRBY

Populate the sketch before querying:

```bash
# Add single items
CMS.INCRBY my_sketch "item_a" 1
CMS.INCRBY my_sketch "item_b" 1

# Add multiple items at once
CMS.INCRBY my_sketch "apple" 5 "banana" 3 "cherry" 10
```

You can also add items with custom increment values:

```bash
# Simulate purchase counts
CMS.INCRBY purchases "product:1001" 15 "product:1002" 7 "product:1003" 42
```

## Querying Frequencies with CMS.QUERY

The `CMS.QUERY` command syntax is:

```text
CMS.QUERY key item [item ...]
```

Query a single item:

```bash
CMS.QUERY my_sketch "apple"
# Returns: (integer) 5
```

Query multiple items in a single command:

```bash
CMS.QUERY my_sketch "apple" "banana" "cherry"
# Returns:
# 1) (integer) 5
# 2) (integer) 3
# 3) (integer) 10
```

Query items that were never added:

```bash
CMS.QUERY my_sketch "mango"
# Returns: (integer) 0
# (or a small non-zero value due to hash collisions)
```

## Practical Example: Tracking Page Views

Here is a real-world example tracking page views on a website:

```bash
# Initialize a CMS for page view tracking
CMS.INITBYPROB pageviews 0.01 0.999

# Record page views (batch increments)
CMS.INCRBY pageviews "/home" 1420 "/products" 863 "/about" 201 "/contact" 98

# Query specific pages
CMS.QUERY pageviews "/home" "/products"
# 1) (integer) 1420
# 2) (integer) 863
```

## Using CMS.QUERY in Application Code

Here is how to use CMS.QUERY from a Python application with the redis-py client:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Initialize sketch
r.execute_command("CMS.INITBYPROB", "event_counts", 0.01, 0.999)

# Simulate recording events
events = ["click", "view", "click", "purchase", "click", "view"]
for event in events:
    r.execute_command("CMS.INCRBY", "event_counts", event, 1)

# Query frequencies
items_to_check = ["click", "view", "purchase", "refund"]
results = r.execute_command("CMS.QUERY", "event_counts", *items_to_check)

for item, count in zip(items_to_check, results):
    print(f"{item}: {count}")
# click: 3
# view: 2
# purchase: 1
# refund: 0
```

## Understanding the Error Guarantee

CMS.QUERY always returns an overestimate, never an underestimate. The error bound is:

```text
estimated_count <= true_count + (error_rate * total_items_added)
```

For example, with a 1% error rate and 10,000 total items added:

```text
maximum_overestimate = 0.01 * 10000 = 100
```

This means a true count of 50 might be reported as up to 150 - acceptable for trending and ranking use cases.

## When to Use CMS.QUERY

CMS.QUERY is ideal for:

- Real-time leaderboards where approximate rankings are sufficient
- Identifying heavy hitters (most frequent items) in a stream
- Rate limiting based on request frequency per user or IP
- Detecting trending hashtags or search terms

It is not suitable when exact counts are required, such as billing or transactional accounting.

## Summary

`CMS.QUERY` lets you retrieve frequency estimates from a Count-Min Sketch in Redis with O(1) time complexity per item. It is a powerful tool for high-throughput frequency tracking where approximate answers are acceptable. Combine it with `CMS.INCRBY` for recording events and `CMS.INFO` for inspecting sketch metadata to build efficient probabilistic counting pipelines.
