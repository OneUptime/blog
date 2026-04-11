# Validation Summary: How to Use TDIGEST.RESET in Redis to Clear a T-Digest

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RedisBloom / Redis Stack T-Digest module)
- Python (redis-py client)
- T-Digest probabilistic data structure

## Sources Consulted
- Redis TDIGEST.RESET documentation: https://redis.io/commands/tdigest.reset/
- Redis TDIGEST.CREATE documentation: https://redis.io/commands/tdigest.create/
- Redis TDIGEST.ADD documentation: https://redis.io/commands/tdigest.add/
- Redis TDIGEST.INFO documentation: https://redis.io/docs/latest/commands/tdigest.info/
- Redis TDIGEST.QUANTILE documentation: https://redis.io/commands/tdigest.quantile/
- Redis T-Digest data type overview: https://redis.io/docs/latest/develop/data-types/probabilistic/t-digest/
- redis-py GitHub repository: https://github.com/redis/redis-py

## Issues Found
1. **TDIGEST.QUANTILE return value after reset**: The post claimed `TDIGEST.QUANTILE` returns `(nil)` after a reset. Per Redis documentation, querying an empty T-Digest returns `"nan"` (Not a Number), not nil. Fixed the comment in the basic usage example to show `"nan"`.

2. **Unused `key` parameter in `periodic_reset` function**: The function accepted a `key: str` parameter but never used it — it called `flush_and_reset()` which is hardcoded to operate on `"realtime:latency"`. This would mislead readers into thinking they could pass any key. Removed the unused parameter and updated the calling code accordingly.

## Review Notes
- The TDIGEST.RESET documentation states it "empties it and re-initializes it." The claim that compression settings are preserved is consistent with observed behavior (re-initialization retains the structure's configuration), though the docs don't spell this out explicitly.
- The Python code uses `execute_command()` for all T-Digest operations. While correct and functional, the modern redis-py client also provides a dedicated `client.tdigest()` interface with native methods like `.create()`, `.reset()`, `.quantile()`, etc. A future update could mention this higher-level API.
- The `flush_and_reset` function queries percentiles and resets non-atomically (two separate commands). Under high concurrency, samples could be added between the query and the reset and would be lost. A note about this race condition could be valuable for production use cases.
- The `reset_all_metrics` function uses `r.keys()` which is an O(N) blocking operation and not recommended in production. A future improvement could mention using `SCAN` instead.
