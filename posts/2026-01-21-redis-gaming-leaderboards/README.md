# How to Use Redis for Gaming Leaderboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Gaming, Leaderboards, Sorted Sets, Real-Time, Performance

Description: A comprehensive guide to building real-time gaming leaderboards with Redis sorted sets, covering score updates, rankings, pagination, and advanced patterns like time-based and multi-dimensional leaderboards.

---

Leaderboards are a core feature of gaming applications, driving competition and engagement among players. Redis sorted sets provide the perfect data structure for implementing real-time leaderboards with O(log N) score updates and O(log N + M) rank queries.

In this guide, we will build a complete leaderboard system using Redis, covering basic rankings, time-based leaderboards, multi-game support, and advanced patterns for high-performance gaming applications.

## Why Redis for Leaderboards?

Redis sorted sets offer several advantages for leaderboard implementations:

- **O(log N) Insertions**: Efficient score updates even with millions of players
- **O(log N) Rank Queries**: Get player rankings instantly
- **O(log N + M) Range Queries**: Fetch top N players efficiently
- **Atomic Operations**: ZINCRBY prevents race conditions
- **Memory Efficient**: Sorted sets use skip lists for compact storage
- **Real-Time Updates**: Changes reflect immediately

## Basic Leaderboard with Sorted Sets

### Simple Score Tracking

```python
import redis
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class Leaderboard:
    def __init__(self, name: str):
        self.name = name
        self.key = f"leaderboard:{name}"

    def add_score(self, player_id: str, score: float) -> float:
        """Set a player's score (replaces existing score)."""
        r.zadd(self.key, {player_id: score})
        return score

    def increment_score(self, player_id: str, increment: float) -> float:
        """Increment a player's score atomically."""
        return r.zincrby(self.key, increment, player_id)

    def get_score(self, player_id: str) -> Optional[float]:
        """Get a player's current score."""
        return r.zscore(self.key, player_id)

    def get_rank(self, player_id: str) -> Optional[int]:
        """Get a player's rank (0-indexed, highest score = rank 0)."""
        rank = r.zrevrank(self.key, player_id)
        return rank + 1 if rank is not None else None

    def get_top_players(self, limit: int = 10) -> List[Dict]:
        """Get top N players with scores and ranks."""
        results = r.zrevrange(self.key, 0, limit - 1, withscores=True)

        return [
            {
                "rank": i + 1,
                "player_id": player_id,
                "score": score
            }
            for i, (player_id, score) in enumerate(results)
        ]

    def get_players_around(self, player_id: str, range_size: int = 5) -> List[Dict]:
        """Get players around a specific player's rank."""
        rank = r.zrevrank(self.key, player_id)

        if rank is None:
            return []

        start = max(0, rank - range_size)
        end = rank + range_size

        results = r.zrevrange(self.key, start, end, withscores=True)

        return [
            {
                "rank": start + i + 1,
                "player_id": pid,
                "score": score,
                "is_current_player": pid == player_id
            }
            for i, (pid, score) in enumerate(results)
        ]

    def get_player_count(self) -> int:
        """Get total number of players on the leaderboard."""
        return r.zcard(self.key)

    def remove_player(self, player_id: str) -> bool:
        """Remove a player from the leaderboard."""
        return r.zrem(self.key, player_id) > 0

    def get_rank_range(self, start_rank: int, end_rank: int) -> List[Dict]:
        """Get players within a rank range (1-indexed)."""
        results = r.zrevrange(
            self.key,
            start_rank - 1,
            end_rank - 1,
            withscores=True
        )

        return [
            {
                "rank": start_rank + i,
                "player_id": player_id,
                "score": score
            }
            for i, (player_id, score) in enumerate(results)
        ]


# Usage
leaderboard = Leaderboard("game_scores")

# Add/update scores
leaderboard.add_score("player_001", 1500)
leaderboard.add_score("player_002", 2300)
leaderboard.add_score("player_003", 1800)
leaderboard.increment_score("player_001", 200)  # Now 1700

# Get rankings
print(f"Top 10 players: {leaderboard.get_top_players(10)}")
print(f"Player 001 rank: {leaderboard.get_rank('player_001')}")
print(f"Players around player_001: {leaderboard.get_players_around('player_001', 3)}")
```

