# How to Use ZRANK and ZREVRANK in Redis to Get Member Rankings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, ZRANK, ZREVRANK, Leaderboard

Description: Learn how to use ZRANK and ZREVRANK in Redis to retrieve a member's rank within a sorted set, from both the lowest and highest score perspectives.

---

## What Are ZRANK and ZREVRANK

`ZRANK` returns the zero-based rank of a member in a sorted set, ordered from lowest to highest score. `ZREVRANK` returns the rank ordered from highest to lowest score. Both return nil if the member does not exist.

Since Redis 7.2, both commands support a `WITHSCORE` option that returns the member's score alongside its rank.

## Syntax

```text
ZRANK key member [WITHSCORE]
ZREVRANK key member [WITHSCORE]
```

- `key` - the sorted set key
- `member` - the member to look up
- `WITHSCORE` - also return the member's score (Redis 7.2+)

Returns an integer rank (0-based), or nil if the member is not found.

## Basic Usage

### Get Rank from Lowest

```bash
redis-cli ZADD leaderboard 100 "alice" 200 "bob" 300 "charlie" 400 "dave"

redis-cli ZRANK leaderboard "alice"
```

```text
(integer) 0
```

```bash
redis-cli ZRANK leaderboard "charlie"
```

```text
(integer) 2
```

### Get Rank from Highest

```bash
redis-cli ZREVRANK leaderboard "charlie"
```

```text
(integer) 1
```

```bash
redis-cli ZREVRANK leaderboard "alice"
```

```text
(integer) 3
```

### Member Not Found

```bash
redis-cli ZRANK leaderboard "nobody"
```

```text
(nil)
```

### With Score (Redis 7.2+)

```bash
redis-cli ZRANK leaderboard "bob" WITHSCORE
```

```text
1) (integer) 1
2) "200"
```

```bash
redis-cli ZREVRANK leaderboard "bob" WITHSCORE
```

```text
1) (integer) 2
2) "200"
```

## Converting Rank to Human-Readable Position

Rank is zero-based. Add 1 for a 1-based position display:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('leaderboard', {'alice': 9500, 'bob': 8200, 'charlie': 9800, 'dave': 7100})

def get_player_position(player_id):
    rank = r.zrevrank('leaderboard', player_id)
    if rank is None:
        return None
    return rank + 1  # Convert to 1-based

print(f"Charlie is #{get_player_position('charlie')}")  # Charlie is #1
print(f"Alice is #{get_player_position('alice')}")       # Alice is #2
print(f"Bob is #{get_player_position('bob')}")           # Bob is #3
```

## Practical Examples

### User Leaderboard Position

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('game:scores', {
    'player:1': 15000, 'player:2': 12000, 'player:3': 18000,
    'player:4': 9500, 'player:5': 16500,
})

def get_player_stats(player_id):
    score = r.zscore('game:scores', player_id)
    rank = r.zrevrank('game:scores', player_id)
    total = r.zcard('game:scores')

    if score is None:
        return None

    return {
        'player': player_id,
        'score': int(score),
        'rank': rank + 1,
        'percentile': round((total - rank) / total * 100, 1)
    }

stats = get_player_stats('player:2')
print(stats)
# {'player': 'player:2', 'score': 12000, 'rank': 4, 'percentile': 40.0}
```

### Rank Change Tracking

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def update_score_and_track_rank_change(player, new_score):
    # Get rank before update
    old_rank = r.zrevrank('leaderboard:live', player)

    # Update score
    r.zadd('leaderboard:live', {player: new_score})

    # Get rank after update
    new_rank = r.zrevrank('leaderboard:live', player)

    if old_rank is not None and new_rank is not None:
        change = old_rank - new_rank  # Positive means moved up
        if change > 0:
            print(f"{player} moved UP {change} spots to rank {new_rank + 1}")
        elif change < 0:
            print(f"{player} dropped {abs(change)} spots to rank {new_rank + 1}")
        else:
            print(f"{player} held rank {new_rank + 1}")
    return new_rank

r.zadd('leaderboard:live', {'alice': 1000, 'bob': 2000, 'charlie': 1500})
update_score_and_track_rank_change('alice', 2500)
# alice moved UP 2 spots to rank 1
```

### Percentile Calculation

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('test:scores', {f'student:{i}': i * 7 for i in range(1, 101)})

def get_percentile(student_id):
    rank = r.zrank('test:scores', student_id)  # 0 = lowest
    total = r.zcard('test:scores')
    if rank is None:
        return None
    return round(rank / total * 100, 1)

print(f"student:50 percentile: {get_percentile('student:50')}")  # 49.0
print(f"student:100 percentile: {get_percentile('student:100')}") # 99.0
```

### Check if User is in Top N

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('competition', {'user:a': 950, 'user:b': 820, 'user:c': 980,
                        'user:d': 710, 'user:e': 865})

def is_top_n(user_id, n=3):
    rank = r.zrevrank('competition', user_id)
    if rank is None:
        return False
    return rank < n  # Rank is 0-based

print(f"user:b in top 3: {is_top_n('user:b', 3)}")  # False (rank 3)
print(f"user:e in top 3: {is_top_n('user:e', 3)}")  # True (rank 2)
```

## Summary

`ZRANK` and `ZREVRANK` efficiently retrieve the zero-based position of a sorted set member from the lowest-score and highest-score ends respectively. Add 1 to convert to a human-readable 1-based rank. The `WITHSCORE` option (Redis 7.2+) retrieves both rank and score in a single command. Together they enable leaderboard displays, percentile calculations, rank change detection, and top-N eligibility checks.
