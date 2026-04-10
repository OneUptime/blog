# How to Implement Time Zone Aware Data with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Time Zone, Analytics, Localization, Calendar

Description: Store and query time zone aware data in Redis by normalizing to UTC for storage and converting on read using per-user timezone metadata.

---

Time zone handling is where analytics bugs hide. A "daily active users" counter that resets at UTC midnight is wrong for users in Tokyo. Redis time-zone-aware patterns normalize data to UTC for storage but perform bucketing and rollups in the user's local time zone.

## Always Store in UTC

The cardinal rule: all timestamps in Redis are UTC Unix timestamps. Time zones are a display concern:

```python
import redis
import time
import datetime
import pytz
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def now_utc() -> float:
    return time.time()

def to_utc_ts(local_dt: datetime.datetime, tz_name: str) -> float:
    tz = pytz.timezone(tz_name)
    aware = tz.localize(local_dt)
    return aware.timestamp()

def from_utc_ts(utc_ts: float, tz_name: str) -> datetime.datetime:
    tz = pytz.timezone(tz_name)
    return datetime.datetime.fromtimestamp(utc_ts, tz=tz)
```

## Local-Day Buckets Per User

When a user wants "today's stats," compute the local-day boundary in UTC:

```python
def local_day_start_utc(tz_name: str, ts: float = None) -> float:
    ts = ts or time.time()
    tz = pytz.timezone(tz_name)
    local_dt = datetime.datetime.fromtimestamp(ts, tz=tz)
    naive_midnight = local_dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    local_midnight = tz.localize(naive_midnight)
    return local_midnight.timestamp()

def local_day_bucket(tz_name: str, ts: float = None) -> str:
    tz = pytz.timezone(tz_name)
    ts = ts or time.time()
    local_dt = datetime.datetime.fromtimestamp(ts, tz=tz)
    return local_dt.strftime("%Y%m%d")
```

## Per-Timezone Daily Counters

Maintain separate daily counters per timezone for metrics that need local-day semantics:

```python
def record_user_event(user_id: str, metric: str, tz_name: str = "UTC"):
    day = local_day_bucket(tz_name)
    # Per-timezone daily counter
    tz_key = f"tz_daily:{metric}:{tz_name}:{day}"
    r.incrby(tz_key, 1)
    r.expire(tz_key, 30 * 86400)

    # UTC daily counter (for global aggregation)
    utc_day = time.strftime("%Y%m%d", time.gmtime())
    utc_key = f"daily:{metric}:{utc_day}"
    r.incrby(utc_key, 1)
    r.expire(utc_key, 30 * 86400)
```

## Storing User Timezone Preference

Cache user timezone in Redis alongside profile data:

```python
def set_user_timezone(user_id: str, tz_name: str):
    r.hset(f"user:{user_id}", "timezone", tz_name)

def get_user_timezone(user_id: str) -> str:
    return r.hget(f"user:{user_id}", "timezone") or "UTC"
```

## Converting Stored Timestamps for Display

When returning event timestamps to clients, convert from UTC:

```python
def format_event_for_user(event: dict, user_id: str) -> dict:
    tz_name = get_user_timezone(user_id)
    tz = pytz.timezone(tz_name)
    utc_ts = event.get("ts", 0)
    local_dt = datetime.datetime.fromtimestamp(utc_ts, tz=tz)
    return {
        **event,
        "local_time": local_dt.strftime("%Y-%m-%d %H:%M %Z"),
        "timezone": tz_name,
    }
```

## DST-Safe Range Queries

Daylight saving time can shift the UTC offset. Always compute range boundaries using pytz to account for DST:

```python
def get_local_day_range_utc(tz_name: str, date_str: str) -> tuple:
    tz = pytz.timezone(tz_name)
    dt = datetime.datetime.strptime(date_str, "%Y%m%d")
    start = tz.localize(dt.replace(hour=0, minute=0, second=0))
    end = tz.localize(dt.replace(hour=23, minute=59, second=59))
    return start.timestamp(), end.timestamp()
```

## Summary

Time-zone-aware Redis data stores all timestamps as UTC but derives local-day bucket keys from the user's timezone at write time. Per-timezone daily counters give accurate local-day metrics, while pytz handles DST-safe boundary calculations. User timezone preferences stored in Redis hashes make conversion at read time efficient and consistent.
