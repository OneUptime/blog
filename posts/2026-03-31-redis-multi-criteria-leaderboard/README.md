# How to Build a Multi-Criteria Leaderboard with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Leaderboard, Multi-Criteria, Sorted Set, Composite Score

Description: Build a multi-criteria leaderboard in Redis that ranks players on multiple dimensions like kills, assists, and win rate simultaneously.

---

Real games rank players on multiple dimensions - kills, accuracy, wins, playtime. A single sorted set score needs to encode all criteria in a way that produces the correct ranking. There are two main strategies: composite encoding and separate sorted sets with ZUNIONSTORE.

## Strategy 1: Composite Score Encoding

Pack multiple scores into a single float by using positional encoding:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def encode_composite_score(wins: int, kills: int, assists: int) -> float:
    # Wins contribute most, then kills, then assists
    # Assumes wins < 10000, kills < 10000, assists < 10000
    return wins * 100_000_000 + kills * 10_000 + assists

def update_composite_score(player_id: str, wins: int, kills: int, assists: int):
    score = encode_composite_score(wins, kills, assists)
    r.zadd("leaderboard:composite", {player_id: score})

def get_top_players(n: int = 10) -> list:
    entries = r.zrevrange("leaderboard:composite", 0, n - 1, withscores=True)
    results = []
    for i, (pid, raw_score) in enumerate(entries):
        raw = int(raw_score)
        assists = raw % 10_000
        kills = (raw // 10_000) % 10_000
        wins = raw // 100_000_000
        results.append({
            "rank": i + 1, "player": pid,
            "wins": wins, "kills": kills, "assists": assists
        })
    return results
```

## Strategy 2: Weighted Aggregation with ZUNIONSTORE

Maintain separate leaderboards per metric and combine with weights:

```python
def update_metric(player_id: str, metric: str, value: float):
    r.zadd(f"lb:{metric}", {player_id: value})

def build_weighted_leaderboard(dest_key: str, weights: dict):
    """weights = {"lb:wins": 3.0, "lb:kills": 1.0, "lb:assists": 0.5}"""
    keys = list(weights.keys())
    w = [weights[k] for k in keys]
    r.zunionstore(dest_key, dict(zip(keys, w)))
    r.expire(dest_key, 300)

def get_weighted_top(n: int = 10) -> list:
    build_weighted_leaderboard(
        "lb:weighted",
        {"lb:wins": 3.0, "lb:kills": 1.0, "lb:assists": 0.5}
    )
    entries = r.zrevrange("lb:weighted", 0, n - 1, withscores=True)
    return [{"rank": i + 1, "player": pid, "score": s}
            for i, (pid, s) in enumerate(entries)]
```

## Storing Full Stats in a Hash

```python
def update_player_stats(player_id: str, wins: int, kills: int,
                        assists: int, deaths: int):
    r.hset(f"stats:{player_id}", mapping={
        "wins": wins,
        "kills": kills,
        "assists": assists,
        "deaths": deaths,
        "kd_ratio": round(kills / max(deaths, 1), 2),
    })
    update_metric(player_id, "wins", wins)
    update_metric(player_id, "kills", kills)
```

## Monitoring

Track leaderboard rebuild times with [OneUptime](https://oneuptime.com) - ZUNIONSTORE on large sorted sets can be slow and may need optimization or pre-computation.

```bash
redis-cli ZREVRANGE lb:weighted 0 9 WITHSCORES
```

## Summary

Composite score encoding packs multiple metrics into one float for simple cases with bounded value ranges. ZUNIONSTORE with custom weights handles complex multi-metric rankings where you want to tune the influence of each criterion independently. Store full player stats in Hashes alongside leaderboard entries for display without secondary lookups.
