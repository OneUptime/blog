# How to Implement a Rolling Window Rate Counter with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limit, Counter

Description: Build an accurate rolling window rate counter with Redis using sub-interval buckets to approximate true sliding windows with minimal memory overhead.

---

A pure sliding window rate limiter is memory-intensive (stores every timestamp). A fixed-window counter has boundary bursts. The sliding window counter using sub-interval buckets is the sweet spot: low memory, accurate enough for rate limiting, and easy to implement.

## The Sub-Interval Bucket Approach

Divide the window into N sub-intervals (buckets). Sum all bucket counts to get the rolling total. As time advances, old buckets expire and new ones are created:

```python
import redis
import time
import math

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def increment_rolling(identifier: str, window_seconds: int = 60,
                       num_buckets: int = 6) -> int:
    """
    Increment counter for the current sub-bucket.
    Returns the count in the current sub-bucket.
    """
    bucket_size = window_seconds / num_buckets
    current_bucket = math.floor(time.time() / bucket_size)

    key = f"rolling:{identifier}:{window_seconds}s:{current_bucket}"
    count = r.incr(key)
    # TTL slightly longer than one full window
    r.expire(key, window_seconds + int(bucket_size) + 1)
    return count

def get_rolling_count(identifier: str, window_seconds: int = 60,
                       num_buckets: int = 6) -> int:
    """Sum counts from all active buckets in the window."""
    bucket_size = window_seconds / num_buckets
    current_bucket = math.floor(time.time() / bucket_size)

    keys = [
        f"rolling:{identifier}:{window_seconds}s:{current_bucket - i}"
        for i in range(num_buckets)
    ]
    values = r.mget(keys)
    return sum(int(v or 0) for v in values)
```

## Rate Limiting with the Rolling Counter

```python
def check_rate_limit(identifier: str, limit: int, window_seconds: int = 60,
                      num_buckets: int = 6) -> bool:
    """Returns True if request is within rate limit."""
    increment_rolling(identifier, window_seconds, num_buckets)
    current = get_rolling_count(identifier, window_seconds, num_buckets)
    return current <= limit

def rate_limit_with_info(identifier: str, limit: int,
                          window_seconds: int = 60) -> dict:
    """Returns rate limit status with headers-friendly data."""
    increment_rolling(identifier, window_seconds)
    current = get_rolling_count(identifier, window_seconds)
    remaining = max(0, limit - current)
    return {
        "limit": limit,
        "current": current,
        "remaining": remaining,
        "allowed": current <= limit,
        "window_seconds": window_seconds
    }
```

## Per-Endpoint Rate Limits

Different endpoints may have different limits:

```python
RATE_LIMITS = {
    "search": {"limit": 30, "window": 60},
    "upload": {"limit": 10, "window": 3600},
    "login": {"limit": 5, "window": 300},
}

def check_endpoint_limit(user_id: str, endpoint: str) -> bool:
    config = RATE_LIMITS.get(endpoint)
    if not config:
        return True  # No limit defined

    identifier = f"{user_id}:{endpoint}"
    status = rate_limit_with_info(identifier, config["limit"], config["window"])
    return status["allowed"]
```

## Accuracy Analysis

```text
With 6 buckets over 60 seconds (10-second buckets):
- Worst case: a request at the end of bucket 1 and one at the start of bucket 6
  are counted as within the same window
- Max inaccuracy: 1 bucket size (10 seconds) worth of requests
- Memory: 6 keys per user per window (very low vs. pure sliding window)
- Accuracy: ~83-98% in practice for most traffic patterns
```

## Sliding Window vs. Bucket Approaches

```text
Pure Sliding Window Log:
- Memory: O(requests per window)
- Accuracy: Exact
- Use when: precision is critical (e.g., financial APIs)

Sliding Window Counter (buckets):
- Memory: O(buckets) = constant
- Accuracy: ~95% for uniform traffic
- Use when: efficiency matters more than exact precision
```

## Resetting a Counter

```python
def reset_rolling_counter(identifier: str, window_seconds: int = 60,
                            num_buckets: int = 6):
    import math
    bucket_size = window_seconds / num_buckets
    current_bucket = math.floor(time.time() / bucket_size)
    keys = [
        f"rolling:{identifier}:{window_seconds}s:{current_bucket - i}"
        for i in range(num_buckets)
    ]
    r.delete(*keys)
```

## Summary

The sliding window rate counter using Redis sub-interval buckets delivers near-exact rolling window accuracy at O(1) memory cost per user. It avoids the boundary burst problem of fixed-window counters and the memory overhead of timestamp logs - making it the most practical general-purpose rate limiter for production APIs.
