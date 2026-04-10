# How to Trim Redis Streams by Size and Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Trim, Retention, XTRIM

Description: Learn how to control Redis Stream growth using XTRIM and MAXLEN with XADD, and how to implement time-based retention by trimming entries older than a threshold.

---

Redis Streams are append-only logs that grow indefinitely unless trimmed. Redis provides two trimming strategies: by count (keep the last N entries) and by minimum ID (keep entries newer than a given timestamp).

## Trimming by Size with XTRIM

The `XTRIM` command removes the oldest entries when the stream exceeds a size limit:

```bash
# Exact trim: keep exactly last 10,000 entries (slower)
XTRIM mystream MAXLEN 10000

# Approximate trim: keep approximately last 10,000 entries (faster)
XTRIM mystream MAXLEN ~ 10000
```

The `~` modifier allows Redis to trim at macro node boundaries, which is much faster than exact trimming and still keeps the stream close to the target size.

## Trimming at Write Time with XADD

The most efficient approach is to trim as you write using the `MAXLEN` option:

```bash
# Add an entry and trim to ~100,000 in one command
XADD events:log MAXLEN ~ 100000 * level info message "User logged in" user_id 42
```

```python
import redis

r = redis.Redis(decode_responses=True)

# Write with inline trimming - no separate XTRIM needed
r.xadd(
    'events:log',
    {'level': 'info', 'message': 'User logged in', 'user_id': 42},
    maxlen=100000,
    approximate=True
)
```

## Time-Based Trimming with MINID

Redis 6.2 introduced `MINID` trimming, which removes entries with IDs older than a specified timestamp. Stream entry IDs encode millisecond timestamps:

```bash
# Remove entries older than 24 hours
# Calculate timestamp: current_ms - 86400000
XTRIM events:log MINID ~ 1710000000000
```

```python
import time

def trim_older_than_hours(stream, hours):
    cutoff_ms = int((time.time() - hours * 3600) * 1000)
    cutoff_id = f'{cutoff_ms}-0'
    r.xtrim(stream, minid=cutoff_id, approximate=True)

# Keep only events from the last 24 hours
trim_older_than_hours('events:log', hours=24)
```

## Scheduled Trimming Job

For time-based retention, run a periodic trimming job:

```python
import schedule
import time

def run_retention_policy():
    streams = {
        'events:log': 48,       # Keep 48 hours
        'audit:events': 720,    # Keep 30 days (720 hours)
        'debug:traces': 2,      # Keep 2 hours
    }

    for stream, hours in streams.items():
        cutoff_ms = int((time.time() - hours * 3600) * 1000)
        cutoff_id = f'{cutoff_ms}-0'
        result = r.xtrim(stream, minid=cutoff_id, approximate=True)
        print(f"Trimmed {result} entries from {stream}")

# Run every hour
schedule.every().hour.do(run_retention_policy)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## XADD with MINID

Combine writing and time-based trimming in a single command:

```bash
# Add entry and trim anything older than a specific ID
XADD audit:events MINID ~ 1709000000000 * action user.login user_id 99
```

## Choosing Between MAXLEN and MINID

Use `MAXLEN` when:
- You care about keeping a fixed number of recent events
- Storage budget is your primary constraint

Use `MINID` when:
- You have time-based retention requirements (e.g., "keep 30 days")
- Compliance or audit requirements specify a time period

## Checking Stream Memory Usage

```bash
# Stream length
XLEN events:log

# Memory used
MEMORY USAGE events:log

# Stream metadata including first and last entry IDs
XINFO STREAM events:log
```

## Summary

Redis Streams support two trimming strategies: `MAXLEN` for count-based retention and `MINID` for time-based retention. The most efficient approach is to trim at write time using `XADD ... MAXLEN ~` or `XADD ... MINID ~`. For time-based policies, run a periodic job that calculates the cutoff timestamp and trims all retention-managed streams.
