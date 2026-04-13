# How to Implement Leaderboard Pagination with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Leaderboard, Pagination, Sorted Set, API

Description: Implement efficient leaderboard pagination with Redis ZREVRANGE offsets and cursor-based navigation for smooth infinite scroll.

---

Leaderboard APIs need pagination to avoid sending thousands of player records at once. Redis Sorted Sets support offset-based and score-based pagination natively, making both traditional page navigation and infinite scroll easy to implement.

## Offset-Based Pagination

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

LEADERBOARD_KEY = "leaderboard:global"

def get_page(page: int, page_size: int = 20) -> dict:
    start = page * page_size
    end = start + page_size - 1

    entries = r.zrevrange(LEADERBOARD_KEY, start, end, withscores=True)
    total = r.zcard(LEADERBOARD_KEY)

    return {
        "page": page,
        "page_size": page_size,
        "total_players": total,
        "total_pages": -(-total // page_size),  # ceiling division
        "players": [
            {"rank": start + i + 1, "player_id": pid, "score": score}
            for i, (pid, score) in enumerate(entries)
        ],
    }
```

## Score-Based Cursor Pagination

For infinite scroll, use the last score as a cursor:

```python
def get_next_page(after_score: float = None, page_size: int = 20) -> dict:
    if after_score is None:
        # First page - highest scores
        entries = r.zrevrange(LEADERBOARD_KEY, 0, page_size - 1, withscores=True)
    else:
        # Next page - scores strictly below the cursor
        entries = r.zrevrangebyscore(
            LEADERBOARD_KEY,
            f"({after_score}",  # exclusive
            "-inf",
            start=0,
            num=page_size,
            withscores=True
        )

    if not entries:
        return {"players": [], "next_cursor": None}

    last_score = entries[-1][1]
    return {
        "players": [
            {"player_id": pid, "score": score}
            for pid, score in entries
        ],
        "next_cursor": last_score if len(entries) == page_size else None,
    }
```

## Rank-Range Queries

Jump directly to any rank range:

```python
def get_rank_range(start_rank: int, end_rank: int) -> list:
    # Convert 1-indexed to 0-indexed
    start = start_rank - 1
    end = end_rank - 1
    entries = r.zrevrange(LEADERBOARD_KEY, start, end, withscores=True)
    return [
        {"rank": start_rank + i, "player_id": pid, "score": score}
        for i, (pid, score) in enumerate(entries)
    ]
```

## Player's Page Number

Show a player which page they appear on:

```python
def get_player_page(player_id: str, page_size: int = 20) -> int:
    rank = r.zrevrank(LEADERBOARD_KEY, player_id)
    if rank is None:
        return -1
    return rank // page_size
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor leaderboard API response times and ensure pagination queries stay under your latency SLA.

```bash
# Test pagination performance
redis-cli ZREVRANGE leaderboard:global 0 19 WITHSCORES | wc -l
```

## Summary

Redis ZREVRANGE with start/end offsets implements O(log N + M) offset-based pagination. Score-based cursors with exclusive ranges (parenthesis prefix) enable infinite-scroll pagination, though entries with the same score as the cursor will be skipped - use offset-based pagination or a composite cursor (score + member ID) if tied scores are common. Always include total count from ZCARD for rendering page navigation UI.