## Time-Based Leaderboards

Implement daily, weekly, and monthly leaderboards:

```python
class TimeBasedLeaderboard:
    def __init__(self, game_name: str):
        self.game_name = game_name

    def _get_key(self, period: str, date: datetime = None) -> str:
        """Generate the leaderboard key for a time period."""
        if date is None:
            date = datetime.now()

        if period == "daily":
            suffix = date.strftime("%Y-%m-%d")
        elif period == "weekly":
            # Week starts on Monday
            week_start = date - timedelta(days=date.weekday())
            suffix = f"week-{week_start.strftime('%Y-%m-%d')}"
        elif period == "monthly":
            suffix = date.strftime("%Y-%m")
        elif period == "alltime":
            suffix = "alltime"
        else:
            raise ValueError(f"Invalid period: {period}")

        return f"leaderboard:{self.game_name}:{period}:{suffix}"

    def add_score(self, player_id: str, score: float,
                  periods: List[str] = None) -> Dict[str, float]:
        """Add score to multiple time-based leaderboards."""
        if periods is None:
            periods = ["daily", "weekly", "monthly", "alltime"]

        now = datetime.now()
        pipe = r.pipeline()
        keys = {}

        for period in periods:
            key = self._get_key(period, now)
            keys[period] = key
            pipe.zincrby(key, score, player_id)

            # Set expiration for non-alltime leaderboards
            if period == "daily":
                pipe.expire(key, 2 * 24 * 3600)  # 2 days
            elif period == "weekly":
                pipe.expire(key, 14 * 24 * 3600)  # 2 weeks
            elif period == "monthly":
                pipe.expire(key, 62 * 24 * 3600)  # ~2 months

        results = pipe.execute()

        return {
            period: results[i * 2]
            for i, period in enumerate(periods)
        }

    def get_leaderboard(self, period: str, limit: int = 10,
                        date: datetime = None) -> List[Dict]:
        """Get leaderboard for a specific time period."""
        key = self._get_key(period, date)
        results = r.zrevrange(key, 0, limit - 1, withscores=True)

        return [
            {
                "rank": i + 1,
                "player_id": player_id,
                "score": score
            }
            for i, (player_id, score) in enumerate(results)
        ]

    def get_player_stats(self, player_id: str) -> Dict:
        """Get a player's stats across all time periods."""
        now = datetime.now()
        periods = ["daily", "weekly", "monthly", "alltime"]

        pipe = r.pipeline()
        for period in periods:
            key = self._get_key(period, now)
            pipe.zscore(key, player_id)
            pipe.zrevrank(key, player_id)

        results = pipe.execute()

        stats = {}
        for i, period in enumerate(periods):
            score = results[i * 2]
            rank = results[i * 2 + 1]
            stats[period] = {
                "score": score or 0,
                "rank": rank + 1 if rank is not None else None
            }

        return stats


# Usage
tb_leaderboard = TimeBasedLeaderboard("space_shooter")

# Add scores (updates all time periods)
tb_leaderboard.add_score("player_001", 500)
tb_leaderboard.add_score("player_002", 750)
tb_leaderboard.add_score("player_001", 300)  # Additional score

# Get daily leaderboard
print("Daily Top 10:", tb_leaderboard.get_leaderboard("daily", 10))

# Get player stats
print("Player 001 stats:", tb_leaderboard.get_player_stats("player_001"))
```

## Multi-Game Leaderboard System

Support multiple games with a unified interface:

