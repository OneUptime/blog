# How to Use Redis for Real-Time Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Analytics, Real-Time, Counters, Time-Series, Performance

Description: A comprehensive guide to building real-time analytics systems with Redis, covering counters, time-series data, aggregations, and practical implementation patterns.

---

Real-time analytics is essential for modern applications - from tracking page views and user activity to monitoring system metrics and business KPIs. Redis, with its in-memory data structures and sub-millisecond latency, is an ideal choice for building real-time analytics systems.

In this guide, we will explore how to leverage Redis data structures for counters, time-series data, and aggregations to build powerful real-time analytics solutions.

## Why Redis for Real-Time Analytics?

Redis offers several advantages for real-time analytics:

- **Sub-millisecond latency**: In-memory operations ensure fast reads and writes
- **Atomic operations**: INCR, INCRBY, and other atomic commands prevent race conditions
- **Rich data structures**: Strings, hashes, sorted sets, and HyperLogLog for different analytics needs
- **Built-in expiration**: TTL support for automatic data cleanup
- **Pub/Sub**: Real-time data streaming to dashboards

## Basic Counters with Redis Strings

The simplest form of analytics is counting events. Redis strings with atomic increment operations are perfect for this.

### Simple Page View Counter

```python
import redis
from datetime import datetime

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0)

def track_page_view(page_id: str) -> int:
    """Track a page view and return the total count."""
    key = f"pageviews:{page_id}"
    return r.incr(key)

def get_page_views(page_id: str) -> int:
    """Get total page views for a page."""
    key = f"pageviews:{page_id}"
    count = r.get(key)
    return int(count) if count else 0

# Usage
track_page_view("homepage")
track_page_view("homepage")
print(f"Homepage views: {get_page_views('homepage')}")
```

### Time-Windowed Counters

For analytics that need time granularity, create separate keys for each time window:

```python
from datetime import datetime, timedelta

def track_event_by_hour(event_name: str) -> int:
    """Track an event with hourly granularity."""
    hour_key = datetime.now().strftime("%Y-%m-%d:%H")
    key = f"events:{event_name}:{hour_key}"

    # Increment and set expiration (keep for 7 days)
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 7 * 24 * 3600)
    results = pipe.execute()

    return results[0]

def get_events_last_24_hours(event_name: str) -> dict:
    """Get hourly event counts for the last 24 hours."""
    now = datetime.now()
    results = {}

    # Build list of keys to fetch
    keys = []
    for i in range(24):
        hour = now - timedelta(hours=i)
        hour_key = hour.strftime("%Y-%m-%d:%H")
        keys.append(f"events:{event_name}:{hour_key}")

    # Fetch all counts in one round trip
    counts = r.mget(keys)

    for i, count in enumerate(counts):
        hour = now - timedelta(hours=i)
        hour_str = hour.strftime("%Y-%m-%d %H:00")
        results[hour_str] = int(count) if count else 0

    return results

# Usage
track_event_by_hour("signup")
print(get_events_last_24_hours("signup"))
```

## Using Hashes for Multi-Dimensional Counters

When tracking multiple related metrics, Redis hashes provide efficient storage:

```python
def track_user_activity(user_id: str, activity: str) -> None:
    """Track various user activities in a single hash."""
    key = f"user:activity:{user_id}"
    today = datetime.now().strftime("%Y-%m-%d")
    field = f"{activity}:{today}"

    r.hincrby(key, field, 1)
    r.hincrby(key, f"{activity}:total", 1)
    r.expire(key, 90 * 24 * 3600)  # Keep for 90 days

def get_user_activity_summary(user_id: str) -> dict:
    """Get all activity counts for a user."""
    key = f"user:activity:{user_id}"
    return r.hgetall(key)

# Track multiple activities
track_user_activity("user123", "login")
track_user_activity("user123", "page_view")
track_user_activity("user123", "purchase")
track_user_activity("user123", "page_view")

# Get summary
summary = get_user_activity_summary("user123")
print(summary)
```

## Sorted Sets for Leaderboards and Rankings

Sorted sets are powerful for tracking top performers, trending items, or any ranked data:

```python
def track_article_views(article_id: str, views: int = 1) -> float:
    """Track article views and return updated score."""
    key = "trending:articles:daily"
    return r.zincrby(key, views, article_id)

def get_trending_articles(limit: int = 10) -> list:
    """Get top trending articles."""
    key = "trending:articles:daily"
    # ZREVRANGE returns highest scores first
    return r.zrevrange(key, 0, limit - 1, withscores=True)

def get_article_rank(article_id: str) -> int:
    """Get the rank of an article (0-indexed, None if not found)."""
    key = "trending:articles:daily"
    rank = r.zrevrank(key, article_id)
    return rank + 1 if rank is not None else None

# Track views
track_article_views("article:1", 100)
track_article_views("article:2", 250)
track_article_views("article:3", 175)
track_article_views("article:1", 50)  # article:1 now has 150

# Get trending
print("Trending articles:", get_trending_articles(10))
print("Article 1 rank:", get_article_rank("article:1"))
```

