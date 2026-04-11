# How to Implement Funnel Analytics with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Funnel, Analytics, Conversion, Bitmap

Description: Implement conversion funnel analytics using Redis Bitmaps and Sets to track user progression through steps with minimal memory.

---

Funnel analytics answer the question: how many users who did step 1 also did step 2, step 3, and completed the goal? Redis Bitmaps and Sets make per-user step tracking memory-efficient and queries fast.

## Bitmap-Based Funnel Tracking

Bitmaps use one bit per user, so 1 million users costs only 125 KB:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

FUNNEL_STEPS = ["visited_page", "viewed_product", "added_to_cart", "purchased"]

def record_funnel_step(funnel_id: str, step: str, user_id: int):
    key = f"funnel:{funnel_id}:{step}"
    r.setbit(key, user_id, 1)

def count_users_at_step(funnel_id: str, step: str) -> int:
    key = f"funnel:{funnel_id}:{step}"
    return r.bitcount(key)
```

## Multi-Step Funnel Conversion Rates

Use BITOP AND to find users who completed multiple steps:

```python
def get_funnel_report(funnel_id: str) -> list:
    report = []
    prev_count = None

    for i, step in enumerate(FUNNEL_STEPS):
        # AND all steps up to this one to find users who completed all prior steps
        keys = [f"funnel:{funnel_id}:{s}" for s in FUNNEL_STEPS[:i+1]]
        dest = f"funnel:{funnel_id}:through_step_{i}"

        if len(keys) == 1:
            r.copy(keys[0], dest, replace=True)
        else:
            r.bitop("AND", dest, *keys)

        r.expire(dest, 300)
        count = r.bitcount(dest)
        conversion = round(count / prev_count * 100, 1) if prev_count else 100.0

        report.append({
            "step": step,
            "users": count,
            "step_conversion": conversion,
        })
        prev_count = count

    return report
```

## Set-Based Funnel for Cohort Analysis

Use Sets when you need to know which specific users are in each stage:

```python
def record_funnel_step_set(funnel_id: str, step: str, user_id: str):
    key = f"funnel:set:{funnel_id}:{step}"
    r.sadd(key, user_id)
    r.expire(key, 86400 * 30)

def get_users_who_dropped_off(funnel_id: str, step_from: str, step_to: str) -> set:
    from_key = f"funnel:set:{funnel_id}:{step_from}"
    to_key = f"funnel:set:{funnel_id}:{step_to}"
    # Users in step_from but NOT step_to
    diff_key = f"funnel:set:{funnel_id}:dropoff:{step_from}_{step_to}"
    r.sdiffstore(diff_key, from_key, to_key)
    r.expire(diff_key, 300)
    return r.smembers(diff_key)
```

## Time-Windowed Funnels

```python
import time

def record_timed_step(funnel_id: str, step: str, user_id: int):
    today = time.strftime("%Y-%m-%d")
    key = f"funnel:{funnel_id}:{step}:{today}"
    r.setbit(key, user_id, 1)
    r.expire(key, 90 * 86400)
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to alert when funnel conversion rates drop below thresholds, catching checkout bugs before they erode revenue.

## Summary

Redis Bitmaps provide the most memory-efficient funnel step tracking - 1 million users per step costs only 125 KB. BITOP AND queries find users who completed every step up to any point. For cohort-level drop-off analysis, Set operations with SDIFFSTORE reveal exactly which users abandoned the funnel at each transition.
