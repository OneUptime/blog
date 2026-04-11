# How to Implement a Bit Array with Redis Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bitmap, Analytics

Description: Use Redis SETBIT, GETBIT, and BITCOUNT to implement memory-efficient bit arrays for user activity tracking, feature flags, and bloom filter approximations.

---

A bit array stores one boolean value per bit. In Redis, a single string can hold 2^32 bits (512 MB), making it possible to track billions of boolean states - "has user X visited today?" - at roughly 125 KB per million users.

## Basic Bit Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Set bit at position (offset)
def set_bit(key: str, offset: int, value: int = 1):
    r.setbit(key, offset, value)

# Get bit at position
def get_bit(key: str, offset: int) -> bool:
    return bool(r.getbit(key, offset))

# Count all set bits (popcount)
def count_bits(key: str) -> int:
    return r.bitcount(key)

# Count bits in a byte range
def count_bits_range(key: str, start_byte: int, end_byte: int) -> int:
    return r.bitcount(key, start_byte, end_byte)
```

## Daily Active Users

Track which users were active today using their user ID as the bit offset:

```python
def record_user_activity(user_id: int):
    import datetime
    today = datetime.date.today().isoformat()
    key = f"dau:{today}"
    r.setbit(key, user_id, 1)
    r.expire(key, 7 * 86400)  # Keep for 7 days

def was_user_active(user_id: int, date: str = None) -> bool:
    import datetime
    date = date or datetime.date.today().isoformat()
    return bool(r.getbit(f"dau:{date}", user_id))

def get_daily_active_count(date: str = None) -> int:
    import datetime
    date = date or datetime.date.today().isoformat()
    return r.bitcount(f"dau:{date}")
```

## Weekly Active Users via BITOP

Find users active on any of the last 7 days using BITOP OR:

```python
def get_weekly_active_users() -> int:
    import datetime
    keys = []
    for i in range(7):
        day = (datetime.date.today() - datetime.timedelta(days=i)).isoformat()
        keys.append(f"dau:{day}")

    r.bitop("OR", "wau:temp", *keys)
    count = r.bitcount("wau:temp")
    r.expire("wau:temp", 60)  # Clean up after 1 minute
    return count

def get_users_active_every_day(days: int = 7) -> int:
    """Users active on ALL of the last N days (BITOP AND)."""
    import datetime
    keys = []
    for i in range(days):
        day = (datetime.date.today() - datetime.timedelta(days=i)).isoformat()
        keys.append(f"dau:{day}")

    r.bitop("AND", "retained:temp", *keys)
    count = r.bitcount("retained:temp")
    r.expire("retained:temp", 60)
    return count
```

## Feature Flag Bitmap

Store which users have a feature enabled using a compact bitmap:

```python
def enable_feature_for_user(feature: str, user_id: int):
    r.setbit(f"feature:{feature}", user_id, 1)

def disable_feature_for_user(feature: str, user_id: int):
    r.setbit(f"feature:{feature}", user_id, 0)

def has_feature(feature: str, user_id: int) -> bool:
    return bool(r.getbit(f"feature:{feature}", user_id))

def count_users_with_feature(feature: str) -> int:
    return r.bitcount(f"feature:{feature}")
```

## Finding the First Set Bit

```python
def first_active_day_offset(user_id: int) -> int | None:
    """Find the first key bit index where user was active."""
    # BITPOS returns position of first set (1) or clear (0) bit
    # Returns -1 when no set bit is found
    pos = r.bitpos(f"user:active:{user_id}", 1)
    return pos if pos >= 0 else None
```

## Memory Efficiency

```text
Tracking 1 million users per day:
- Bit array: 1,000,000 bits / 8 = 125 KB per day
- 30 days: ~3.75 MB total
- vs. storing user IDs as strings: ~7-10 MB per day
```

## Summary

Redis bit arrays are the most memory-efficient way to track per-user boolean states at scale. BITCOUNT gives you instant cardinality, BITOP enables set operations across multiple days, and BITPOS finds the first occurrence - all without scanning individual records. This makes them ideal for DAU/WAU metrics, retention analysis, and compact feature flags.
