# Validation Summary: Redis Sorted Sets vs PostgreSQL for Leaderboards

## Status
validated

## Post Type
Tutorial / Comparison Guide

## Technologies Covered
- Redis Sorted Sets (ZADD, ZINCRBY, ZREVRANGE, ZREVRANK, ZRANGEBYSCORE, ZCARD)
- PostgreSQL (window functions, indexes, UPSERT, aggregation)
- Python redis-py client library

## Sources Consulted
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZREVRANGE documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZREVRANK documentation: https://redis.io/docs/latest/commands/zrevrank/
- Redis ZINCRBY documentation: https://redis.io/docs/latest/commands/zincrby/
- Redis ZRANGEBYSCORE documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis ZRANGE documentation (modern replacement): https://redis.io/docs/latest/commands/zrange/
- PostgreSQL Window Functions documentation: https://www.postgresql.org/docs/current/tutorial-window.html
- PostgreSQL CREATE INDEX documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL INSERT ON CONFLICT documentation: https://www.postgresql.org/docs/current/sql-insert.html
- Python redis-py documentation: https://redis-py.readthedocs.io/
- Python datetime.isocalendar() documentation: https://docs.python.org/3/library/datetime.html#datetime.date.isocalendar

## Issues Found

1. **Unused `score` parameter in `add_score` function**: The function signature was `add_score(player_id: str, score: int, increment: int)` but the `score` parameter was never used in the function body — only `increment` was used. Removed the unused parameter to avoid confusion.

2. **Weekly leaderboard key missing year component**: The weekly key was `f"leaderboard:weekly:{now.isocalendar().week}"`, which only included the week number without the year. This meant week 1 of 2025 and week 1 of 2026 would produce the same key. While the 14-day expiry prevents actual data collision in practice, this was inconsistent with the monthly key (which included the year) and could cause subtle bugs if expiry timing changes. Fixed to `f"leaderboard:weekly:{now.isocalendar().year}:{now.isocalendar().week}"`.

3. **Misleading ZREVRANGE rank comment**: The comment `# Get rank range (players ranked 50-100)` was misleading because ZREVRANGE uses 0-based indexing, so indices 50-100 correspond to players ranked 51st through 101st. Updated the comment to clarify the 0-indexing.

## Review Notes
- `ZREVRANGE` and `ZRANGEBYSCORE` have been deprecated since Redis 6.2 (February 2021) in favor of the extended `ZRANGE` command with `REV` and `BYSCORE` options. The deprecated commands still function in current Redis versions, but a future update to the post could migrate to the modern syntax (e.g., `ZRANGE key start stop REV WITHSCORES`).
- Similarly, the redis-py `zrevrange()` method is considered legacy in redis-py 4.0+. The modern equivalent is `zrange()` with `desc=True`.
- `datetime.utcnow()` was deprecated in Python 3.12 (October 2023) in favor of `datetime.now(datetime.timezone.utc)`. The code still works but future readers on modern Python will see deprecation warnings.
- The overview states that ZADD, ZRANK, ZRANGE, and ZRANGEBYSCORE all provide "O(log N) ranking operations." While ZADD and ZRANK are O(log N), ZRANGE and ZRANGEBYSCORE are O(log N + M) where M is the number of returned elements. The performance comparison table later in the post correctly shows the O(log N + K) and O(log N + M) complexities, so this is a minor simplification in the overview only.
- The PostgreSQL queries use both `ROW_NUMBER()` (for the top 10 query) and `RANK()` (for single-player rank and pagination). This is actually reasonable — `ROW_NUMBER()` gives unique sequential positions for display, while `RANK()` correctly handles ties when looking up a specific player's standing — but could confuse readers who expect consistency.
