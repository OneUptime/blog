# How to Use TOPK.ADD in Redis to Add Items to Top-K

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Top-K, Heavy Hitter, Probabilistic Data Structure

Description: Learn how to use TOPK.ADD in Redis to track the most frequently occurring items in a stream using the Top-K probabilistic data structure.

---

## What Is TOPK.ADD?

`TOPK.ADD` is a RedisBloom command that increments the frequency count of one or more items in a Top-K structure. A Top-K structure maintains an approximate list of the K most frequent items seen, making it ideal for identifying heavy hitters in high-throughput data streams.

Unlike exact frequency counters, Top-K uses a fixed-memory footprint regardless of how many distinct items are tracked.

## Prerequisites

- Redis Stack or Redis with RedisBloom module
- A Top-K structure initialized with `TOPK.RESERVE`

## Creating a Top-K Structure with TOPK.RESERVE

Before using TOPK.ADD, initialize the structure:

```bash
# Track the top 10 items
# TOPK.RESERVE key topk [width depth decay]
TOPK.RESERVE trending:products 10

# With custom accuracy parameters
# width=50 (counters per array), depth=5 (number of arrays), decay=0.9
TOPK.RESERVE accurate:trending 10 50 5 0.9
```

## Adding Items with TOPK.ADD

```text
TOPK.ADD key item [item ...]
```

Add a single item:

```bash
TOPK.ADD trending:products "product:1001"
# Returns: (nil) - item did not displace anyone from top K
```

Add multiple items in one command:

```bash
TOPK.ADD trending:products "product:1001" "product:1002" "product:1003"
```

## Understanding the Return Value

TOPK.ADD returns the item that was displaced from the Top-K list (if any) when the new item joins:

```bash
# Add items repeatedly to build up counts
TOPK.ADD trending "apple" "banana" "apple" "cherry" "apple" "banana" "apple"

# When a new item displaces an existing one, its name is returned
TOPK.ADD trending "mango" "mango" "mango" "mango" "mango" "mango"
# Returns: 1) "cherry"  (cherry was displaced by mango entering top K)
```

If an item did not displace anything, the corresponding result is nil.

## Realistic Example: Tracking Trending Products

```bash
# Initialize Top-10 product tracker
TOPK.RESERVE shop:trending 10

# Simulate purchase events arriving as a stream
TOPK.ADD shop:trending "laptop" "headphones" "laptop" "keyboard" "laptop"
TOPK.ADD shop:trending "mouse" "monitor" "laptop" "headphones" "webcam"
TOPK.ADD shop:trending "laptop" "headphones" "keyboard" "laptop" "headphones"

# View current top 10
TOPK.LIST shop:trending
```

## Python Example: Real-Time Event Streaming

```python
import redis
import random

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Initialize Top-K for tracking most clicked articles
r.execute_command("TOPK.RESERVE", "news:trending", 5, 50, 5, 0.9)

articles = [
    "article:python-tips",
    "article:redis-guide",
    "article:docker-basics",
    "article:kubernetes-101",
    "article:react-hooks",
    "article:golang-intro",
    "article:rust-beginners"
]

# Simulate click events with different frequencies
weights = [30, 50, 20, 15, 45, 10, 5]  # Higher weight = more clicks

displaced_items = []
for _ in range(200):
    article = random.choices(articles, weights=weights)[0]
    result = r.execute_command("TOPK.ADD", "news:trending", article)
    if result and result[0]:
        displaced_items.append(result[0])

# Show current top 5
top_items = r.execute_command("TOPK.LIST", "news:trending")
print("Top 5 trending articles:")
for i, item in enumerate(top_items, 1):
    print(f"  {i}. {item}")

print(f"\nDisplaced during tracking: {set(displaced_items)}")
```

## Node.js Example

```javascript
const { createClient } = require("redis");

async function trackEvent(client, key, eventName) {
    const displaced = await client.sendCommand(["TOPK.ADD", key, eventName]);
    return displaced[0] || null;
}

async function main() {
    const client = createClient();
    await client.connect();

    await client.sendCommand(["TOPK.RESERVE", "events:topk", "10"]);

    const events = ["click", "view", "click", "purchase", "click", "view", "share"];
    for (const event of events) {
        const out = await trackEvent(client, "events:topk", event);
        if (out) {
            console.log(`Item displaced from Top-K: ${out}`);
        }
    }

    const top = await client.sendCommand(["TOPK.LIST", "events:topk"]);
    console.log("Current Top-K:", top.filter(Boolean));

    await client.disconnect();
}

main();
```

## Batch Insert for Backfill

```bash
# If you have historical data to backfill, add in batches
TOPK.ADD search:queries "redis" "python" "docker" "kubernetes" "nginx"
TOPK.ADD search:queries "redis" "python" "redis" "terraform" "redis"
TOPK.ADD search:queries "python" "mysql" "postgresql" "redis" "python"
```

## Summary

`TOPK.ADD` inserts items into a Redis Top-K structure, incrementing their frequency counts and maintaining the list of the K most frequent items. It returns the item displaced from the Top-K list when a new item earns its way in. This makes it ideal for real-time trending detection, identifying heavy hitters in event streams, and tracking the most popular items in any high-throughput data pipeline.