```python
class MultiGameLeaderboard:
    def __init__(self):
        self.games_key = "games:registered"

    def register_game(self, game_id: str, game_config: Dict) -> None:
        """Register a new game in the system."""
        r.hset(f"game:config:{game_id}", mapping={
            "name": game_config.get("name", game_id),
            "score_type": game_config.get("score_type", "highest"),
            "created_at": datetime.now().isoformat()
        })
        r.sadd(self.games_key, game_id)

    def submit_score(self, game_id: str, player_id: str, score: float,
                     metadata: Dict = None) -> Dict:
        """Submit a score for a game."""
        config = r.hgetall(f"game:config:{game_id}")
        score_type = config.get("score_type", "highest")

        key = f"leaderboard:{game_id}:alltime"
        current_score = r.zscore(key, player_id)

        # Handle different score types
        if score_type == "highest":
            if current_score is None or score > current_score:
                r.zadd(key, {player_id: score})
                new_best = True
            else:
                new_best = False
            final_score = max(score, current_score or 0)

        elif score_type == "lowest":
            if current_score is None or score < current_score:
                r.zadd(key, {player_id: score})
                new_best = True
            else:
                new_best = False
            final_score = min(score, current_score or float('inf'))

        elif score_type == "cumulative":
            final_score = r.zincrby(key, score, player_id)
            new_best = True

        else:
            r.zadd(key, {player_id: score})
            final_score = score
            new_best = True

        # Store metadata if provided
        if metadata:
            r.hset(
                f"score:metadata:{game_id}:{player_id}",
                mapping=metadata
            )

        # Get new rank
        if score_type == "lowest":
            rank = r.zrank(key, player_id)
        else:
            rank = r.zrevrank(key, player_id)

        return {
            "score": final_score,
            "rank": rank + 1 if rank is not None else None,
            "new_best": new_best
        }

    def get_global_leaderboard(self, game_id: str, limit: int = 100,
                               offset: int = 0) -> Dict:
        """Get paginated global leaderboard."""
        config = r.hgetall(f"game:config:{game_id}")
        score_type = config.get("score_type", "highest")
        key = f"leaderboard:{game_id}:alltime"

        total = r.zcard(key)

        if score_type == "lowest":
            results = r.zrange(key, offset, offset + limit - 1, withscores=True)
        else:
            results = r.zrevrange(key, offset, offset + limit - 1, withscores=True)

        players = [
            {
                "rank": offset + i + 1,
                "player_id": player_id,
                "score": score
            }
            for i, (player_id, score) in enumerate(results)
        ]

        return {
            "game_id": game_id,
            "total_players": total,
            "offset": offset,
            "limit": limit,
            "players": players
        }

    def get_player_rankings(self, player_id: str) -> List[Dict]:
        """Get a player's rankings across all games."""
        games = r.smembers(self.games_key)
        rankings = []

        for game_id in games:
            config = r.hgetall(f"game:config:{game_id}")
            key = f"leaderboard:{game_id}:alltime"

            score = r.zscore(key, player_id)
            if score is None:
                continue

            score_type = config.get("score_type", "highest")
            if score_type == "lowest":
                rank = r.zrank(key, player_id)
            else:
                rank = r.zrevrank(key, player_id)

            total = r.zcard(key)

            rankings.append({
                "game_id": game_id,
                "game_name": config.get("name", game_id),
                "score": score,
                "rank": rank + 1 if rank is not None else None,
                "total_players": total,
                "percentile": round((1 - rank / total) * 100, 1) if rank and total else 0
            })

        return rankings


# Usage
mg_leaderboard = MultiGameLeaderboard()

# Register games with different score types
mg_leaderboard.register_game("space_shooter", {
    "name": "Space Shooter",
    "score_type": "highest"
})

mg_leaderboard.register_game("speed_run", {
    "name": "Speed Run Challenge",
    "score_type": "lowest"  # Lower time is better
})

mg_leaderboard.register_game("coin_collector", {
    "name": "Coin Collector",
    "score_type": "cumulative"  # Total coins collected
})

# Submit scores
result = mg_leaderboard.submit_score("space_shooter", "player_001", 15000)
print(f"Space Shooter result: {result}")

result = mg_leaderboard.submit_score("speed_run", "player_001", 45.7)  # seconds
print(f"Speed Run result: {result}")

# Get player's rankings across games
print(f"Player rankings: {mg_leaderboard.get_player_rankings('player_001')}")
```

## Leaderboard with Player Profiles

