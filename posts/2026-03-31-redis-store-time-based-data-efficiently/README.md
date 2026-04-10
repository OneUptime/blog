# How to Store Time-Based Data Efficiently in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Time Series, Sorted Set, Stream, TTL

Description: Learn the best Redis data structures for time-ordered data - sorted sets for queryable windows, streams for append-only logs, and string keys with TTL for time-bucketed aggregates.

---

Time-based data in Redis comes in several forms: event logs, windowed aggregates, rate limit counters, and time-series metrics. Each pattern calls for a different data structure. This guide covers the most efficient approaches.

## Pattern 1: Sorted Set for Sliding Windows

A sorted set with Unix timestamps as scores is the most versatile structure for time-windowed queries:

```bash
# Record an event
ZADD events 1711880000 "event:login:user_1"
ZADD events 1711880060 "event:purchase:user_2"
ZADD events 1711880120 "event:login:user_3"

# Get events in the last 5 minutes
ZRANGEBYSCORE events 1711879800 +inf

# Count events in last hour
ZCOUNT events 1711876400 +inf

# Remove events older than 1 hour (for retention)
ZREMRANGEBYSCORE events -inf 1711876400
```

```python
import redis, time

r = redis.Redis()

def record_event(event_key, member, ts=None):
    ts = ts or time.time()
    r.zadd(event_key, {member: ts})

def get_recent_events(event_key, seconds=300):
    cutoff = time.time() - seconds
    return r.zrangebyscore(event_key, cutoff, "+inf")

def trim_old_events(event_key, max_age_seconds=3600):
    cutoff = time.time() - max_age_seconds
    r.zremrangebyscore(event_key, "-inf", cutoff)
```

## Pattern 2: Streams for Append-Only Logs

Redis streams provide time-ordered IDs natively, with consumer groups for distributed processing:

```bash
# Auto-assign timestamp ID
XADD telemetry "*" sensor "temp_1" value "23.5"
XADD telemetry "*" sensor "temp_1" value "24.1"

# Read entries in a time range by ID
XRANGE telemetry 1711880000000-0 1711880060000-0

# Read latest N entries
XREVRANGE telemetry + - COUNT 10
```

```python
def log_metric(stream_key, fields):
    return r.xadd(stream_key, fields)

def get_metrics_in_range(stream_key, start_ms, end_ms):
    start_id = f"{start_ms}-0"
    end_id = f"{end_ms}-9999999"
    return r.xrange(stream_key, start_id, end_id)

# Keep only last 1000 entries
r.xtrim("telemetry", maxlen=1000, approximate=True)
```

## Pattern 3: Time-Bucketed String Keys

For coarse time-series aggregates (hourly/daily counters), use string keys with bucket-based names and appropriate TTLs:

```bash
# Hourly request counter
INCR requests:2024-01-15:14   # Hour 14
EXPIRE requests:2024-01-15:14 86400   # Keep for 1 day
```

```python
from datetime import datetime, timezone

def increment_hourly_counter(metric, ts=None):
    dt = datetime.fromtimestamp(ts or time.time(), tz=timezone.utc)
    key = f"{metric}:{dt.strftime('%Y-%m-%d:%H')}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 7 * 86400)  # Keep 7 days
    return pipe.execute()[0]

def get_hourly_counts(metric, date_str):
    """Get all 24 hourly counters for a date."""
    keys = [f"{metric}:{date_str}:{h:02d}" for h in range(24)]
    values = r.mget(keys)
    return {f"{h:02d}:00": int(v or 0) for h, v in enumerate(values)}
```

## Pattern 4: Fixed-Size Time Windows with Expiry

Use a sorted set per time bucket that expires automatically:

```python
def rate_limit_check(user_id, action, limit=100, window_seconds=60):
    now = time.time()
    key = f"rate:{user_id}:{action}"
    cutoff = now - window_seconds

    pipe = r.pipeline()
    pipe.zremrangebyscore(key, "-inf", cutoff)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window_seconds + 1)
    _, _, count, _ = pipe.execute()

    return count <= limit, count
```

## Choosing the Right Pattern

| Scenario | Best approach |
|----------|--------------|
| Sliding window queries | Sorted set with timestamp scores |
| Append-only event log | Stream |
| Hourly/daily aggregates | String keys with TTL |
| Rate limiting | Sorted set + ZREMRANGEBYSCORE |
| Time-series metrics at scale | Redis TimeSeries module |

## Automatic Cleanup with TTL

Always set TTLs on time-based keys to prevent unbounded memory growth:

```bash
# Set TTL when creating
SET counter:2024-01-15 0 EX 86400

# Or set separately
EXPIRE events:sorted 604800   # 7 days
```

## Summary

Redis handles time-based data best when you match the access pattern to the data structure: sorted sets for queryable time windows and rate limiting, streams for append-only event logs with consumer groups, and bucketed string keys for hourly or daily aggregate counters. Always pair time-based keys with TTLs to keep memory bounded as time progresses.
