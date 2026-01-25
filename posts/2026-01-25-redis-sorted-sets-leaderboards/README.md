# How to Use Redis Sorted Sets for Leaderboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Sets, Leaderboards, Gaming, Performance, Data Structures

Description: Build fast, scalable leaderboards with Redis sorted sets. Learn ranking, pagination, time-based boards, and real-time score updates.

---

Redis sorted sets are perfect for leaderboards because they maintain elements sorted by score with O(log N) insertion and O(log N) rank lookups. You can query rankings, get top players, and update scores with minimal latency even with millions of entries.

## Basic Leaderboard Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Add players with scores
r.zadd('leaderboard', {
    'player1': 1500,
    'player2': 2300,
    'player3': 1800,
    'player4': 2100,
    'player5': 1950
})

# Get top 3 players (highest scores first)
top_players = r.zrevrange('leaderboard', 0, 2, withscores=True)
print("Top 3:")
for rank, (player, score) in enumerate(top_players, 1):
    print(f"  #{rank} {player}: {score}")

# Get player's rank (0-indexed, highest score = rank 0)
rank = r.zrevrank('leaderboard', 'player3')
print(f"\nplayer3 rank: #{rank + 1}")

# Get player's score
score = r.zscore('leaderboard', 'player3')
print(f"player3 score: {score}")

# Update score
r.zadd('leaderboard', {'player3': 2500})  # New high score
new_rank = r.zrevrank('leaderboard', 'player3')
print(f"player3 new rank: #{new_rank + 1}")

# Increment score
r.zincrby('leaderboard', 100, 'player1')  # Add 100 points
```

## Complete Leaderboard Class

```python
import redis
from typing import List, Tuple, Optional
import time

class Leaderboard:
    """Full-featured leaderboard using Redis sorted sets"""

    def __init__(self, name: str, redis_client=None):
        self.name = name
        self.key = f'leaderboard:{name}'
        self.r = redis_client or redis.Redis(decode_responses=True)

    def add_score(self, player_id: str, score: float) -> int:
        """Add or update player score, return new rank"""
        self.r.zadd(self.key, {player_id: score})
        return self.get_rank(player_id)

    def increment_score(self, player_id: str, amount: float) -> Tuple[float, int]:
        """Increment score and return new score and rank"""
        new_score = self.r.zincrby(self.key, amount, player_id)
        rank = self.get_rank(player_id)
        return new_score, rank

    def get_rank(self, player_id: str) -> Optional[int]:
        """Get player rank (1-indexed, 1 = highest score)"""
        rank = self.r.zrevrank(self.key, player_id)
        return rank + 1 if rank is not None else None

    def get_score(self, player_id: str) -> Optional[float]:
        """Get player's current score"""
        return self.r.zscore(self.key, player_id)

    def get_top(self, count: int = 10) -> List[dict]:
        """Get top N players"""
        results = self.r.zrevrange(self.key, 0, count - 1, withscores=True)
        return [
            {'rank': i + 1, 'player': player, 'score': score}
            for i, (player, score) in enumerate(results)
        ]

    def get_around_player(self, player_id: str, count: int = 5) -> List[dict]:
        """Get players around a specific player"""
        rank = self.r.zrevrank(self.key, player_id)
        if rank is None:
            return []

        start = max(0, rank - count)
        end = rank + count

        results = self.r.zrevrange(self.key, start, end, withscores=True)
        return [
            {'rank': start + i + 1, 'player': player, 'score': score}
            for i, (player, score) in enumerate(results)
        ]

    def get_page(self, page: int, page_size: int = 20) -> List[dict]:
        """Get a page of the leaderboard"""
        start = (page - 1) * page_size
        end = start + page_size - 1

        results = self.r.zrevrange(self.key, start, end, withscores=True)
        return [
            {'rank': start + i + 1, 'player': player, 'score': score}
            for i, (player, score) in enumerate(results)
        ]

    def get_player_count(self) -> int:
        """Get total number of players"""
        return self.r.zcard(self.key)

    def remove_player(self, player_id: str) -> bool:
        """Remove player from leaderboard"""
        return self.r.zrem(self.key, player_id) > 0

    def get_score_range(self, min_score: float, max_score: float) -> List[dict]:
        """Get players within a score range"""
        results = self.r.zrevrangebyscore(
            self.key, max_score, min_score, withscores=True
        )
        return [
            {'player': player, 'score': score}
            for player, score in results
        ]