Enrich leaderboard data with player information:

```python
class LeaderboardWithProfiles:
    def __init__(self, game_id: str):
        self.game_id = game_id
        self.leaderboard_key = f"leaderboard:{game_id}"
        self.profiles_key = f"profiles:{game_id}"

    def update_player_profile(self, player_id: str, profile: Dict) -> None:
        """Update a player's profile information."""
        r.hset(f"{self.profiles_key}:{player_id}", mapping={
            "username": profile.get("username", player_id),
            "avatar_url": profile.get("avatar_url", ""),
            "country": profile.get("country", ""),
            "level": profile.get("level", 1),
            "updated_at": datetime.now().isoformat()
        })

    def submit_score(self, player_id: str, score: float) -> Dict:
        """Submit a score and return enriched result."""
        # Update score
        current = r.zscore(self.leaderboard_key, player_id)
        if current is None or score > current:
            r.zadd(self.leaderboard_key, {player_id: score})

        # Get rank and profile
        rank = r.zrevrank(self.leaderboard_key, player_id)
        profile = r.hgetall(f"{self.profiles_key}:{player_id}")

        return {
            "player_id": player_id,
            "username": profile.get("username", player_id),
            "score": max(score, current or 0),
            "rank": rank + 1 if rank is not None else None,
            "new_high_score": current is None or score > current
        }

    def get_enriched_leaderboard(self, limit: int = 10) -> List[Dict]:
        """Get leaderboard with player profiles."""
        results = r.zrevrange(self.leaderboard_key, 0, limit - 1, withscores=True)

        if not results:
            return []

        # Batch fetch all profiles
        pipe = r.pipeline()
        for player_id, _ in results:
            pipe.hgetall(f"{self.profiles_key}:{player_id}")

        profiles = pipe.execute()

        enriched = []
        for i, ((player_id, score), profile) in enumerate(zip(results, profiles)):
            enriched.append({
                "rank": i + 1,
                "player_id": player_id,
                "username": profile.get("username", player_id),
                "avatar_url": profile.get("avatar_url", ""),
                "country": profile.get("country", ""),
                "level": int(profile.get("level", 1)),
                "score": score
            })

        return enriched


# Usage
lb = LeaderboardWithProfiles("battle_royale")

# Update profiles
lb.update_player_profile("player_001", {
    "username": "ShadowNinja",
    "avatar_url": "/avatars/ninja.png",
    "country": "US",
    "level": 42
})

lb.update_player_profile("player_002", {
    "username": "DragonSlayer99",
    "avatar_url": "/avatars/dragon.png",
    "country": "UK",
    "level": 38
})

# Submit scores
lb.submit_score("player_001", 2500)
lb.submit_score("player_002", 3200)

# Get enriched leaderboard
print("Enriched Leaderboard:")
for entry in lb.get_enriched_leaderboard(10):
    print(f"  #{entry['rank']} {entry['username']} ({entry['country']}) - {entry['score']} pts")
```

## Real-Time Leaderboard Updates with Pub/Sub

Stream leaderboard changes to connected clients:

