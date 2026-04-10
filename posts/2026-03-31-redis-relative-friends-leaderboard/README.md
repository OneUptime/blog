# How to Build a Relative Leaderboard (Friends Only) with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Leaderboard, Social, Friends, Sorted Set

Description: Build a friends-only relative leaderboard in Redis that shows rankings within a user's social circle using Sorted Set intersections.

---

A global leaderboard can be discouraging when you are ranked 5,847th. A friends leaderboard shows your rank among people you actually know, dramatically improving engagement. Redis Sorted Set operations make friend-scoped rankings fast.

## Data Model

Store each user's score in the global leaderboard and their friend graph as a Set:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def add_friend(user_id: str, friend_id: str):
    r.sadd(f"friends:{user_id}", friend_id)
    r.sadd(f"friends:{friend_id}", user_id)

def remove_friend(user_id: str, friend_id: str):
    r.srem(f"friends:{user_id}", friend_id)
    r.srem(f"friends:{friend_id}", user_id)

def update_score(user_id: str, score: float):
    r.zadd("leaderboard:global", {user_id: score})
```

## Building the Friend Leaderboard

```python
def get_friends_leaderboard(user_id: str, n: int = 20) -> list:
    friends = r.smembers(f"friends:{user_id}")
    # Include the user themselves
    members = list(friends) + [user_id]

    # Create a temporary sorted set containing only friends
    temp_key = f"leaderboard:friends:{user_id}:temp"

    # Fetch all scores in a single pipeline round-trip
    score_pipe = r.pipeline()
    for member in members:
        score_pipe.zscore("leaderboard:global", member)
    scores = score_pipe.execute()

    # Build the temporary sorted set
    pipe = r.pipeline()
    pipe.delete(temp_key)  # Remove stale entries from prior calls
    for member, score in zip(members, scores):
        if score is not None:
            pipe.zadd(temp_key, {member: score})
    pipe.expire(temp_key, 60)  # Cache for 1 minute
    pipe.execute()

    entries = r.zrevrange(temp_key, 0, n - 1, withscores=True)
    return [
        {
            "rank": i + 1,
            "user_id": uid,
            "score": score,
            "is_self": uid == user_id,
        }
        for i, (uid, score) in enumerate(entries)
    ]
```

## Efficient ZINTERSTORE Approach

For large friend lists, use ZINTERSTORE to intersect the global leaderboard with the friends Set server-side:

```python
def get_friends_leaderboard_v2(user_id: str, n: int = 20) -> list:
    friends_key = f"friends:{user_id}"
    temp_friends_key = f"lb:friends_set:{user_id}:temp"
    dest_key = f"lb:friends_scores:{user_id}"

    pipe = r.pipeline()
    # Copy friends set and include the user themselves
    pipe.sunionstore(temp_friends_key, friends_key)
    pipe.sadd(temp_friends_key, user_id)
    # Intersect global leaderboard with friends set, keeping leaderboard scores
    # Set members are treated as score 1; WEIGHTS 0 zeroes them out
    pipe.zinterstore(dest_key, {"leaderboard:global": 1, temp_friends_key: 0})
    pipe.delete(temp_friends_key)
    pipe.expire(dest_key, 120)
    pipe.zrevrange(dest_key, 0, n - 1, withscores=True)
    results = pipe.execute()

    entries = results[-1]  # Result of the last command (zrevrange)
    return [
        {"rank": i + 1, "user_id": uid, "score": s}
        for i, (uid, s) in enumerate(entries)
    ]
```

## Getting Your Rank Among Friends

```python
def get_friend_rank(user_id: str) -> int:
    temp_key = f"leaderboard:friends:{user_id}:temp"
    # Ensure the friend leaderboard is populated
    get_friends_leaderboard(user_id)
    rank = r.zrevrank(temp_key, user_id)
    if rank is not None:
        return rank + 1  # Convert 0-based to 1-based
    return -1
```

## Monitoring

Monitor the friends-leaderboard API endpoint with [OneUptime](https://oneuptime.com) to catch latency increases as friend lists grow.

```bash
redis-cli SMEMBERS friends:user_123 | wc -l
```

## Summary

Friends-only leaderboards require composing a view from the global Sorted Set filtered by the user's friend Set. Caching the composite temporary key for 60 seconds balances freshness with performance. For users with very large friend lists (over 1,000), consider pre-computing friend leaderboards asynchronously on score updates.
