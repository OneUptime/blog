# How to Use Redis HyperLogLog for Cardinality Estimation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, HyperLogLog, Analytics, Performance, Data Structures

Description: Learn how to use Redis HyperLogLog for memory-efficient cardinality estimation, perfect for counting unique visitors, tracking distinct events, and building analytics systems at scale.

---

Counting unique items seems simple until you need to count billions of them. Storing each item in a set works for small datasets, but when you need to track millions of unique visitors across thousands of pages, memory becomes a serious problem. This is where HyperLogLog comes in.

## What is HyperLogLog?

HyperLogLog (HLL) is a probabilistic data structure that estimates the cardinality (number of unique elements) of a set. The key insight is that you can trade perfect accuracy for massive memory savings.

Here is the tradeoff:
- A Redis Set storing 1 million unique strings might use 50-100 MB
- A HyperLogLog storing the same data uses only 12 KB
- HyperLogLog has a standard error of 0.81%

For most analytics use cases, being within 1% of the actual count is perfectly acceptable.

## Basic Operations

Redis provides three commands for working with HyperLogLog:

### PFADD - Add Elements

```bash
# Add single element
PFADD visitors "user:12345"

# Add multiple elements
PFADD visitors "user:12345" "user:67890" "user:11111"

# Returns 1 if cardinality estimate changed, 0 otherwise
```

### PFCOUNT - Get Cardinality

```bash
# Count unique elements in one HLL
PFCOUNT visitors

# Count unique elements across multiple HLLs (union)
PFCOUNT visitors:page1 visitors:page2 visitors:page3
```

### PFMERGE - Merge HyperLogLogs

```bash
# Merge multiple HLLs into a destination
PFMERGE visitors:total visitors:jan visitors:feb visitors:mar

# The destination contains the union of all source HLLs
```

## Practical Use Cases

### Counting Unique Visitors

Track unique visitors per page and across your entire site:

```python
import redis
from datetime import datetime

r = redis.Redis()

def track_visitor(page_path: str, visitor_id: str):
    """Track a visitor on a specific page."""
    today = datetime.now().strftime('%Y-%m-%d')

    # Track per-page visitors
    page_key = f"visitors:{page_path}:{today}"
    r.pfadd(page_key, visitor_id)

    # Track site-wide visitors
    site_key = f"visitors:site:{today}"
    r.pfadd(site_key, visitor_id)

    # Set expiry (keep 90 days of data)
    r.expire(page_key, 86400 * 90)
    r.expire(site_key, 86400 * 90)

def get_unique_visitors(page_path: str, date: str) -> int:
    """Get unique visitor count for a page on a specific date."""
    return r.pfcount(f"visitors:{page_path}:{date}")

def get_site_visitors(date: str) -> int:
    """Get total unique visitors across the site."""
    return r.pfcount(f"visitors:site:{date}")

def get_visitors_date_range(page_path: str, dates: list) -> int:
    """Get unique visitors across multiple dates (not sum, but union)."""
    keys = [f"visitors:{page_path}:{d}" for d in dates]
    return r.pfcount(*keys)
```

### Tracking Unique Events

Monitor unique actions in your application:

```python
def track_event(event_type: str, entity_id: str, user_id: str):
    """Track unique users performing an event on an entity."""
    hour = datetime.now().strftime('%Y-%m-%d-%H')

    # How many unique users performed this action?
    event_key = f"events:{event_type}:{hour}"
    r.pfadd(event_key, user_id)

    # How many unique users interacted with this entity?
    entity_key = f"entity:{entity_id}:users:{hour}"
    r.pfadd(entity_key, user_id)

    r.expire(event_key, 86400 * 7)
    r.expire(entity_key, 86400 * 7)

def get_unique_event_users(event_type: str, hours: list) -> int:
    """Get unique users who performed an event across time periods."""
    keys = [f"events:{event_type}:{h}" for h in hours]
    return r.pfcount(*keys)
```

### Building a Real-Time Dashboard

Create an analytics dashboard with minimal memory overhead:

```python
class AnalyticsDashboard:
    def __init__(self, redis_client):
        self.r = redis_client

    def record_pageview(self, page: str, user_id: str, session_id: str):
        """Record a pageview with multiple dimensions."""
        now = datetime.now()
        day = now.strftime('%Y-%m-%d')
        hour = now.strftime('%Y-%m-%d-%H')

        pipe = self.r.pipeline()

        # Unique users per page per day
        pipe.pfadd(f"analytics:page:{page}:users:{day}", user_id)

        # Unique sessions per page per day
        pipe.pfadd(f"analytics:page:{page}:sessions:{day}", session_id)

        # Unique users site-wide per hour (for real-time)
        pipe.pfadd(f"analytics:site:users:{hour}", user_id)

        # Set expiration
        pipe.expire(f"analytics:page:{page}:users:{day}", 86400 * 30)
        pipe.expire(f"analytics:page:{page}:sessions:{day}", 86400 * 30)
        pipe.expire(f"analytics:site:users:{hour}", 86400 * 7)

        pipe.execute()

    def get_dashboard_stats(self, page: str, day: str) -> dict:
        """Get dashboard statistics for a page."""
        pipe = self.r.pipeline()

        pipe.pfcount(f"analytics:page:{page}:users:{day}")
        pipe.pfcount(f"analytics:page:{page}:sessions:{day}")

        results = pipe.execute()

        return {
            'unique_users': results[0],
            'unique_sessions': results[1]
        }

    def get_weekly_uniques(self, page: str) -> int:
        """Get unique users for the past 7 days."""
        days = [(datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
                for i in range(7)]
        keys = [f"analytics:page:{page}:users:{d}" for d in days]
        return self.r.pfcount(*keys)
```