```python
import json
import threading

class RealTimeLeaderboard:
    def __init__(self, game_id: str):
        self.game_id = game_id
        self.leaderboard_key = f"leaderboard:{game_id}"
        self.channel = f"leaderboard:updates:{game_id}"

    def submit_score(self, player_id: str, score: float,
                     username: str = None) -> Dict:
        """Submit score and broadcast update."""
        # Get previous rank
        prev_rank = r.zrevrank(self.leaderboard_key, player_id)
        prev_score = r.zscore(self.leaderboard_key, player_id)

        # Update score if it is higher
        if prev_score is None or score > prev_score:
            r.zadd(self.leaderboard_key, {player_id: score})

        # Get new rank
        new_rank = r.zrevrank(self.leaderboard_key, player_id)
        final_score = r.zscore(self.leaderboard_key, player_id)

        result = {
            "player_id": player_id,
            "username": username or player_id,
            "score": final_score,
            "rank": new_rank + 1 if new_rank is not None else None,
            "previous_rank": prev_rank + 1 if prev_rank is not None else None,
            "rank_change": (prev_rank - new_rank) if prev_rank is not None and new_rank is not None else 0
        }

        # Broadcast update if rank changed or new high score
        if prev_rank != new_rank or prev_score != final_score:
            self._broadcast_update(result)

        return result

    def _broadcast_update(self, update: Dict) -> None:
        """Broadcast leaderboard update to subscribers."""
        message = {
            "type": "score_update",
            "timestamp": datetime.now().isoformat(),
            "data": update
        }
        r.publish(self.channel, json.dumps(message))

    def subscribe_to_updates(self, callback) -> None:
        """Subscribe to leaderboard updates."""
        def listener():
            pubsub = r.pubsub()
            pubsub.subscribe(self.channel)

            for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    callback(data)

        thread = threading.Thread(target=listener, daemon=True)
        thread.start()

    def broadcast_top_10_change(self) -> None:
        """Broadcast current top 10 to all subscribers."""
        top_10 = r.zrevrange(self.leaderboard_key, 0, 9, withscores=True)

        message = {
            "type": "top_10_update",
            "timestamp": datetime.now().isoformat(),
            "data": [
                {"rank": i + 1, "player_id": pid, "score": score}
                for i, (pid, score) in enumerate(top_10)
            ]
        }
        r.publish(self.channel, json.dumps(message))


# WebSocket integration example (using Flask-SocketIO)
"""
from flask import Flask
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)

rt_leaderboard = RealTimeLeaderboard("racing_game")

def handle_update(update):
    socketio.emit('leaderboard_update', update, namespace='/game')

rt_leaderboard.subscribe_to_updates(handle_update)

@socketio.on('submit_score', namespace='/game')
def on_submit_score(data):
    result = rt_leaderboard.submit_score(
        data['player_id'],
        data['score'],
        data.get('username')
    )
    emit('score_result', result)
"""
```

## Country and Friend Leaderboards

Filter leaderboards by country or friends:

```python
class FilteredLeaderboard:
    def __init__(self, game_id: str):
        self.game_id = game_id
        self.global_key = f"leaderboard:{game_id}:global"

    def submit_score(self, player_id: str, score: float,
                     country: str = None) -> None:
        """Submit score to global and country leaderboards."""
        pipe = r.pipeline()

        # Global leaderboard
        pipe.zadd(self.global_key, {player_id: score}, gt=True)

        # Country leaderboard
        if country:
            country_key = f"leaderboard:{self.game_id}:country:{country}"
            pipe.zadd(country_key, {player_id: score}, gt=True)

            # Store player's country for lookup
            pipe.hset(f"player:country:{self.game_id}", player_id, country)

        pipe.execute()

    def get_country_leaderboard(self, country: str,
                                limit: int = 10) -> List[Dict]:
        """Get leaderboard for a specific country."""
        key = f"leaderboard:{self.game_id}:country:{country}"
        results = r.zrevrange(key, 0, limit - 1, withscores=True)

        return [
            {"rank": i + 1, "player_id": pid, "score": score}
            for i, (pid, score) in enumerate(results)
        ]

    def add_friend(self, player_id: str, friend_id: str) -> None:
        """Add a friend relationship."""
        r.sadd(f"friends:{player_id}", friend_id)
        r.sadd(f"friends:{friend_id}", player_id)  # Bidirectional

    def get_friends_leaderboard(self, player_id: str) -> List[Dict]:
        """Get leaderboard among friends (including self)."""
        # Get friend IDs
        friend_ids = r.smembers(f"friends:{player_id}")
        friend_ids.add(player_id)  # Include self

        if not friend_ids:
            return []

        # Get scores for all friends
        pipe = r.pipeline()
        for fid in friend_ids:
            pipe.zscore(self.global_key, fid)

        scores = pipe.execute()

        # Build and sort leaderboard
        friend_scores = []
        for fid, score in zip(friend_ids, scores):
            if score is not None:
                friend_scores.append((fid, score))

        friend_scores.sort(key=lambda x: x[1], reverse=True)

        return [
            {
                "rank": i + 1,
                "player_id": pid,
                "score": score,
                "is_self": pid == player_id
            }
            for i, (pid, score) in enumerate(friend_scores)
        ]

    def get_player_country_rank(self, player_id: str) -> Optional[Dict]:
        """Get player's rank in their country."""
        country = r.hget(f"player:country:{self.game_id}", player_id)

        if not country:
            return None

        country_key = f"leaderboard:{self.game_id}:country:{country}"
        rank = r.zrevrank(country_key, player_id)
        score = r.zscore(country_key, player_id)
        total = r.zcard(country_key)

        return {
            "country": country,
            "rank": rank + 1 if rank is not None else None,
            "score": score,
            "total_players": total
        }


# Usage
fl = FilteredLeaderboard("puzzle_master")

# Submit scores with country
fl.submit_score("player_us_001", 5000, "US")
fl.submit_score("player_us_002", 4500, "US")
fl.submit_score("player_uk_001", 5200, "UK")

# Add friends
fl.add_friend("player_us_001", "player_us_002")
fl.add_friend("player_us_001", "player_uk_001")

# Get country leaderboard
print("US Leaderboard:", fl.get_country_leaderboard("US", 10))

# Get friends leaderboard
print("Friends Leaderboard:", fl.get_friends_leaderboard("player_us_001"))

# Get country rank
print("Country Rank:", fl.get_player_country_rank("player_us_001"))
```