### Time-Decayed Rankings

For trending content that should decay over time:

```python
import time
import math

def track_with_time_decay(item_id: str, score: float = 1.0) -> None:
    """Track item with time-based score decay."""
    key = "trending:time_decay"

    # Use timestamp as part of score calculation
    # Items naturally decay as newer items get higher timestamps
    timestamp = time.time()
    decay_factor = 45000  # Adjust for decay speed

    # Score = actual_score * e^(timestamp/decay_factor)
    weighted_score = score * math.exp(timestamp / decay_factor)

    r.zincrby(key, weighted_score, item_id)

def get_trending_with_decay(limit: int = 10) -> list:
    """Get trending items accounting for time decay."""
    key = "trending:time_decay"
    return r.zrevrange(key, 0, limit - 1, withscores=True)
```

## HyperLogLog for Unique Visitor Counting

When you need to count unique items (like unique visitors) without storing every item, HyperLogLog provides an approximate count with minimal memory:

```python
def track_unique_visitor(page_id: str, visitor_id: str) -> None:
    """Track a unique visitor to a page."""
    today = datetime.now().strftime("%Y-%m-%d")
    key = f"uv:{page_id}:{today}"

    r.pfadd(key, visitor_id)
    r.expire(key, 30 * 24 * 3600)  # Keep for 30 days

def get_unique_visitors(page_id: str, date: str = None) -> int:
    """Get approximate unique visitor count."""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    key = f"uv:{page_id}:{date}"
    return r.pfcount(key)

def get_unique_visitors_range(page_id: str, days: int = 7) -> int:
    """Get unique visitors across multiple days."""
    keys = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        keys.append(f"uv:{page_id}:{date}")

    # PFCOUNT can merge multiple HyperLogLogs
    return r.pfcount(*keys)

# Track visitors
track_unique_visitor("homepage", "user_1")
track_unique_visitor("homepage", "user_2")
track_unique_visitor("homepage", "user_1")  # Duplicate - not counted twice

print(f"Unique visitors today: {get_unique_visitors('homepage')}")
print(f"Unique visitors last 7 days: {get_unique_visitors_range('homepage', 7)}")
```

## Bitmaps for User Activity Tracking

Bitmaps are memory-efficient for tracking binary states across many users:

```python
def track_daily_active_user(user_id: int) -> None:
    """Mark user as active today."""
    today = datetime.now().strftime("%Y-%m-%d")
    key = f"dau:{today}"
    r.setbit(key, user_id, 1)
    r.expire(key, 90 * 24 * 3600)

def is_user_active(user_id: int, date: str = None) -> bool:
    """Check if user was active on a given date."""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    key = f"dau:{date}"
    return bool(r.getbit(key, user_id))

def get_dau_count(date: str = None) -> int:
    """Get daily active user count."""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    key = f"dau:{date}"
    return r.bitcount(key)

def get_users_active_all_days(days: int = 7) -> int:
    """Get users who were active every day in the period."""
    keys = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        keys.append(f"dau:{date}")

    # AND operation - users active all days
    result_key = f"dau:and:{days}days"
    r.bitop("AND", result_key, *keys)
    count = r.bitcount(result_key)
    r.delete(result_key)

    return count

# Track users
for user_id in [1, 2, 3, 5, 8, 13, 21]:
    track_daily_active_user(user_id)

print(f"DAU count: {get_dau_count()}")
print(f"Is user 5 active: {is_user_active(5)}")
```

## Building a Real-Time Dashboard Backend

Here is a complete example combining multiple techniques for a real-time analytics dashboard:

```python
import redis
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

class RealTimeAnalytics:
    def __init__(self, redis_client: redis.Redis):
        self.r = redis_client

    def track_event(self, event_type: str, properties: Dict[str, Any] = None) -> None:
        """Track an event with optional properties."""
        now = datetime.now()
        minute_key = now.strftime("%Y-%m-%d:%H:%M")
        hour_key = now.strftime("%Y-%m-%d:%H")
        day_key = now.strftime("%Y-%m-%d")

        pipe = self.r.pipeline()

        # Increment counters at different granularities
        pipe.incr(f"events:{event_type}:minute:{minute_key}")
        pipe.expire(f"events:{event_type}:minute:{minute_key}", 3600)

        pipe.incr(f"events:{event_type}:hour:{hour_key}")
        pipe.expire(f"events:{event_type}:hour:{hour_key}", 7 * 24 * 3600)

        pipe.incr(f"events:{event_type}:day:{day_key}")
        pipe.expire(f"events:{event_type}:day:{day_key}", 90 * 24 * 3600)

        # Track unique sessions if session_id provided
        if properties and "session_id" in properties:
            pipe.pfadd(f"sessions:{event_type}:{day_key}", properties["session_id"])
            pipe.expire(f"sessions:{event_type}:{day_key}", 90 * 24 * 3600)

        # Publish for real-time subscribers
        event_data = {
            "type": event_type,
            "timestamp": now.isoformat(),
            "properties": properties or {}
        }
        pipe.publish("analytics:events", json.dumps(event_data))

        pipe.execute()

    def get_event_counts(self, event_type: str, granularity: str = "hour",
                         periods: int = 24) -> Dict[str, int]:
        """Get event counts for the specified periods."""
        now = datetime.now()
        results = {}
        keys = []
        labels = []

        for i in range(periods):
            if granularity == "minute":
                dt = now - timedelta(minutes=i)
                key_suffix = dt.strftime("%Y-%m-%d:%H:%M")
                label = dt.strftime("%H:%M")
            elif granularity == "hour":
                dt = now - timedelta(hours=i)
                key_suffix = dt.strftime("%Y-%m-%d:%H")
                label = dt.strftime("%Y-%m-%d %H:00")
            else:  # day
                dt = now - timedelta(days=i)
                key_suffix = dt.strftime("%Y-%m-%d")
                label = key_suffix

            keys.append(f"events:{event_type}:{granularity}:{key_suffix}")
            labels.append(label)

        counts = self.r.mget(keys)

        for label, count in zip(labels, counts):
            results[label] = int(count) if count else 0

        return results

    def get_real_time_stats(self) -> Dict[str, Any]:
        """Get current real-time statistics."""
        now = datetime.now()
        minute_key = now.strftime("%Y-%m-%d:%H:%M")
        hour_key = now.strftime("%Y-%m-%d:%H")
        day_key = now.strftime("%Y-%m-%d")

        # Get counts for common events
        events = ["page_view", "signup", "purchase", "error"]
        stats = {}

        pipe = self.r.pipeline()
        for event in events:
            pipe.get(f"events:{event}:minute:{minute_key}")
            pipe.get(f"events:{event}:hour:{hour_key}")
            pipe.get(f"events:{event}:day:{day_key}")
            pipe.pfcount(f"sessions:{event}:{day_key}")

        results = pipe.execute()

        for i, event in enumerate(events):
            base = i * 4
            stats[event] = {
                "last_minute": int(results[base]) if results[base] else 0,
                "last_hour": int(results[base + 1]) if results[base + 1] else 0,
                "today": int(results[base + 2]) if results[base + 2] else 0,
                "unique_sessions": results[base + 3]
            }

        return stats

# Usage
r = redis.Redis(host='localhost', port=6379, db=0)
analytics = RealTimeAnalytics(r)

# Track events
analytics.track_event("page_view", {"session_id": "sess_123", "page": "/home"})
analytics.track_event("page_view", {"session_id": "sess_456", "page": "/products"})
analytics.track_event("signup", {"session_id": "sess_123", "plan": "pro"})
analytics.track_event("purchase", {"session_id": "sess_123", "amount": 99.99})

# Get statistics
print("Real-time stats:", analytics.get_real_time_stats())
print("Hourly page views:", analytics.get_event_counts("page_view", "hour", 24))
```

## Real-Time Streaming with Redis Pub/Sub

For live dashboards, use Pub/Sub to stream events to subscribers:

```python
import redis
import json
import threading

def analytics_subscriber():
    """Subscribe to real-time analytics events."""
    r = redis.Redis(host='localhost', port=6379, db=0)
    pubsub = r.pubsub()
    pubsub.subscribe("analytics:events")

    print("Listening for analytics events...")
    for message in pubsub.listen():
        if message["type"] == "message":
            event = json.loads(message["data"])
            print(f"Event received: {event['type']} at {event['timestamp']}")

# Run subscriber in background thread
subscriber_thread = threading.Thread(target=analytics_subscriber, daemon=True)
subscriber_thread.start()

# Publisher (in your application)
def publish_event(event_type: str, data: dict):
    r = redis.Redis(host='localhost', port=6379, db=0)
    event = {
        "type": event_type,
        "timestamp": datetime.now().isoformat(),
        "data": data
    }
    r.publish("analytics:events", json.dumps(event))
```