## Merging HyperLogLogs for Aggregation

One powerful feature is merging HLLs without losing accuracy:

```python
def aggregate_daily_to_monthly():
    """Aggregate daily HLLs into monthly summaries."""
    now = datetime.now()
    month = now.strftime('%Y-%m')

    # Get all daily keys for this month
    daily_keys = []
    for day in range(1, now.day + 1):
        date_str = f"{month}-{day:02d}"
        daily_keys.append(f"visitors:site:{date_str}")

    # Merge into monthly HLL
    monthly_key = f"visitors:site:monthly:{month}"
    r.pfmerge(monthly_key, *daily_keys)
    r.expire(monthly_key, 86400 * 365)

    return r.pfcount(monthly_key)

def create_rollup_hierarchy():
    """Create hourly -> daily -> weekly rollups."""
    now = datetime.now()
    today = now.strftime('%Y-%m-%d')

    # Merge all hourly HLLs into daily
    hourly_keys = [f"analytics:site:users:{today}-{h:02d}" for h in range(24)]
    existing_keys = [k for k in hourly_keys if r.exists(k)]

    if existing_keys:
        daily_key = f"analytics:site:users:daily:{today}"
        r.pfmerge(daily_key, *existing_keys)
        r.expire(daily_key, 86400 * 90)
```

## Memory Efficiency Comparison

Let us see the actual memory savings:

```python
import sys

def compare_memory_usage():
    """Compare Set vs HyperLogLog memory usage."""
    num_elements = 1_000_000

    # Using a Set
    set_key = "test:set"
    for i in range(num_elements):
        r.sadd(set_key, f"user:{i}")

    set_memory = r.memory_usage(set_key)
    set_count = r.scard(set_key)

    # Using HyperLogLog
    hll_key = "test:hll"
    pipe = r.pipeline()
    batch = []
    for i in range(num_elements):
        batch.append(f"user:{i}")
        if len(batch) >= 10000:
            pipe.pfadd(hll_key, *batch)
            batch = []
    if batch:
        pipe.pfadd(hll_key, *batch)
    pipe.execute()

    hll_memory = r.memory_usage(hll_key)
    hll_count = r.pfcount(hll_key)

    print(f"Set: {set_count:,} items, {set_memory:,} bytes")
    print(f"HLL: ~{hll_count:,} items, {hll_memory:,} bytes")
    print(f"Memory savings: {(1 - hll_memory/set_memory) * 100:.2f}%")
    print(f"Accuracy: {(hll_count/set_count) * 100:.2f}%")

    # Cleanup
    r.delete(set_key, hll_key)

# Results (approximate):
# Set: 1,000,000 items, 56,000,000 bytes
# HLL: ~1,008,345 items, 12,304 bytes
# Memory savings: 99.98%
# Accuracy: 100.83%
```

## When NOT to Use HyperLogLog

HyperLogLog is not suitable for every use case:

1. **When you need exact counts** - If regulatory or billing requirements demand exact numbers, use Sets or sorted structures.

2. **When you need to retrieve members** - HLL only tracks cardinality. You cannot list the actual members.

3. **When you need set operations** - You cannot check if an element exists in an HLL.

4. **Small datasets** - If your unique count is under 10,000, a regular Set might be more practical.

## Advanced Pattern: Time-Bucketed HLLs

For real-time analytics with historical rollups:

```python
class TimeBucketedHLL:
    """Time-bucketed HyperLogLog for efficient analytics."""

    def __init__(self, redis_client, prefix: str):
        self.r = redis_client
        self.prefix = prefix

    def add(self, value: str):
        """Add a value to current time buckets."""
        now = datetime.now()

        pipe = self.r.pipeline()

        # Add to minute bucket (for real-time)
        minute = now.strftime('%Y%m%d%H%M')
        pipe.pfadd(f"{self.prefix}:m:{minute}", value)
        pipe.expire(f"{self.prefix}:m:{minute}", 3600)

        # Add to hour bucket
        hour = now.strftime('%Y%m%d%H')
        pipe.pfadd(f"{self.prefix}:h:{hour}", value)
        pipe.expire(f"{self.prefix}:h:{hour}", 86400 * 7)

        # Add to day bucket
        day = now.strftime('%Y%m%d')
        pipe.pfadd(f"{self.prefix}:d:{day}", value)
        pipe.expire(f"{self.prefix}:d:{day}", 86400 * 90)

        pipe.execute()

    def count_last_minutes(self, minutes: int) -> int:
        """Count unique values in the last N minutes."""
        now = datetime.now()
        keys = []
        for i in range(minutes):
            t = now - timedelta(minutes=i)
            keys.append(f"{self.prefix}:m:{t.strftime('%Y%m%d%H%M')}")
        return self.r.pfcount(*keys) if keys else 0

    def count_last_hours(self, hours: int) -> int:
        """Count unique values in the last N hours."""
        now = datetime.now()
        keys = []
        for i in range(hours):
            t = now - timedelta(hours=i)
            keys.append(f"{self.prefix}:h:{t.strftime('%Y%m%d%H')}")
        return self.r.pfcount(*keys) if keys else 0

# Usage
tracker = TimeBucketedHLL(r, "pageviews:homepage")
tracker.add("user:12345")

# Get real-time stats
last_5_min = tracker.count_last_minutes(5)
last_24_hours = tracker.count_last_hours(24)
```

---

HyperLogLog is one of those Redis features that seems magical when you first encounter it. Being able to count millions of unique items in just 12 KB of memory opens up analytics possibilities that would otherwise require expensive dedicated systems. Start using it for your unique visitor counts, event tracking, and anywhere else you need cardinality estimation without breaking the memory bank.