## High-Performance Considerations

### Lua Script for Atomic Score Submission

```python
SUBMIT_SCORE_SCRIPT = """
local leaderboard_key = KEYS[1]
local player_id = ARGV[1]
local new_score = tonumber(ARGV[2])

-- Get current score
local current_score = redis.call('ZSCORE', leaderboard_key, player_id)

-- Only update if new score is higher (or no existing score)
if current_score == false or new_score > tonumber(current_score) then
    redis.call('ZADD', leaderboard_key, new_score, player_id)
    current_score = new_score
else
    current_score = tonumber(current_score)
end

-- Get rank (0-indexed)
local rank = redis.call('ZREVRANK', leaderboard_key, player_id)

return {tostring(current_score), rank}
"""

def atomic_submit_score(leaderboard_key: str, player_id: str,
                        score: float) -> Dict:
    """Submit score atomically with Lua script."""
    script = r.register_script(SUBMIT_SCORE_SCRIPT)
    result = script(keys=[leaderboard_key], args=[player_id, score])

    return {
        "score": float(result[0]),
        "rank": result[1] + 1 if result[1] is not None else None
    }
```

### Batch Score Updates with Pipelining

```python
def batch_update_scores(game_id: str, scores: List[Tuple[str, float]]) -> None:
    """Update multiple scores efficiently using pipelining."""
    key = f"leaderboard:{game_id}"
    pipe = r.pipeline()

    for player_id, score in scores:
        pipe.zadd(key, {player_id: score}, gt=True)

    pipe.execute()

# Usage - update 1000 scores in one round trip
scores = [(f"player_{i}", random.randint(1000, 10000)) for i in range(1000)]
batch_update_scores("tournament", scores)
```

## Conclusion

Redis sorted sets provide an excellent foundation for building real-time gaming leaderboards. Key takeaways:

- Use **ZADD** with GT/LT flags for high-score/low-score tracking
- Use **ZINCRBY** for cumulative score leaderboards
- Implement **time-based leaderboards** with TTL for daily/weekly/monthly rankings
- Use **Pub/Sub** for real-time leaderboard updates
- Create **filtered leaderboards** for countries and friends
- Use **Lua scripts** for atomic operations
- Leverage **pipelining** for batch updates

With these patterns, you can build leaderboard systems that handle millions of players while maintaining sub-millisecond response times.

## Related Resources

- [Redis Sorted Set Commands](https://redis.io/commands/?group=sorted-set)
- [Redis Transactions](https://redis.io/docs/interact/transactions/)
- [Redis Pub/Sub](https://redis.io/docs/interact/pubsub/)