# Usage
lb = Leaderboard('game:season1')

# Add some players
lb.add_score('alice', 1500)
lb.add_score('bob', 2300)
lb.add_score('charlie', 1800)
lb.add_score('diana', 2100)
lb.add_score('eve', 1950)

# Get top players
print("Top 3:")
for entry in lb.get_top(3):
    print(f"  #{entry['rank']} {entry['player']}: {entry['score']}")

# Get player info
print(f"\nCharlie's rank: #{lb.get_rank('charlie')}")
print(f"Charlie's score: {lb.get_score('charlie')}")

# Update score
new_score, new_rank = lb.increment_score('charlie', 500)
print(f"Charlie after +500: score={new_score}, rank=#{new_rank}")

# Get players around charlie
print("\nPlayers around Charlie:")
for entry in lb.get_around_player('charlie', 2):
    print(f"  #{entry['rank']} {entry['player']}: {entry['score']}")
```

## Time-Based Leaderboards

Create daily, weekly, or monthly leaderboards:

```python
import redis
from datetime import datetime, timedelta

r = redis.Redis(decode_responses=True)

class TimeBasedLeaderboard:
    """Leaderboard with time periods (daily, weekly, monthly)"""

    def __init__(self, name: str):
        self.name = name
        self.r = redis.Redis(decode_responses=True)

    def _get_key(self, period: str, date: datetime = None) -> str:
        """Generate key for specific time period"""
        date = date or datetime.now()

        if period == 'daily':
            suffix = date.strftime('%Y-%m-%d')
        elif period == 'weekly':
            # Week number
            suffix = date.strftime('%Y-W%W')
        elif period == 'monthly':
            suffix = date.strftime('%Y-%m')
        elif period == 'alltime':
            suffix = 'alltime'
        else:
            raise ValueError(f"Unknown period: {period}")

        return f'leaderboard:{self.name}:{period}:{suffix}'

    def add_score(self, player_id: str, score: float, periods: List[str] = None):
        """Add score to multiple time-period leaderboards"""
        periods = periods or ['daily', 'weekly', 'monthly', 'alltime']

        pipe = self.r.pipeline()
        for period in periods:
            key = self._get_key(period)
            pipe.zincrby(key, score, player_id)

            # Set TTL for time-limited boards
            if period == 'daily':
                pipe.expire(key, 86400 * 7)  # Keep 7 days
            elif period == 'weekly':
                pipe.expire(key, 86400 * 30)  # Keep 30 days
            elif period == 'monthly':
                pipe.expire(key, 86400 * 365)  # Keep 1 year

        pipe.execute()

    def get_top(self, period: str, count: int = 10, date: datetime = None):
        """Get top players for a specific period"""
        key = self._get_key(period, date)
        results = self.r.zrevrange(key, 0, count - 1, withscores=True)
        return [
            {'rank': i + 1, 'player': player, 'score': score}
            for i, (player, score) in enumerate(results)
        ]

    def get_rank(self, player_id: str, period: str, date: datetime = None):
        """Get player rank in specific period"""
        key = self._get_key(period, date)
        rank = self.r.zrevrank(key, player_id)
        return rank + 1 if rank is not None else None

# Usage
lb = TimeBasedLeaderboard('game')

# Record game results
lb.add_score('alice', 100)
lb.add_score('bob', 150)
lb.add_score('alice', 200)  # Alice plays again

