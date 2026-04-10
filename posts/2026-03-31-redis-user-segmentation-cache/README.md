# How to Build a User Segmentation Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Advertising, Segmentation

Description: Cache user segment memberships in Redis using sets and bitmaps to deliver instant targeting decisions for ad serving, personalization, and A/B testing.

---

User segmentation powers targeted advertising, personalized content, and A/B testing. Evaluating segment membership at request time (e.g., "Is this user in the high_value_shopper segment?") must happen in milliseconds. Redis sets and bitmaps make this fast enough to use inside a single HTTP request.

## Segmentation Approaches

| Approach | Data Structure | Best For |
|----------|----------------|----------|
| Explicit membership | Set per segment | Precision targeting, CRM segments |
| Behavioral bitmap | Bitmap per segment | Massive scale (100M+ users) |
| Attribute-based | Hash per user | Dynamic real-time evaluation |

## Setup

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

SEGMENT_PREFIX = "segment"
USER_SEGMENTS_PREFIX = "user:segments"
SEGMENT_BITMAP_PREFIX = "segment:bitmap"
SEGMENT_TTL = 3600      # 1 hour for set-based segments
ATTR_TTL = 300          # 5 minutes for user attributes
```

## Set-Based Segments

Suitable for segments up to a few million users:

```python
def add_to_segment(segment_id: str, user_id: str):
    r.sadd(f"{SEGMENT_PREFIX}:{segment_id}", user_id)
    r.sadd(f"{USER_SEGMENTS_PREFIX}:{user_id}", segment_id)

def remove_from_segment(segment_id: str, user_id: str):
    r.srem(f"{SEGMENT_PREFIX}:{segment_id}", user_id)
    r.srem(f"{USER_SEGMENTS_PREFIX}:{user_id}", segment_id)

def is_in_segment(segment_id: str, user_id: str) -> bool:
    return bool(r.sismember(f"{SEGMENT_PREFIX}:{segment_id}", user_id))

def get_user_segments(user_id: str) -> set:
    return r.smembers(f"{USER_SEGMENTS_PREFIX}:{user_id}")

def get_segment_size(segment_id: str) -> int:
    return r.scard(f"{SEGMENT_PREFIX}:{segment_id}")
```

## Bitmap-Based Segments (Scale-Efficient)

For segments with 10M+ users, bitmaps use 1 bit per user - just 1.25MB for 10 million users:

```python
def add_to_segment_bitmap(segment_id: str, user_int_id: int):
    r.setbit(f"{SEGMENT_BITMAP_PREFIX}:{segment_id}", user_int_id, 1)

def remove_from_segment_bitmap(segment_id: str, user_int_id: int):
    r.setbit(f"{SEGMENT_BITMAP_PREFIX}:{segment_id}", user_int_id, 0)

def is_in_segment_bitmap(segment_id: str, user_int_id: int) -> bool:
    return bool(r.getbit(f"{SEGMENT_BITMAP_PREFIX}:{segment_id}", user_int_id))

def get_segment_size_bitmap(segment_id: str) -> int:
    return r.bitcount(f"{SEGMENT_BITMAP_PREFIX}:{segment_id}")

def get_segment_overlap(segment_a: str, segment_b: str) -> int:
    temp_key = f"segment:temp:and:{segment_a}:{segment_b}"
    r.bitop("AND", temp_key, f"{SEGMENT_BITMAP_PREFIX}:{segment_a}", f"{SEGMENT_BITMAP_PREFIX}:{segment_b}")
    count = r.bitcount(temp_key)
    r.delete(temp_key)
    return count
```

## Targeting Decision

```python
def evaluate_targeting(user_id: str, required_segments: list[str],
                        excluded_segments: list[str] = None) -> dict:
    user_segs = get_user_segments(user_id)
    required_set = set(required_segments)
    excluded_set = set(excluded_segments or [])

    in_required = required_set.issubset(user_segs)
    in_excluded = bool(excluded_set & user_segs)

    return {
        "match": in_required and not in_excluded,
        "matched_segments": list(user_segs & required_set),
        "excluded_matches": list(user_segs & excluded_set),
        "user_segment_count": len(user_segs)
    }

def bulk_targeting_check(user_ids: list[str], required_segments: list[str]) -> dict:
    pipe = r.pipeline()
    for uid in user_ids:
        for seg in required_segments:
            pipe.sismember(f"{SEGMENT_PREFIX}:{seg}", uid)
    results = pipe.execute()

    n_segs = len(required_segments)
    matches = {}
    for i, uid in enumerate(user_ids):
        user_results = results[i * n_segs:(i + 1) * n_segs]
        matches[uid] = all(user_results)

    return matches
```

## Caching User Attributes for Dynamic Segmentation

```python
def cache_user_attributes(user_id: str, attributes: dict):
    key = f"user:attrs:{user_id}"
    r.setex(key, ATTR_TTL, json.dumps(attributes))

def evaluate_segment_rule(user_id: str, rule: dict) -> bool:
    attrs_raw = r.get(f"user:attrs:{user_id}")
    if not attrs_raw:
        return False

    attrs = json.loads(attrs_raw)
    field = rule["field"]
    operator = rule["operator"]
    value = rule["value"]

    user_val = attrs.get(field)
    if user_val is None:
        return False

    if operator == "eq":
        return str(user_val) == str(value)
    elif operator == "gt":
        return float(user_val) > float(value)
    elif operator == "lt":
        return float(user_val) < float(value)
    elif operator == "in":
        return user_val in value
    return False
```

## Summary

A Redis user segmentation cache stores explicit segment memberships in sets for fast `SISMEMBER` lookups, uses bitmaps for memory-efficient storage of large segments (1.25MB for 10M users), and caches user attribute snapshots for dynamic rule evaluation. Bulk targeting checks using `pipeline()` evaluate segment membership for hundreds of users in a single round trip, fitting comfortably within ad serving latency budgets.
