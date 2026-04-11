# How to Use ZCOUNT in Redis to Count Members in a Score Range

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, ZCOUNT, Score Range, Command

Description: Learn how to use ZCOUNT in Redis to efficiently count the number of members in a sorted set whose scores fall within a specified range.

---

## What Is ZCOUNT

`ZCOUNT` returns the count of members in a sorted set whose scores fall between a minimum and maximum value (inclusive by default). It is an O(log N) operation that avoids fetching actual members, making it ideal for range-based analytics.

## Syntax

```text
ZCOUNT key min max
```

- `key` - the sorted set key
- `min` - minimum score (inclusive); use `-inf` for no lower bound
- `max` - maximum score (inclusive); use `+inf` for no upper bound

To make a bound exclusive, prefix it with `(`:
- `(min` - exclude the lower bound
- `(max` - exclude the upper bound

Returns an integer - the count of matching members.

## Basic Usage

### Count Members in Score Range

```bash
redis-cli ZADD scores 10 "alice" 25 "bob" 40 "charlie" 55 "dave" 70 "eve"

redis-cli ZCOUNT scores 20 60
```

```text
(integer) 3
```

`bob` (25), `charlie` (40), and `dave` (55) are in the range [20, 60].

### Count All Members

```bash
redis-cli ZCOUNT scores -inf +inf
```

```text
(integer) 5
```

### Count with Upper Bound Only

```bash
redis-cli ZCOUNT scores -inf 40
```

```text
(integer) 3
```

`alice` (10), `bob` (25), `charlie` (40) qualify.

### Exclusive Bounds

```bash
# Exclude 40 from upper bound
redis-cli ZCOUNT scores -inf "(40"
```

```text
(integer) 2
```

Only `alice` (10) and `bob` (25) qualify (40 itself is excluded).

```bash
# Exclude both bounds
redis-cli ZCOUNT scores "(20" "(60"
```

```text
(integer) 3
```

`bob` (25), `charlie` (40), and `dave` (55) all have scores strictly between 20 and 60.

### No Members in Range

```bash
redis-cli ZCOUNT scores 100 200
```

```text
(integer) 0
```

## Practical Examples

### Leaderboard - Count Players in Score Tier

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('leaderboard', {
    'player:alice': 1200,
    'player:bob': 850,
    'player:charlie': 2100,
    'player:dave': 1800,
    'player:eve': 600,
    'player:frank': 1500,
})

tiers = {
    'bronze': (0, 999),
    'silver': (1000, 1499),
    'gold': (1500, 1999),
    'platinum': (2000, float('inf')),
}

for tier, (low, high) in tiers.items():
    max_score = '+inf' if high == float('inf') else high
    count = r.zcount('leaderboard', low, max_score)
    print(f"{tier.capitalize()}: {count} players")

# Bronze: 2 players
# Silver: 1 player
# Gold: 2 players
# Platinum: 1 player
```

### Time-Based Event Counting

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Store events with timestamp as score
now = int(time.time())
r.zadd('events', {
    'event:1': now - 3600,  # 1 hour ago
    'event:2': now - 1800,  # 30 min ago
    'event:3': now - 900,   # 15 min ago
    'event:4': now - 300,   # 5 min ago
    'event:5': now - 60,    # 1 min ago
})

def count_events_in_window(minutes):
    cutoff = now - (minutes * 60)
    return r.zcount('events', cutoff, '+inf')

print(f"Events in last 10 min: {count_events_in_window(10)}")  # 2
print(f"Events in last 30 min: {count_events_in_window(30)}")  # 4
print(f"Events in last hour: {count_events_in_window(60)}")    # 5
```

### Price Range Filtering

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('products:price', {
    'prod:laptop': 999.99,
    'prod:mouse': 29.99,
    'prod:keyboard': 79.99,
    'prod:monitor': 399.99,
    'prod:headphones': 149.99,
    'prod:webcam': 59.99,
})

def count_products_in_range(min_price, max_price):
    return r.zcount('products:price', min_price, max_price)

print(f"Under $100: {count_products_in_range(0, 100)}")        # 3
print(f"$100-$500: {count_products_in_range(100, 500)}")       # 2
print(f"Over $500: {count_products_in_range('(500', '+inf')}") # 1
```

### Rate Limiting - Count Recent Requests

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def is_rate_limited(user_id, limit=100, window_seconds=60):
    key = f'requests:{user_id}'
    now = time.time()
    window_start = now - window_seconds

    # Count requests in the current window
    count = r.zcount(key, window_start, '+inf')
    if count >= limit:
        return True

    # Add current request
    r.zadd(key, {str(now): now})
    r.expire(key, window_seconds * 2)
    return False

print(is_rate_limited('user:42'))  # False - first request
```

## Summary

`ZCOUNT` efficiently counts sorted set members within a score range without returning the actual members, making it ideal for analytics, tier counting, and time-window queries. Use `-inf` and `+inf` for open-ended bounds, and prefix values with `(` for exclusive bounds. It runs in O(log N) time and is significantly more efficient than `ZRANGEBYSCORE` followed by a client-side count.
