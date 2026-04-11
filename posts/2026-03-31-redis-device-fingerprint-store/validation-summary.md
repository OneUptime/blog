# Validation Summary: How to Build a Device Fingerprint Store with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Sorted Sets, Pipelines, TTL/EXPIRE)
- Python (redis-py client library)
- SHA-256 hashing (hashlib)

## Sources Consulted
- Redis HSET documentation: https://redis.io/docs/latest/commands/hset/
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZREMRANGEBYRANK documentation: https://redis.io/docs/latest/commands/zremrangebyrank/
- Redis EXPIRE documentation: https://redis.io/docs/latest/commands/expire/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found

1. **Unused `ip_address` parameter in `compute_fingerprint`**: The function accepted `ip_address` as a parameter but never used it in the fingerprint computation (only `user_agent` and `accept_language` were included in the hash input). Removed the unused parameter from the function signature. Excluding IP from the fingerprint is correct (IPs change frequently), but the parameter should not have been in the signature.

2. **Missing TTL refresh on returning device update**: In `record_device`, when an existing device was seen again (the `if existing:` branch), `last_seen` and `ip` were updated but `pipe.expire(key, DEVICE_TTL)` was never called. This meant the hash key would expire based on the original creation time regardless of continued use — a device used every day could have its record expire on day 91 because the 90-day TTL was only set at first creation and never refreshed. Added `pipe.expire(key, DEVICE_TTL)` to the update pipeline.

## Review Notes
- `zrevrange` used in `get_user_devices` is deprecated in redis-py >= 4.2.0 in favor of `zrange(..., desc=True)`, but it still functions correctly and has not been removed. Not changed since it works as-is.
- The `trust_device` function uses separate `r.hset` and `r.expire` calls rather than a pipeline. This is not incorrect but could be pipelined for atomicity. Left as-is since it works correctly for the tutorial context.
- The sorted set `devices:{userId}` has no TTL set on it. Over time, if all individual device hash keys expire via TTL but the sorted set is never cleaned up, it will contain stale fingerprint hashes pointing to non-existent keys. The `get_user_devices` function handles this gracefully (checks `if data:` after `hgetall`), so this is not a correctness bug, but it is a minor resource leak. Not changed since the post already addresses unbounded growth via `zremrangebyrank`.
