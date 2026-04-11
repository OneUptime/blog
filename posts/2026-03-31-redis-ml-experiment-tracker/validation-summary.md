# Validation Summary: How to Build an ML Experiment Tracker with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Lists, Sorted Sets, Sets)
- Python 3 (redis-py client library)
- JSON serialization for structured metric storage
- ML experiment tracking concepts (hyperparameters, per-epoch metrics, leaderboards)

## Sources Consulted
- [redis-py official documentation](https://redis.readthedocs.io/en/stable/commands.html) — verified `hset`, `zadd`, `zrange`, `rpush`, `lrange`, `expire`, `sadd`, `hget` method signatures and return types
- [Redis ZADD command documentation](https://redis.io/docs/latest/commands/zadd/) — confirmed LT/GT flags behavior (Redis 6.2+), including that LT does not prevent adding new elements
- [Redis ZRANGE command documentation](https://redis.io/docs/latest/commands/zrange/) — confirmed ascending sort order and WITHSCORES syntax
- [redis-py PyPI page (v4.x)](https://pypi.org/project/redis/) — confirmed `lt=True` keyword argument support in `zadd`

## Issues Found
1. **Leaderboard ZADD missing `lt=True` flag (logic bug)**: The `log_metric` function called `r.zadd()` without the `lt=True` flag on both leaderboard updates. This caused every call to overwrite the leaderboard score with the current epoch's metric value rather than preserving the best value seen across all epochs. In typical training, validation metrics worsen after overfitting begins, so the final epoch's value is often not the best. Fixed by adding `lt=True` to both `zadd` calls — for loss metrics this only updates when a lower (better) loss is seen, and for negated accuracy metrics this only updates when a more negative (higher actual accuracy) value is seen. The `LT` flag still allows initial insertion of new run IDs.

## Review Notes
- The `lt=True` parameter requires redis-py 4.1+ and Redis server 6.2+. This is current and non-deprecated, but readers on older Redis versions would need to handle best-value tracking in application code.
- The `log_metric` function performs 4 Redis round-trips per call (RPUSH, EXPIRE, HGET, ZADD). For high-frequency logging, pipelining or batching would improve throughput, but this is a design consideration rather than a correctness issue.
- The `expire` call on metric keys resets the TTL on every log, so the 30-day window starts from the last metric logged per key, not from run creation. This is reasonable behavior but worth noting.
- The Redis CLI command example at the end (`ZRANGE leaderboard:exp-abc12345:val_loss 0 4 WITHSCORES`) is correct syntax for both Redis 6.2+ and the legacy ZRANGE form.
