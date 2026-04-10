# How to Build a Weekly/Monthly Leaderboard with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Leaderboard, Weekly, Monthly, Sorted Set

Description: Build time-scoped weekly and monthly leaderboards in Redis that reset automatically and archive past periods for historical comparison.

---

A global all-time leaderboard rewards only the earliest or most dedicated players. Weekly and monthly leaderboards create fresh competition and give new players a chance to top the charts. Redis TTLs automate resets without cron jobs.

## Keying by Time Period

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_period_key(period: str) -> str:
    now = time.gmtime()
    if period == "weekly":
        # Week number (Monday as first day)
        week = time.strftime("%Y-W%W", now)
        return f"leaderboard:{period}:{week}"
    elif period == "monthly":
        month = time.strftime("%Y-%m", now)
        return f"leaderboard:{period}:{month}"
    elif period == "daily":
        day = time.strftime("%Y-%m-%d", now)
        return f"leaderboard:{period}:{day}"
    return f"leaderboard:{period}"
```

## Recording Scores Across All Periods

```python
def record_score(player_id: str, score_increment: float):
    pipe = r.pipeline()
    for period in ["daily", "weekly", "monthly", "all_time"]:
        key = get_period_key(period)
        pipe.zincrby(key, score_increment, player_id)

    # Set TTL on time-scoped boards
    weekly_key = get_period_key("weekly")
    monthly_key = get_period_key("monthly")
    daily_key = get_period_key("daily")
    pipe.expire(daily_key, 86400 * 3)        # Keep 3 days
    pipe.expire(weekly_key, 86400 * 14)      # Keep 2 weeks
    pipe.expire(monthly_key, 86400 * 60)     # Keep 2 months
    pipe.execute()
```

## Fetching Period Leaderboards

```python
def get_top_players(period: str, n: int = 10) -> list:
    key = get_period_key(period)
    entries = r.zrevrange(key, 0, n - 1, withscores=True)
    return [
        {"rank": i + 1, "player": pid, "score": score}
        for i, (pid, score) in enumerate(entries)
    ]

def get_player_weekly_rank(player_id: str) -> dict:
    key = get_period_key("weekly")
    rank = r.zrevrank(key, player_id)
    score = r.zscore(key, player_id)
    return {
        "player": player_id,
        "weekly_rank": (rank + 1) if rank is not None else None,
        "weekly_score": score,
    }
```

## Archiving Before Expiry

Save the top N before the board resets:

```python
def archive_leaderboard(period: str, top_n: int = 100):
    key = get_period_key(period)
    top = r.zrevrange(key, 0, top_n - 1, withscores=True)

    archive_key = f"archive:{key}"
    pipe = r.pipeline()
    for player, score in top:
        pipe.zadd(archive_key, {player: score})
    pipe.expire(archive_key, 86400 * 365)
    pipe.execute()
    return len(top)
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to alert if your score-recording API goes down mid-week, which would silently corrupt leaderboard fairness.

```bash
redis-cli TTL "leaderboard:weekly:$(date +%Y-W%W)"
```

## Summary

Time-keyed Sorted Sets with automatic TTLs create self-resetting period leaderboards without cron jobs. Writing to all period keys in a single pipeline ensures atomic multi-period updates. Archiving top-N entries before expiry preserves historical winners for hall-of-fame features.