# Get daily leaders
print("Today's top players:")
for entry in lb.get_top('daily', 5):
    print(f"  #{entry['rank']} {entry['player']}: {entry['score']}")

# Get all-time leaders
print("\nAll-time top players:")
for entry in lb.get_top('alltime', 5):
    print(f"  #{entry['rank']} {entry['player']}: {entry['score']}")
```

## Handling Score Ties

When scores are equal, sorted sets order by member name. For custom tie-breaking:

```python
import redis
import time

r = redis.Redis(decode_responses=True)

class TieBreakingLeaderboard:
    """Leaderboard that breaks ties by timestamp (earlier = higher rank)"""

    def __init__(self, name: str):
        self.key = f'leaderboard:{name}'
        self.r = redis.Redis(decode_responses=True)

    def add_score(self, player_id: str, score: int):
        """
        Store score with timestamp for tie-breaking.
        Score format: score.timestamp_inverted
        Example: 1500.999999999000 (higher timestamp decimal = earlier time)
        """
        # Invert timestamp so earlier times get higher scores
        ts_component = 1 - (time.time() / 10000000000)
        composite_score = score + ts_component

        self.r.zadd(self.key, {player_id: composite_score})

    def get_top(self, count: int = 10):
        """Get top players with tie-breaking by time"""
        results = self.r.zrevrange(self.key, 0, count - 1, withscores=True)
        return [
            {
                'rank': i + 1,
                'player': player,
                'score': int(score)  # Remove decimal component
            }
            for i, (player, score) in enumerate(results)
        ]

# Usage
lb = TieBreakingLeaderboard('tournament')

lb.add_score('player1', 1500)
time.sleep(0.1)
lb.add_score('player2', 1500)  # Same score but later
time.sleep(0.1)
lb.add_score('player3', 1500)  # Same score but even later

# player1 ranks highest because they achieved the score first
for entry in lb.get_top(5):
    print(f"#{entry['rank']} {entry['player']}: {entry['score']}")
```

## Real-Time Updates

```python
import redis
import json

r = redis.Redis(decode_responses=True)

def update_score_with_notification(leaderboard_key, player_id, new_score):
    """Update score and publish change notification"""
    pipe = r.pipeline()

    # Get old rank
    old_rank = r.zrevrank(leaderboard_key, player_id)

    # Update score
    pipe.zadd(leaderboard_key, {player_id: new_score})

    # Get new rank after update
    pipe.zrevrank(leaderboard_key, player_id)

    results = pipe.execute()
    new_rank = results[1]

    # Publish update for real-time clients
    update = {
        'player': player_id,
        'score': new_score,
        'old_rank': old_rank + 1 if old_rank else None,
        'new_rank': new_rank + 1
    }

    r.publish(f'leaderboard:{leaderboard_key}:updates', json.dumps(update))

    return update

# Subscribe to updates (in separate client)
def listen_for_updates(leaderboard_key):
    pubsub = r.pubsub()
    pubsub.subscribe(f'leaderboard:{leaderboard_key}:updates')

    for message in pubsub.listen():
        if message['type'] == 'message':
            update = json.loads(message['data'])
            print(f"Update: {update['player']} moved from #{update['old_rank']} to #{update['new_rank']}")
```

## Summary

| Operation | Command | Complexity |
|-----------|---------|------------|
| Add/Update score | ZADD | O(log N) |
| Get rank | ZREVRANK | O(log N) |
| Get score | ZSCORE | O(1) |
| Get top N | ZREVRANGE | O(log N + M) |
| Increment score | ZINCRBY | O(log N) |
| Count players | ZCARD | O(1) |

Best practices:
- Use ZREVRANGE for high-to-low rankings
- Implement pagination for large leaderboards
- Use composite scores for tie-breaking
- Create separate keys for different time periods
- Set TTL on time-limited leaderboards
- Publish updates for real-time displays
