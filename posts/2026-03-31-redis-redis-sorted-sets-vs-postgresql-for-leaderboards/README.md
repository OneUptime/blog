# Redis Sorted Sets vs PostgreSQL for Leaderboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PostgreSQL, Sorted Set, Leaderboard, Gaming

Description: Compare Redis sorted sets and PostgreSQL for implementing leaderboards, covering real-time ranking, range queries, pagination, and performance trade-offs.

---

## Overview

Leaderboards are a classic use case for Redis sorted sets. The `ZADD`, `ZRANK`, `ZRANGE`, and `ZRANGEBYSCORE` commands provide O(log N) ranking operations. PostgreSQL can also power leaderboards using indexed numeric columns and window functions. This post compares both approaches.

## Redis Sorted Sets for Leaderboards

Sorted sets store member-score pairs with automatic ordering. All ranking operations are O(log N).

```bash
# Add or update player scores
ZADD leaderboard:global 15420 "player:alice"
ZADD leaderboard:global 23100 "player:bob"
ZADD leaderboard:global 9800 "player:charlie"
ZADD leaderboard:global 23100 "player:diana"

# Increment score atomically
ZINCRBY leaderboard:global 500 "player:alice"

# Get top 10 (highest scores first)
ZREVRANGE leaderboard:global 0 9 WITHSCORES

# Get player rank (0-indexed, highest = rank 0)
ZREVRANK leaderboard:global "player:bob"

# Get rank range (0-indexed, returns players ranked 51st-101st)
ZREVRANGE leaderboard:global 50 100 WITHSCORES

# Get players in score range
ZRANGEBYSCORE leaderboard:global 10000 20000 WITHSCORES
```

```python
import redis

r = redis.Redis()

def get_leaderboard_page(page: int = 0, page_size: int = 10) -> list:
    start = page * page_size
    end = start + page_size - 1
    results = r.zrevrange("leaderboard:global", start, end, withscores=True)
    return [
        {"player": member.decode(), "score": int(score), "rank": start + i + 1}
        for i, (member, score) in enumerate(results)
    ]

def get_player_context(player_id: str, radius: int = 5) -> list:
    """Get a player's rank plus surrounding players."""
    rank = r.zrevrank("leaderboard:global", f"player:{player_id}")
    if rank is None:
        return []
    start = max(0, rank - radius)
    end = rank + radius
    results = r.zrevrange("leaderboard:global", start, end, withscores=True)
    return [
        {"player": m.decode(), "score": int(s), "rank": start + i + 1}
        for i, (m, s) in enumerate(results)
    ]
```

## PostgreSQL Leaderboards

PostgreSQL uses an indexed column for scores and window functions for ranking.

```sql
-- Schema
CREATE TABLE player_scores (
    player_id   TEXT PRIMARY KEY,
    username    TEXT NOT NULL,
    score       BIGINT NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_scores_score ON player_scores (score DESC);

-- Insert or update score
INSERT INTO player_scores (player_id, username, score)
VALUES ('player:alice', 'Alice', 15420)
ON CONFLICT (player_id)
DO UPDATE SET score = EXCLUDED.score, updated_at = NOW();

-- Atomic increment
UPDATE player_scores SET score = score + 500, updated_at = NOW()
WHERE player_id = 'player:alice';

-- Top 10 leaderboard
SELECT
    ROW_NUMBER() OVER (ORDER BY score DESC) AS rank,
    username,
    score
FROM player_scores
ORDER BY score DESC
LIMIT 10;
```

```sql
-- Get a player's rank
SELECT rank FROM (
    SELECT
        player_id,
        RANK() OVER (ORDER BY score DESC) AS rank
    FROM player_scores
) ranked
WHERE player_id = 'player:alice';

-- Paginated leaderboard
SELECT
    RANK() OVER (ORDER BY score DESC) AS rank,
    username,
    score
FROM player_scores
ORDER BY score DESC
LIMIT 10 OFFSET 50;  -- Page 6
```

## Performance Comparison

```text
Operation            | Redis Sorted Set | PostgreSQL (indexed)
---------------------|------------------|---------------------
ZADD / UPDATE        | O(log N)         | O(log N) index update
ZREVRANK             | O(log N)         | O(N) window scan*
Top-K query          | O(log N + K)     | O(K) with index
Score range query    | O(log N + M)     | O(log N + M)
Player count         | O(1) ZCARD       | O(1) with count cache
```

*PostgreSQL rank requires a window function that scans all rows unless optimized.

## Time-Windowed Leaderboards

Redis supports multiple leaderboards cheaply:

```python
from datetime import datetime

def add_score(player_id: str, increment: int):
    now = datetime.utcnow()
    pipe = r.pipeline()

    # Update multiple time-window leaderboards atomically
    pipe.zincrby("leaderboard:alltime", increment, player_id)
    pipe.zincrby(f"leaderboard:monthly:{now.year}:{now.month}", increment, player_id)
    pipe.zincrby(f"leaderboard:weekly:{now.isocalendar().year}:{now.isocalendar().week}", increment, player_id)
    pipe.zincrby(f"leaderboard:daily:{now.date()}", increment, player_id)
    pipe.execute()

    # Set expiry on time-windowed boards
    r.expire(f"leaderboard:daily:{now.date()}", 86400 * 2)
    r.expire(f"leaderboard:weekly:{now.isocalendar().year}:{now.isocalendar().week}", 86400 * 14)
```

PostgreSQL equivalent needs a score history table:

```sql
CREATE TABLE score_events (
    player_id  TEXT,
    delta      BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_score_events_time ON score_events (created_at DESC);

-- Weekly leaderboard query
SELECT player_id, SUM(delta) AS weekly_score
FROM score_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY player_id
ORDER BY weekly_score DESC
LIMIT 100;
```

## When to Use Redis Sorted Sets

- Real-time leaderboard updates with sub-millisecond read latency
- Multiple simultaneous time-window leaderboards (daily, weekly, all-time)
- Atomic score increments under high concurrent write load
- Simple leaderboard with no complex relational joins needed

## When to Use PostgreSQL

- Leaderboard data must be joined with user profiles, game records, etc.
- You need complex filtering (by game mode, region, character class)
- Audit trails and historical score data are required
- Your dataset requires ACID transactions across leaderboard and other tables

## Summary

Redis sorted sets provide O(log N) ranking operations with sub-millisecond latency, making them the go-to tool for real-time leaderboards in gaming and competitive applications. PostgreSQL is more capable for complex leaderboards with filtering, joins, and historical analysis, but real-time rank queries require careful index design. Many production systems use Redis for serving the leaderboard and PostgreSQL for persisting canonical scores and historical data.
