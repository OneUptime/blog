# How to Use ZSCORE in Redis to Get a Member's Score

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, ZSCORE, Score Lookup, Command

Description: Learn how to use ZSCORE in Redis to retrieve the floating-point score associated with a specific member in a sorted set.

---

## What Is ZSCORE

`ZSCORE` returns the score of a member in a Redis sorted set. Scores are stored as double-precision floating-point numbers. The command is an O(1) lookup and returns nil if the member or key does not exist.

## Syntax

```text
ZSCORE key member
```

- `key` - the sorted set key
- `member` - the member whose score to retrieve

Returns the score as a bulk string, or nil if the member is not found.

## Basic Usage

### Get a Member's Score

```bash
redis-cli ZADD leaderboard 9500 "alice" 8200 "bob" 9800 "charlie"

redis-cli ZSCORE leaderboard "alice"
```

```text
"9500"
```

### Member Not Found

```bash
redis-cli ZSCORE leaderboard "dave"
```

```text
(nil)
```

### Key Does Not Exist

```bash
redis-cli ZSCORE nonexistent "member"
```

```text
(nil)
```

### Floating-Point Score

```bash
redis-cli ZADD prices 19.99 "product:a" 49.95 "product:b"
redis-cli ZSCORE prices "product:b"
```

```text
"49.95"
```

## Batch Score Lookups with ZMSCORE

For multiple members at once, use `ZMSCORE` (Redis 6.2+):

```bash
redis-cli ZMSCORE leaderboard "alice" "bob" "charlie" "nonexistent"
```

```text
1) "9500"
2) "8200"
3) "9800"
4) (nil)
```

## Practical Examples

### Check and Display User Score

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('game:scores', {'player:1': 15000, 'player:2': 12000, 'player:3': 18000})

def get_player_score(player_id):
    score = r.zscore('game:scores', player_id)
    if score is None:
        return "Player not found"
    return int(score)

print(get_player_score('player:1'))  # 15000
print(get_player_score('player:99')) # Player not found
```

### Score Exists Check

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('subscribers', {'user:a': 1, 'user:b': 1, 'user:c': 1})

def is_subscribed(user_id):
    return r.zscore('subscribers', user_id) is not None

print(is_subscribed('user:a'))  # True
print(is_subscribed('user:z'))  # False
```

### Score Threshold Check

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('reputation', {'user:alice': 850, 'user:bob': 420, 'user:charlie': 1200})

def can_post_comment(user_id, min_reputation=500):
    score = r.zscore('reputation', user_id)
    if score is None:
        return False
    return score >= min_reputation

print(can_post_comment('user:alice'))    # True (850 >= 500)
print(can_post_comment('user:bob'))     # False (420 < 500)
print(can_post_comment('user:charlie')) # True (1200 >= 500)
```

### Tracking Score Changes

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('scores', {'player:1': 1000})

def award_points(player_id, points):
    old_score = r.zscore('scores', player_id) or 0
    new_score = r.zincrby('scores', points, player_id)
    print(f"{player_id}: {int(old_score)} -> {int(new_score)} (+{points})")
    return new_score

award_points('player:1', 250)
award_points('player:1', 100)
```

### Bulk Score Retrieval with ZMSCORE

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('prices', {'item:a': 9.99, 'item:b': 24.99, 'item:c': 4.99})

def get_cart_total(item_ids):
    scores = r.zmscore('prices', item_ids)
    total = sum(s for s in scores if s is not None)
    return round(total, 2)

cart = ['item:a', 'item:b', 'item:unknown']
total = get_cart_total(cart)
print(f"Cart total: ${total}")  # $34.98
```

### Price Comparison

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('market:prices', {'AAPL': 185.50, 'GOOGL': 141.20, 'MSFT': 420.75})

def get_price_change_pct(ticker, new_price):
    old_price = r.zscore('market:prices', ticker)
    if old_price is None:
        return None
    change = (new_price - old_price) / old_price * 100
    r.zadd('market:prices', {ticker: new_price})
    return round(change, 2)

change = get_price_change_pct('AAPL', 190.25)
print(f"AAPL price change: {change}%")  # 2.56%
```

## Summary

`ZSCORE` provides O(1) score retrieval for a single sorted set member, returning nil for missing members or keys without raising errors. Use `ZMSCORE` (Redis 6.2+) for batch lookups of multiple members in one round trip. It is commonly used for membership checks (nil means absent), score-based access control, change tracking before updates, and displaying current standings in leaderboard applications.
