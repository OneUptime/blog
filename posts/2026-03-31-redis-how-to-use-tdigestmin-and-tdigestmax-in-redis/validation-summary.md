# Validation Summary: How to Use TDIGEST.MIN and TDIGEST.MAX in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisBloom / Redis Stack T-Digest module)
- T-Digest data structure (TDIGEST.MIN, TDIGEST.MAX, TDIGEST.CREATE, TDIGEST.ADD, TDIGEST.QUANTILE)
- Python (redis-py client library)

## Sources Consulted
- Official Redis documentation for TDIGEST.MIN: https://redis.io/commands/tdigest.min/
- Official Redis documentation for TDIGEST.MAX: https://redis.io/commands/tdigest.max/
- Official Redis documentation for TDIGEST.CREATE: https://redis.io/commands/tdigest.create/
- Official Redis documentation for TDIGEST.ADD: https://redis.io/commands/tdigest.add/
- Official Redis documentation for TDIGEST.QUANTILE: https://redis.io/commands/tdigest.quantile/
- redis-py documentation for T-Digest support

## Issues Found
1. **Empty T-Digest return value (Edge Cases section and Summary):** The post incorrectly stated that `TDIGEST.MIN` and `TDIGEST.MAX` return `(nil)` for an empty T-Digest. According to the official Redis documentation, they return `"nan"` (not-a-number), not nil. Fixed both the Edge Cases code example and the Summary paragraph to say `"nan"` instead of `(nil)`/`nil`.

## Review Notes
- The claim that TDIGEST.MIN and TDIGEST.MAX return "exact" values is confirmed correct by the official Redis docs, which state "Result is always accurate -- no approximation involved."
- The Python examples use `execute_command()` for T-Digest operations. While this works correctly, redis-py provides native T-Digest methods via `r.tdigest().min()`, `r.tdigest().max()`, etc. This is a style preference, not an error.
- TDIGEST.QUANTILE at 0.0 and 1.0 returning the same as MIN/MAX is confirmed correct per official docs -- these boundary quantiles are exact, not approximate.
- The TDIGEST.ADD syntax accepting multiple space-separated values is confirmed correct.
- The TDIGEST.QUANTILE syntax accepting multiple quantile arguments is confirmed correct.