## Using Redis Streams for Event Analytics

Redis Streams provide a more robust solution for event processing with consumer groups:

```python
def add_analytics_event(event_type: str, data: dict) -> str:
    """Add an event to the analytics stream."""
    r = redis.Redis(host='localhost', port=6379, db=0)

    event_data = {
        "type": event_type,
        "timestamp": datetime.now().isoformat(),
        **data
    }

    # XADD returns the event ID
    event_id = r.xadd("stream:analytics", event_data, maxlen=100000)
    return event_id

def process_analytics_stream(consumer_group: str, consumer_name: str):
    """Process events from the analytics stream."""
    r = redis.Redis(host='localhost', port=6379, db=0)
    stream_key = "stream:analytics"

    # Create consumer group if it does not exist
    try:
        r.xgroup_create(stream_key, consumer_group, id="0", mkstream=True)
    except redis.ResponseError:
        pass  # Group already exists

    while True:
        # Read new events
        events = r.xreadgroup(
            consumer_group,
            consumer_name,
            {stream_key: ">"},
            count=100,
            block=5000
        )

        if events:
            for stream, messages in events:
                for msg_id, data in messages:
                    # Process the event
                    print(f"Processing event {msg_id}: {data}")

                    # Acknowledge the event
                    r.xack(stream_key, consumer_group, msg_id)

# Add events
add_analytics_event("page_view", {"user_id": "123", "page": "/home"})
add_analytics_event("click", {"user_id": "123", "element": "buy_button"})
```

## Performance Optimization Tips

### 1. Use Pipelining for Bulk Operations

```python
def bulk_track_events(events: List[dict]) -> None:
    """Track multiple events efficiently using pipelining."""
    r = redis.Redis(host='localhost', port=6379, db=0)
    pipe = r.pipeline()

    for event in events:
        hour_key = datetime.now().strftime("%Y-%m-%d:%H")
        key = f"events:{event['type']}:hour:{hour_key}"
        pipe.incr(key)
        pipe.expire(key, 7 * 24 * 3600)

    pipe.execute()
```

### 2. Use Lua Scripts for Complex Atomic Operations

```python
# Lua script for atomic sliding window rate limiting + counting
SLIDING_WINDOW_SCRIPT = """
local key = KEYS[1]
local window_size = tonumber(ARGV[1])
local current_time = tonumber(ARGV[2])
local cutoff = current_time - window_size

-- Remove old entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

-- Add current timestamp
redis.call('ZADD', key, current_time, current_time .. '-' .. math.random())

-- Get count
local count = redis.call('ZCARD', key)

-- Set expiration
redis.call('EXPIRE', key, window_size)

return count
"""

def sliding_window_count(key: str, window_seconds: int = 60) -> int:
    """Get count of events in sliding window."""
    r = redis.Redis(host='localhost', port=6379, db=0)
    script = r.register_script(SLIDING_WINDOW_SCRIPT)

    current_time = int(datetime.now().timestamp() * 1000)
    window_ms = window_seconds * 1000

    return script(keys=[key], args=[window_ms, current_time])
```

### 3. Batch Reads with MGET

```python
def get_multiple_counters(counter_names: List[str]) -> Dict[str, int]:
    """Efficiently fetch multiple counters in one round trip."""
    r = redis.Redis(host='localhost', port=6379, db=0)

    values = r.mget(counter_names)

    return {
        name: int(value) if value else 0
        for name, value in zip(counter_names, values)
    }
```

## Conclusion

Redis provides a powerful foundation for real-time analytics with its diverse data structures and atomic operations. Key takeaways:

- Use **strings with INCR** for simple counters
- Use **hashes** for multi-dimensional metrics
- Use **sorted sets** for rankings and leaderboards
- Use **HyperLogLog** for unique counts with minimal memory
- Use **bitmaps** for binary user activity tracking
- Use **Pub/Sub or Streams** for real-time event streaming
- Always use **pipelining** for bulk operations
- Set **TTL** on keys for automatic data cleanup

By combining these patterns, you can build sophisticated real-time analytics systems that scale to millions of events per second while maintaining sub-millisecond query latency.

## Related Resources

- [Redis Data Types Documentation](https://redis.io/docs/data-types/)
- [Redis Commands Reference](https://redis.io/commands/)
- [HyperLogLog Algorithm Explained](https://redis.io/docs/data-types/probabilistic/hyperloglogs/)
